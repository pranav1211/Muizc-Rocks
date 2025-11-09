import { LitElement, html } from 'lit';

/**
 * VoiceFeedback - STANDALONE voice monitoring component
 * COMPLETELY INDEPENDENT - No dependencies on other components
 *
 * Features:
 * - Microphone input with permission handling
 * - Live audio monitoring (hear yourself through speakers)
 * - Headphone detection and warning
 * - Accessible UI with proper ARIA labels
 * - Auto-cleanup on disconnect
 *
 * Events:
 * - 'monitoring-change': { isMonitoring: boolean }
 * - 'error': { message: string }
 */
export class VoiceFeedback extends LitElement {
  static properties = {
    isActive: { type: Boolean },
    isMonitoring: { type: Boolean },
    isDarkMode: { type: Boolean },
    errorMessage: { type: String },
    showHeadphoneWarning: { type: Boolean }
  };

  constructor() {
    super();
    this.isActive = false;
    this.isMonitoring = false;
    this.isDarkMode = false;
    this.errorMessage = null;
    this.showHeadphoneWarning = false;

    // Audio processing state - COMPLETELY INDEPENDENT
    this.audioContext = null;
    this.microphone = null;
    this.gainNode = null;
    this.stream = null;
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
      this.requestUpdate();
    };
    darkModeQuery.addEventListener('change', this.darkModeHandler);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.stop();

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeQuery.removeEventListener('change', this.darkModeHandler);
  }

  /**
   * Detect if headphones are connected
   */
  async detectHeadphones() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return false;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');

      // Check for headphone indicators in device labels
      const hasHeadphones = audioOutputs.some(device => {
        const label = device.label.toLowerCase();
        return label.includes('headphone') ||
               label.includes('headset') ||
               label.includes('earphone') ||
               label.includes('airpod') ||
               label.includes('earbud');
      });

      return hasHeadphones;
    } catch (error) {
      console.error('Error detecting headphones:', error);
      return false;
    }
  }

  /**
   * Start voice feedback system
   */
  async start() {
    if (this.isActive) return;

    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          latency: 0,
          sampleRate: 48000
        }
      });

      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 48000
      });

      // Create microphone source
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);

      // Create gain node for monitoring control (starts muted)
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0;

      // Connect audio graph: Microphone -> Gain -> Speakers
      this.microphone.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      this.isActive = true;
      this.errorMessage = null;
      this.requestUpdate();

    } catch (error) {
      console.error('Error starting voice feedback:', error);
      this.errorMessage = 'Could not access microphone. Please grant permission.';
      this.dispatchEvent(new CustomEvent('error', {
        detail: { message: this.errorMessage },
        bubbles: true,
        composed: true
      }));
      this.requestUpdate();
    }
  }

  /**
   * Stop voice feedback and release resources
   */
  stop() {
    this.isActive = false;
    this.isMonitoring = false;

    // Disconnect audio nodes
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    // Stop microphone stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.requestUpdate();
  }

  /**
   * Toggle the entire feedback system on/off
   */
  async toggle() {
    if (this.isActive) {
      this.stop();
    } else {
      await this.start();
    }
  }

  /**
   * Toggle live monitoring (hear yourself)
   */
  async toggleMonitoring() {
    if (!this.isActive) {
      // Need to start the system first
      await this.start();
      if (!this.isActive) return; // Start failed
    }

    if (!this.gainNode || !this.audioContext) return;

    if (this.isMonitoring) {
      // Disable monitoring
      this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      this.isMonitoring = false;
      this.showHeadphoneWarning = false;
    } else {
      // Check for headphones before enabling
      const hasHeadphones = await this.detectHeadphones();

      if (!hasHeadphones) {
        this.showHeadphoneWarning = true;
        setTimeout(() => {
          this.showHeadphoneWarning = false;
          this.requestUpdate();
        }, 5000);
      }

      // Enable monitoring regardless (user knows the risks)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      this.gainNode.gain.setValueAtTime(0.8, this.audioContext.currentTime);
      this.isMonitoring = true;
    }

    // Dispatch event
    this.dispatchEvent(new CustomEvent('monitoring-change', {
      detail: { isMonitoring: this.isMonitoring },
      bubbles: true,
      composed: true
    }));

    this.requestUpdate();
  }

  render() {
    return html`
      <div class="${this.isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 sm:p-8 shadow-lg space-y-6">

        <!-- Header -->
        <div class="text-center">
          <h3 class="${this.isDarkMode ? 'text-green-400' : 'text-green-600'} text-xl sm:text-2xl font-bold uppercase tracking-wide">
            Voice Feedback
          </h3>
          <p class="${this.isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm sm:text-base mt-2">
            Hear yourself through speakers
          </p>
        </div>

        <!-- Monitoring Toggle Button -->
        <div class="flex justify-center">
          <button
            @click=${this.toggleMonitoring}
            class="w-full sm:w-auto min-w-[200px] px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-base sm:text-lg font-bold transition-all shadow-lg hover:shadow-xl ${
              this.isMonitoring
                ? 'bg-green-600 hover:bg-green-700 ring-4 ring-green-400/50 text-white'
                : this.isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
            }"
            aria-label="${this.isMonitoring ? 'Voice feedback enabled. Click to disable' : 'Voice feedback disabled. Click to enable'}"
            aria-pressed="${this.isMonitoring}"
          >
            ${this.isMonitoring ? 'Feedback ON' : 'Feedback OFF'}
          </button>
        </div>

        <!-- Status Indicator -->
        ${this.isMonitoring ? html`
          <div class="flex items-center justify-center gap-3" aria-live="polite">
            <div class="flex gap-2">
              <div class="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div class="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse" style="animation-delay: 0.15s"></div>
              <div class="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse" style="animation-delay: 0.3s"></div>
            </div>
            <span class="${this.isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs sm:text-sm font-medium">
              Live Monitoring Active
            </span>
          </div>
        ` : ''}

        <!-- Headphone Warning -->
        ${this.showHeadphoneWarning ? html`
          <div
            class="p-4 rounded-xl ${this.isDarkMode ? 'bg-yellow-900/30 border-2 border-yellow-700 text-yellow-300' : 'bg-yellow-50 border-2 border-yellow-400 text-yellow-800'} font-medium text-sm"
            role="alert"
            aria-live="assertive"
          >
            Use headphones to prevent audio feedback
          </div>
        ` : ''}

        <!-- Info when monitoring is on -->
        ${this.isMonitoring ? html`
          <div class="text-center">
            <p class="${this.isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs sm:text-sm">
              You can now hear yourself through the speakers.
              <br>
              For best results, use wired headphones.
            </p>
          </div>
        ` : html`
          <div class="text-center">
            <p class="${this.isDarkMode ? 'text-gray-500' : 'text-gray-400'} text-xs sm:text-sm">
              Click the button above to hear your voice in real-time.
            </p>
          </div>
        `}

        <!-- Error Message -->
        ${this.errorMessage ? html`
          <div
            class="p-4 rounded-xl ${this.isDarkMode ? 'bg-red-900/20 border-2 border-red-700 text-red-300' : 'bg-red-50 border-2 border-red-300 text-red-800'} font-medium text-sm"
            role="alert"
            aria-live="assertive"
          >
            ${this.errorMessage}
          </div>
        ` : ''}

      </div>
    `;
  }
}

customElements.define('voice-feedback', VoiceFeedback);
