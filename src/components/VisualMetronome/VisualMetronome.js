import { LitElement, html } from 'lit';
import { MetronomeTimer } from './MetronomeTimer.js';

/**
 * VisualMetronome - Standalone metronome component
 * Features:
 * - Visual beat indication with dots
 * - Optional click sound (default off)
 * - BPM control (20-240)
 * - Time signature support (4/4, 8/8)
 * - Full ARIA accessibility
 * - Dark mode support
 * - Settings persistence
 */
export class VisualMetronome extends LitElement {
  static properties = {
    isActive: { type: Boolean },
    bpm: { type: Number },
    timeSignature: { type: String },
    currentBeat: { type: Number },
    isDarkMode: { type: Boolean },
    soundEnabled: { type: Boolean }
  };

  constructor() {
    super();
    this.isActive = false;
    this.bpm = 60;
    this.timeSignature = '4/4';
    this.currentBeat = 0;
    this.isDarkMode = false;
    this.soundEnabled = false; // Default off as requested
    this.timer = null;
    this.bpmIntervalId = null;
    this.audioContext = null;

    this.loadSettings();
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

    // Handle page visibility (pause when tab hidden)
    this.visibilityHandler = () => {
      if (document.hidden && this.timer?.getIsRunning()) {
        this.timer.pause();
      } else if (!document.hidden && this.isActive) {
        this.timer?.resume();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.cleanup();

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeQuery.removeEventListener('change', this.darkModeHandler);
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }

  cleanup() {
    if (this.timer) {
      this.timer.stop();
      this.timer = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.bpmIntervalId) {
      clearInterval(this.bpmIntervalId);
      this.bpmIntervalId = null;
    }
  }

  loadSettings() {
    try {
      const savedBpm = localStorage.getItem('metronome-bpm');
      const savedTimeSignature = localStorage.getItem('metronome-time-signature');
      const savedSoundEnabled = localStorage.getItem('metronome-sound-enabled');

      if (savedBpm) this.bpm = parseInt(savedBpm, 10);
      if (savedTimeSignature) this.timeSignature = savedTimeSignature;
      if (savedSoundEnabled !== null) this.soundEnabled = savedSoundEnabled === 'true';
    } catch (error) {
      console.error('Failed to load metronome settings:', error);
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('metronome-bpm', this.bpm.toString());
      localStorage.setItem('metronome-time-signature', this.timeSignature);
      localStorage.setItem('metronome-sound-enabled', this.soundEnabled.toString());
    } catch (error) {
      console.error('Failed to save metronome settings:', error);
    }
  }

  getBeatsPerMeasure() {
    return this.timeSignature === '4/4' ? 4 : 8;
  }

  /**
   * Play metronome click sound
   * @param {boolean} isDownbeat - True if this is beat 1
   */
  playClick(isDownbeat) {
    if (!this.soundEnabled) return;

    try {
      // Create audio context if needed
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Resume context if suspended (iOS requirement)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;

      // Create oscillator for click sound
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Downbeat is higher pitch and louder
      oscillator.frequency.value = isDownbeat ? 1200 : 800;
      gainNode.gain.value = isDownbeat ? 0.3 : 0.2;

      // Short click sound with envelope
      oscillator.start(now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      oscillator.stop(now + 0.05);

    } catch (error) {
      console.error('Failed to play metronome click:', error);
    }
  }

  handleBeatTick(beat) {
    this.currentBeat = beat;

    // Play click sound
    this.playClick(beat === 1);

    // Flash effect - reset after 100ms
    setTimeout(() => {
      if (this.timer?.getIsRunning()) {
        const currentTimerBeat = this.timer.getCurrentBeat();
        if (currentTimerBeat !== beat) {
          this.currentBeat = currentTimerBeat;
        }
      }
    }, 100);
  }

  toggleMetronome() {
    if (this.isActive) {
      this.timer?.stop();
      this.isActive = false;
      this.currentBeat = 0;
    } else {
      const beatsPerMeasure = this.getBeatsPerMeasure();
      this.timer = new MetronomeTimer(
        this.bpm,
        beatsPerMeasure,
        (beat) => this.handleBeatTick(beat)
      );
      this.timer.start();
      this.isActive = true;
    }
  }

  changeBpm(delta) {
    const newBpm = Math.max(20, Math.min(240, this.bpm + delta));

    if (newBpm !== this.bpm) {
      this.bpm = newBpm;
      this.saveSettings();
      this.timer?.updateBPM(this.bpm);
    }
  }

  handleBpmMouseDown(delta) {
    this.changeBpm(delta);

    let timeout = setTimeout(() => {
      this.bpmIntervalId = setInterval(() => {
        this.changeBpm(delta);
      }, 100);
    }, 500);

    const cleanup = () => {
      clearTimeout(timeout);
      if (this.bpmIntervalId) {
        clearInterval(this.bpmIntervalId);
        this.bpmIntervalId = null;
      }
      document.removeEventListener('mouseup', cleanup);
      document.removeEventListener('touchend', cleanup);
    };

    document.addEventListener('mouseup', cleanup);
    document.addEventListener('touchend', cleanup);
  }

  handleTimeSignatureChange(e) {
    this.timeSignature = e.target.value;
    this.saveSettings();

    if (this.timer) {
      const beatsPerMeasure = this.getBeatsPerMeasure();
      this.timer.updateTimeSignature(beatsPerMeasure);
      this.currentBeat = 1;
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.saveSettings();
  }

  getDotClass(beatNumber) {
    const isActive = this.isActive && this.currentBeat === beatNumber;
    const isDownbeat = beatNumber === 1;

    let classes = 'rounded-full transition-all duration-100 ';

    if (isActive) {
      if (isDownbeat) {
        classes += 'w-5 h-5 ';
        classes += this.isDarkMode ? 'bg-blue-500' : 'bg-blue-700';
      } else {
        classes += 'w-4 h-4 ';
        classes += this.isDarkMode ? 'bg-blue-400' : 'bg-blue-600';
      }
    } else {
      classes += 'w-4 h-4 border-2 ';
      classes += this.isDarkMode ? 'border-gray-600' : 'border-gray-300';
    }

    return classes;
  }

  render() {
    const beatsPerMeasure = this.getBeatsPerMeasure();
    const dots = Array.from({ length: beatsPerMeasure }, (_, i) => i + 1);

    return html`
      <div
        class="w-full ${this.isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} border-b ${this.isDarkMode ? 'border-gray-800' : 'border-gray-200'} py-3"
        role="region"
        aria-label="Visual Metronome"
      >
        <div class="max-w-md mx-auto px-6">
          <div class="flex items-center justify-between gap-4">

            <!-- Dots Display -->
            <div class="flex items-center gap-2" role="status" aria-live="polite">
              ${dots.map(beat => html`
                <div
                  class="${this.getDotClass(beat)}"
                  role="img"
                  aria-label="${beat === this.currentBeat && this.isActive ? `Beat ${beat} active` : `Beat ${beat}`}"
                ></div>
              `)}
            </div>

            <!-- Controls -->
            <div class="flex items-center gap-2">

              <!-- Time Signature Selector -->
              <select
                .value=${this.timeSignature}
                @change=${this.handleTimeSignatureChange}
                class="px-2 py-1 rounded border text-sm ${
                  this.isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Time signature selector"
              >
                <option value="4/4">4/4</option>
                <option value="8/8">8/8</option>
              </select>

              <!-- BPM Controls -->
              <div class="flex items-center gap-1" role="group" aria-label="Tempo controls">
                <button
                  @mousedown=${() => this.handleBpmMouseDown(-1)}
                  @touchstart=${() => this.handleBpmMouseDown(-1)}
                  class="w-8 h-8 rounded ${
                    this.isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  } font-bold transition-colors"
                  aria-label="Decrease tempo by 1 BPM"
                >
                  -
                </button>

                <div
                  class="w-12 text-center ${
                    this.isDarkMode ? 'text-white' : 'text-gray-900'
                  } text-sm font-medium"
                  role="status"
                  aria-label="${this.bpm} beats per minute"
                >
                  ${this.bpm}
                </div>

                <button
                  @mousedown=${() => this.handleBpmMouseDown(1)}
                  @touchstart=${() => this.handleBpmMouseDown(1)}
                  class="w-8 h-8 rounded ${
                    this.isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  } font-bold transition-colors"
                  aria-label="Increase tempo by 1 BPM"
                >
                  +
                </button>
              </div>

              <!-- Sound Toggle -->
              <button
                @click=${this.toggleSound}
                class="w-8 h-8 rounded ${
                  this.soundEnabled
                    ? 'bg-green-600 hover:bg-green-700'
                    : this.isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-200 hover:bg-gray-300'
                } ${this.isDarkMode || this.soundEnabled ? 'text-white' : 'text-gray-900'} transition-colors flex items-center justify-center text-lg"
                aria-label="${this.soundEnabled ? 'Sound enabled, click to disable' : 'Sound disabled, click to enable'}"
                aria-pressed="${this.soundEnabled}"
              >
                ${this.soundEnabled ? '🔊' : '🔇'}
              </button>

              <!-- Play/Pause Button -->
              <button
                @click=${this.toggleMetronome}
                class="w-10 h-8 rounded ${
                  this.isActive
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : this.isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-200 hover:bg-gray-300'
                } text-white transition-colors flex items-center justify-center"
                aria-label="${this.isActive ? 'Pause metronome' : 'Start metronome'}"
                aria-pressed="${this.isActive}"
              >
                ${this.isActive ? '⏸' : '▶'}
              </button>
            </div>

          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('visual-metronome', VisualMetronome);
