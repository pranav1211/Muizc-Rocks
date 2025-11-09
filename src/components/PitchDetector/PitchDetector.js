import { LitElement, html } from 'lit';
import { PitchDetector } from './PitchDetectorAlgorithm.js';

/**
 * PitchDetector - STANDALONE pitch detection component
 * COMPLETELY INDEPENDENT - No dependencies on other components
 *
 * Features:
 * - Microphone input with permission handling
 * - Real-time pitch detection using ACF2+ algorithm
 * - Visual frequency display
 * - Accessible UI with proper ARIA labels
 * - Auto-cleanup on disconnect
 *
 * Events:
 * - 'pitch-update': { frequency: number | null }
 * - 'error': { message: string }
 */
export class PitchDetectorComponent extends LitElement {
  static properties = {
    isActive: { type: Boolean },
    currentFrequency: { type: Number },
    isDarkMode: { type: Boolean },
    errorMessage: { type: String }
  };

  constructor() {
    super();
    this.isActive = false;
    this.currentFrequency = null;
    this.isDarkMode = false;
    this.errorMessage = null;

    // Audio processing state - INDEPENDENT
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.pitchDetector = null;
    this.animationFrame = null;
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

      // Connect audio graph: Microphone -> Analyser (NO MONITORING)
      this.microphone.connect(this.analyser);

      // Create pitch detector with the EXACT algorithm
      this.pitchDetector = new PitchDetector(
        this.audioContext,
        this.audioContext.sampleRate
      );

      // Start pitch detection loop
      this.detectPitchLoop();

      this.isActive = true;
      this.errorMessage = null;
      this.requestUpdate();

    } catch (error) {
      console.error('Error starting pitch detector:', error);
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
   * Main pitch detection loop
   */
  detectPitchLoop() {
    const bufferLength = this.analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);

    let lastDetectionTime = 0;
    const detectionInterval = 50; // Detect every 50ms

    const detect = () => {
      if (!this.isActive) return;

      const now = performance.now();

      // Only detect pitch at specified interval
      if (now - lastDetectionTime >= detectionInterval) {
        lastDetectionTime = now;

        // Get time domain data
        this.analyser.getFloatTimeDomainData(dataArray);

        // Detect pitch using the algorithm
        const frequency = this.pitchDetector.detectPitch(dataArray);

        if (frequency && frequency > 0) {
          this.currentFrequency = frequency;
        } else {
          this.currentFrequency = null;
        }

        // Dispatch event for external listeners
        this.dispatchEvent(new CustomEvent('pitch-update', {
          detail: { frequency: this.currentFrequency },
          bubbles: true,
          composed: true
        }));

        // Trigger re-render
        this.requestUpdate();
      }

      // Continue loop
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
    this.currentFrequency = null;
    this.pitchDetector = null;
    this.requestUpdate();
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

  render() {
    return html`
      <div class="${this.isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 sm:p-8 shadow-lg space-y-6">

        <!-- Frequency Display -->
        <div class="text-center">
          ${this.currentFrequency
            ? html`
              <div class="space-y-2">
                <div class="${this.isDarkMode ? 'text-purple-400' : 'text-purple-600'} text-sm font-semibold uppercase tracking-wider" aria-label="Detected frequency label">
                  Detected Pitch
                </div>
                <div class="${this.isDarkMode ? 'text-white' : 'text-gray-900'} font-mono text-5xl sm:text-7xl font-bold tracking-tight" role="status" aria-live="polite" aria-atomic="true">
                  ${this.currentFrequency.toFixed(1)}
                  <span class="text-2xl sm:text-4xl ${this.isDarkMode ? 'text-gray-400' : 'text-gray-500'} ml-2">Hz</span>
                </div>
                <div class="${this.isDarkMode ? 'text-purple-300' : 'text-purple-700'} text-xl sm:text-2xl font-semibold mt-2" aria-label="Musical note">
                  ${this.getNoteFromFrequency(this.currentFrequency)}
                </div>
              </div>
            `
            : html`
              <div class="py-8">
                <div class="${this.isDarkMode ? 'text-gray-500' : 'text-gray-400'} text-lg sm:text-xl" role="status">
                  ${this.isActive ? 'Listening for your voice...' : 'Click Start to begin'}
                </div>
              </div>
            `
          }
        </div>

        <!-- Start/Stop Button -->
        <div class="flex justify-center">
          <button
            @click=${this.toggle}
            class="w-full sm:w-auto min-w-[200px] px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-base sm:text-lg font-bold transition-all shadow-lg hover:shadow-xl ${
              this.isActive
                ? 'bg-red-600 hover:bg-red-700 ring-4 ring-red-400/50'
                : 'bg-purple-600 hover:bg-purple-700 ring-4 ring-purple-400/50'
            } text-white"
            aria-label="${this.isActive ? 'Stop pitch detection' : 'Start pitch detection'}"
            aria-pressed="${this.isActive}"
          >
            ${this.isActive ? 'Stop Detection' : 'Start Detection'}
          </button>
        </div>

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

        <!-- Active Indicator -->
        ${this.isActive ? html`
          <div class="flex items-center justify-center gap-3" aria-live="polite">
            <div class="flex gap-2">
              <div class="w-2 h-2 sm:w-3 sm:h-3 ${this.isDarkMode ? 'bg-purple-500' : 'bg-purple-600'} rounded-full animate-pulse"></div>
              <div class="w-2 h-2 sm:w-3 sm:h-3 ${this.isDarkMode ? 'bg-purple-500' : 'bg-purple-600'} rounded-full animate-pulse" style="animation-delay: 0.15s"></div>
              <div class="w-2 h-2 sm:w-3 sm:h-3 ${this.isDarkMode ? 'bg-purple-500' : 'bg-purple-600'} rounded-full animate-pulse" style="animation-delay: 0.3s"></div>
            </div>
            <span class="${this.isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs sm:text-sm font-medium">
              Microphone Active
            </span>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Convert frequency to nearest note name
   */
  getNoteFromFrequency(frequency) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const a4 = 440;
    const halfSteps = 12 * Math.log2(frequency / a4);
    const noteIndex = Math.round(halfSteps) % 12;
    const octave = Math.floor((Math.round(halfSteps) + 9) / 12) + 4;
    return `${noteNames[(noteIndex + 12) % 12]}${octave}`;
  }
}

customElements.define('pitch-detector', PitchDetectorComponent);
