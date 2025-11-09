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
    const detectionInterval = 50; // Detect every 50ms for better responsiveness

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

        // Trigger re-render only when frequency changes significantly
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
      <div class="space-y-4 sm:space-y-6">

        <!-- Pitch Detector Card -->
        <div class="w-full p-6 sm:p-8">
          <!-- Frequency Display -->
          <div class="text-center mb-6">
            ${this.currentFrequency
              ? html`
                <div class="space-y-2">
                  <div class="${this.isDarkMode ? 'text-purple-400' : 'text-purple-600'} text-sm font-semibold uppercase tracking-wider" aria-label="Detected frequency label">
                    Detected Pitch
                  </div>
                  <div class="${this.isDarkMode ? 'text-white' : 'text-gray-900'} font-mono text-6xl sm:text-7xl font-bold tracking-tight" role="status" aria-live="polite" aria-atomic="true">
                    ${this.currentFrequency.toFixed(1)}
                    <span class="text-3xl sm:text-4xl ${this.isDarkMode ? 'text-gray-400' : 'text-gray-500'} ml-2">Hz</span>
                  </div>
                  <div class="${this.isDarkMode ? 'text-purple-300' : 'text-purple-700'} text-2xl font-semibold mt-2" aria-label="Musical note">
                    ${this.getNoteFromFrequency(this.currentFrequency)}
                  </div>
                </div>
              `
              : html`
                <div class="py-8">
                  <div class="${this.isDarkMode ? 'text-gray-500' : 'text-gray-400'} text-xl" role="status">
                    ${this.isActive ? '🎤 Listening for your voice...' : '🎵 Click Start to begin'}
                  </div>
                </div>
              `
            }
          </div>

          <!-- Start/Stop Button -->
          <div class="flex justify-center mb-4">
            <button
              @click=${this.toggle}
              class="w-full sm:w-auto min-w-[200px] px-8 py-4 rounded-2xl text-lg font-bold transition-all shadow-xl hover:shadow-2xl ${
                this.isActive
                  ? 'bg-red-600 hover:bg-red-700 ring-4 ring-red-400/50'
                  : 'bg-purple-600 hover:bg-purple-700 ring-4 ring-purple-400/50'
              } text-white"
              aria-label="${this.isActive ? 'Stop pitch detection' : 'Start pitch detection'}"
              aria-pressed="${this.isActive}"
            >
              ${this.isActive ? '⏹ Stop Detection' : '▶ Start Detection'}
            </button>
          </div>

          <!-- Error Message -->
          ${this.errorMessage ? html`
            <div
              class="p-4 rounded-xl ${this.isDarkMode ? 'bg-red-900/20 border-2 border-red-700 text-red-300' : 'bg-red-50 border-2 border-red-300 text-red-800'} font-medium"
              role="alert"
              aria-live="assertive"
            >
              ⚠️ ${this.errorMessage}
            </div>
          ` : ''}

          <!-- Active Indicator -->
          ${this.isActive ? html`
            <div class="mt-4 flex items-center justify-center gap-3" aria-live="polite">
              <div class="flex gap-2">
                <div class="w-3 h-3 ${this.isDarkMode ? 'bg-purple-500' : 'bg-purple-600'} rounded-full animate-pulse"></div>
                <div class="w-3 h-3 ${this.isDarkMode ? 'bg-purple-500' : 'bg-purple-600'} rounded-full animate-pulse" style="animation-delay: 0.15s"></div>
                <div class="w-3 h-3 ${this.isDarkMode ? 'bg-purple-500' : 'bg-purple-600'} rounded-full animate-pulse" style="animation-delay: 0.3s"></div>
              </div>
              <span class="${this.isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm font-medium">
                Microphone Active
              </span>
            </div>
          ` : ''}
        </div>

        <!-- Voice Feedback Card (Separate) -->
        ${this.isActive ? html`
          <div class="w-full p-6 sm:p-8 ${this.isDarkMode ? 'bg-gray-800/50 border-2 border-gray-700' : 'bg-gray-50 border-2 border-gray-200'} rounded-2xl">
            <div class="text-center mb-4">
              <h3 class="${this.isDarkMode ? 'text-green-400' : 'text-green-600'} text-lg font-bold uppercase tracking-wide">
                🎧 Voice Feedback
              </h3>
              <p class="${this.isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm mt-1">
                Hear yourself through speakers
              </p>
            </div>

            <div class="flex justify-center">
              <button
                @click=${this.toggleMonitoring}
                class="w-full sm:w-auto min-w-[200px] px-8 py-4 rounded-2xl text-lg font-bold transition-all shadow-lg hover:shadow-xl ${
                  this.isMonitoring
                    ? 'bg-green-600 hover:bg-green-700 ring-4 ring-green-400/50'
                    : this.isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                } ${this.isMonitoring ? 'text-white' : ''}"
                aria-label="${this.isMonitoring ? 'Voice feedback enabled. Click to disable' : 'Voice feedback disabled. Click to enable'}"
                aria-pressed="${this.isMonitoring}"
              >
                ${this.isMonitoring ? '🔊 Feedback ON' : '🔇 Feedback OFF'}
              </button>
            </div>

            ${this.isMonitoring ? html`
              <div class="mt-4 text-center">
                <p class="${this.isDarkMode ? 'text-yellow-400' : 'text-yellow-700'} text-sm font-medium">
                  ⚠️ Use headphones to prevent audio feedback
                </p>
              </div>
            ` : ''}
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

customElements.define('pitch-detector', PitchDetector);
