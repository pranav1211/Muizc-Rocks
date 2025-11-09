import { LitElement, html } from 'lit';
import { PitchDetectorAlgorithm } from './PitchDetectorAlgorithm.js';

/**
 * PitchDetector - Standalone pitch detection component
 * Features:
 * - Microphone input with permission handling
 * - Real-time pitch detection using ACF2+ algorithm
 * - Optional live monitoring (hear yourself)
 * - Visual frequency display
 * - Accessible UI with proper ARIA labels
 * - Auto-cleanup on disconnect
 *
 * Events:
 * - 'pitch-update': { frequency: number | null }
 * - 'error': { message: string }
 */
export class PitchDetector extends LitElement {
  static properties = {
    isActive: { type: Boolean },
    isMonitoring: { type: Boolean },
    currentFrequency: { type: Number },
    isDarkMode: { type: Boolean },
    errorMessage: { type: String }
  };

  constructor() {
    super();
    this.isActive = false;
    this.isMonitoring = false;
    this.currentFrequency = null;
    this.isDarkMode = false;
    this.errorMessage = null;

    // Audio processing state
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.gainNode = null;
    this.pitchDetector = null;
    this.animationFrame = null;
    this.stream = null;
    this.smoothedFrequency = null;
    this.smoothingFactor = 0.3;
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

    this.stop();

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeQuery.removeEventListener('change', this.darkModeHandler);
  }

  /**
   * Start pitch detection
   */
  async start() {
    if (this.isActive) return;

    try {
      // Request microphone access with optimal settings for pitch detection
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          latency: 0,
          sampleRate: 48000
        }
      });

      // Create audio context with low latency
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 48000
      });

      // Create analyser for pitch detection
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.3;

      // Create microphone source
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);

      // Create gain node for monitoring (starts muted)
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0;

      // Connect audio graph: Microphone -> Analyser & Gain -> Speakers
      this.microphone.connect(this.analyser);
      this.microphone.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      // Create pitch detector with the EXACT algorithm (no modifications)
      this.pitchDetector = new PitchDetectorAlgorithm(
        this.audioContext,
        this.audioContext.sampleRate
      );

      // Start pitch detection loop
      this.detectPitchLoop();

      this.isActive = true;
      this.errorMessage = null;

    } catch (error) {
      console.error('Error starting pitch detector:', error);
      this.errorMessage = 'Could not access microphone. Please grant permission.';
      this.dispatchEvent(new CustomEvent('error', {
        detail: { message: this.errorMessage },
        bubbles: true,
        composed: true
      }));
    }
  }

  /**
   * Main pitch detection loop - optimized for performance
   */
  detectPitchLoop() {
    const bufferLength = this.analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);

    let lastDetectionTime = 0;
    const detectionInterval = 100; // Detect every 100ms (reduces CPU usage)

    const detect = () => {
      if (!this.isActive) return;

      const now = Date.now();

      // Only detect pitch at specified interval
      if (now - lastDetectionTime >= detectionInterval) {
        lastDetectionTime = now;

        // Get time domain data
        this.analyser.getFloatTimeDomainData(dataArray);

        // Detect pitch using the original algorithm
        const frequency = this.pitchDetector.detectPitch(dataArray);

        if (frequency) {
          // Apply exponential smoothing
          if (this.smoothedFrequency === null) {
            this.smoothedFrequency = frequency;
          } else {
            this.smoothedFrequency =
              this.smoothedFrequency * (1 - this.smoothingFactor) +
              frequency * this.smoothingFactor;
          }

          this.currentFrequency = this.smoothedFrequency;
        } else {
          this.currentFrequency = null;
          this.smoothedFrequency = null;
        }

        // Dispatch event for external listeners
        this.dispatchEvent(new CustomEvent('pitch-update', {
          detail: { frequency: this.currentFrequency },
          bubbles: true,
          composed: true
        }));
      }

      // Continue loop at 60fps but only process at detectionInterval
      this.animationFrame = requestAnimationFrame(detect);
    };

    detect();
  }

  /**
   * Stop pitch detection and release resources
   */
  stop() {
    this.isActive = false;

    // Stop animation loop
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    // Disconnect audio nodes
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    if (this.analyser) {
      this.analyser = null;
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

    // Reset state
    this.smoothedFrequency = null;
    this.currentFrequency = null;
    this.isMonitoring = false;
    this.pitchDetector = null;
  }

  /**
   * Toggle pitch detection on/off
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
  toggleMonitoring() {
    if (!this.gainNode || !this.audioContext) return;

    if (this.isMonitoring) {
      // Disable monitoring
      this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      this.isMonitoring = false;
    } else {
      // Enable monitoring
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      this.gainNode.gain.setValueAtTime(0.8, this.audioContext.currentTime);
      this.isMonitoring = true;
    }
  }

  render() {
    return html`
      <div
        class="w-full ${this.isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} border-b ${this.isDarkMode ? 'border-gray-800' : 'border-gray-200'} py-3"
        role="region"
        aria-label="Pitch Detector"
      >
        <div class="max-w-md mx-auto px-6">
          <div class="flex items-center justify-between gap-4">

            <!-- Frequency Display -->
            <div class="flex-1">
              ${this.currentFrequency
                ? html`
                  <div class="${this.isDarkMode ? 'text-white' : 'text-gray-900'} font-mono text-lg">
                    <span role="status" aria-live="polite">
                      ${this.currentFrequency.toFixed(2)} Hz
                    </span>
                  </div>
                `
                : html`
                  <div class="${this.isDarkMode ? 'text-gray-500' : 'text-gray-400'} text-sm">
                    ${this.isActive ? 'Listening...' : 'Not active'}
                  </div>
                `
              }
            </div>

            <!-- Controls -->
            <div class="flex items-center gap-2">

              <!-- Monitoring Toggle (only show when active) -->
              ${this.isActive ? html`
                <button
                  @click=${this.toggleMonitoring}
                  class="w-8 h-8 rounded ${
                    this.isMonitoring
                      ? 'bg-green-600 hover:bg-green-700'
                      : this.isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-200 hover:bg-gray-300'
                  } ${this.isDarkMode || this.isMonitoring ? 'text-white' : 'text-gray-900'} transition-colors flex items-center justify-center text-sm"
                  aria-label="${this.isMonitoring ? 'Monitoring enabled, click to disable' : 'Monitoring disabled, click to enable'}"
                  aria-pressed="${this.isMonitoring}"
                  title="${this.isMonitoring ? 'Disable monitoring (you won\'t hear yourself)' : 'Enable monitoring (hear yourself through speakers)'}"
                >
                  🎧
                </button>
              ` : ''}

              <!-- Start/Stop Button -->
              <button
                @click=${this.toggle}
                class="px-4 py-2 rounded ${
                  this.isActive
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white transition-colors font-medium"
                aria-label="${this.isActive ? 'Stop pitch detection' : 'Start pitch detection'}"
              >
                ${this.isActive ? 'Stop' : 'Start'}
              </button>
            </div>

          </div>

          <!-- Error Message -->
          ${this.errorMessage ? html`
            <div
              class="mt-2 text-sm ${this.isDarkMode ? 'text-red-400' : 'text-red-600'}"
              role="alert"
            >
              ${this.errorMessage}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}

customElements.define('pitch-detector', PitchDetector);
