import { LitElement, html } from 'lit';

/**
 * PlaybackModule - Optimized audio playback component
 * Features:
 * - Low-latency tone playback
 * - Reuses AudioContext to reduce lag
 * - Smooth fade in/out to prevent clicks
 * - Volume control
 * - Visual playback indicator
 * - Accessible controls
 *
 * Performance optimizations:
 * - Single persistent AudioContext (no recreation overhead)
 * - Scheduled playback using AudioContext time
 * - Minimal node creation/destruction
 */
export class PlaybackModule extends LitElement {
  static properties = {
    isPlaying: { type: Boolean },
    volume: { type: Number },
    isDarkMode: { type: Boolean }
  };

  constructor() {
    super();
    this.isPlaying = false;
    this.volume = 0.3; // 30% default volume
    this.isDarkMode = false;

    // Persistent audio context for reduced lag
    this.audioContext = null;
    this.currentOscillator = null;
    this.currentGainNode = null;
    this.stopTimeout = null;

    // Initialize audio context immediately (lazy loading causes lag)
    this.initAudioContext();
  }

  // Disable shadow DOM to use Tailwind
  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();

    // Detect dark mode
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.isDarkMode = darkModeQuery.matches;

    this.darkModeHandler = (e) => {
      this.isDarkMode = e.matches;
    };
    darkModeQuery.addEventListener('change', this.darkModeHandler);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.cleanup();

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeQuery.removeEventListener('change', this.darkModeHandler);
  }

  /**
   * Initialize audio context once (reduces lag on first play)
   */
  initAudioContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'interactive', // Prioritize low latency
        sampleRate: 48000
      });
    }
  }

  /**
   * Play a tone with optimized low-latency playback
   * @param {number} frequency - Frequency in Hz
   * @param {number} duration - Duration in milliseconds (default 3000)
   */
  async playTone(frequency, duration = 3000) {
    // Stop any currently playing tone
    this.stop();

    // Ensure audio context is ready
    this.initAudioContext();

    // Resume if suspended (required for iOS and some browsers)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    try {
      const now = this.audioContext.currentTime;
      const fadeDuration = 0.02; // 20ms fade to prevent clicks
      const playDuration = duration / 1000; // Convert to seconds

      // Create oscillator
      this.currentOscillator = this.audioContext.createOscillator();
      this.currentOscillator.type = 'sine';
      this.currentOscillator.frequency.value = frequency;

      // Create gain node for volume control and fade
      this.currentGainNode = this.audioContext.createGain();
      this.currentGainNode.gain.value = 0; // Start silent

      // Connect: oscillator -> gain -> speakers
      this.currentOscillator.connect(this.currentGainNode);
      this.currentGainNode.connect(this.audioContext.destination);

      // Schedule playback with precise timing
      this.currentOscillator.start(now);

      // Fade in
      this.currentGainNode.gain.linearRampToValueAtTime(
        this.volume,
        now + fadeDuration
      );

      // Fade out before stopping
      this.currentGainNode.gain.linearRampToValueAtTime(
        this.volume,
        now + playDuration - fadeDuration
      );
      this.currentGainNode.gain.linearRampToValueAtTime(
        0,
        now + playDuration
      );

      // Schedule stop
      this.currentOscillator.stop(now + playDuration);

      this.isPlaying = true;

      // Cleanup after playback completes
      this.stopTimeout = setTimeout(() => {
        this.stop();
      }, duration + 100); // Add small buffer

      // Dispatch event for external listeners
      this.dispatchEvent(new CustomEvent('playback-start', {
        detail: { frequency, duration },
        bubbles: true,
        composed: true
      }));

    } catch (error) {
      console.error('Playback error:', error);
      this.stop();
    }
  }

  /**
   * Stop playback immediately
   */
  stop() {
    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }

    if (this.currentOscillator) {
      try {
        this.currentOscillator.stop();
        this.currentOscillator.disconnect();
      } catch (e) {
        // Already stopped or disconnected
      }
      this.currentOscillator = null;
    }

    if (this.currentGainNode) {
      this.currentGainNode.disconnect();
      this.currentGainNode = null;
    }

    if (this.isPlaying) {
      this.isPlaying = false;

      // Dispatch event
      this.dispatchEvent(new CustomEvent('playback-stop', {
        bubbles: true,
        composed: true
      }));
    }
  }

  /**
   * Cleanup all resources
   */
  cleanup() {
    this.stop();

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Set volume (0.0 to 1.0)
   * @param {number} newVolume
   */
  setVolume(newVolume) {
    this.volume = Math.max(0, Math.min(1, newVolume));

    // Update current playback if active
    if (this.currentGainNode && this.isPlaying) {
      const now = this.audioContext.currentTime;
      this.currentGainNode.gain.linearRampToValueAtTime(
        this.volume,
        now + 0.05
      );
    }
  }

  render() {
    // This component is meant to be used programmatically
    // But we can provide a simple visual indicator
    return html`
      <div
        class="hidden"
        role="status"
        aria-live="polite"
        aria-label="${this.isPlaying ? 'Playing tone' : 'Playback idle'}"
      >
        ${this.isPlaying ? 'Playing' : 'Idle'}
      </div>
    `;
  }
}

customElements.define('playback-module', PlaybackModule);
