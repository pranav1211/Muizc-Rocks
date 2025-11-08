import { LitElement, html, css } from 'lit';
import { AudioProcessor } from '../audio/audio-processor.js';
import { ReferencePlayer } from '../audio/reference-player.js';
import { frequencyToNote, generateReferenceNotes, parseNoteString, noteToFrequency } from '../utils/note-converter.js';
import { detectHeadphones } from '../utils/headphone-detector.js';
import './visual-metronome.js';

export class VoiceMonitor extends LitElement {
  static properties = {
    sessionActive: { type: Boolean },
    monitoringEnabled: { type: Boolean },
    currentNote: { type: String },
    centsOff: { type: Number },
    showHeadphoneWarning: { type: Boolean },
    selectedReferenceNote: { type: String },
    isPlayingReference: { type: Boolean },
    isDarkMode: { type: Boolean }
  };

  constructor() {
    super();
    this.sessionActive = false;
    this.monitoringEnabled = false;
    this.currentNote = '--';
    this.centsOff = 0;
    this.showHeadphoneWarning = false;
    this.selectedReferenceNote = 'A4';
    this.isPlayingReference = false;
    this.isDarkMode = false;
    
    this.audioProcessor = null;
    this.referencePlayer = null;
    this.wakeLock = null;
    this.referenceNotes = generateReferenceNotes();
  }

  // Disable shadow DOM to use Tailwind
  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Detect dark mode preference
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.isDarkMode = darkModeQuery.matches;
    this.updateDarkMode();
    
    // Listen for dark mode changes
    this.darkModeHandler = (e) => {
      this.isDarkMode = e.matches;
      this.updateDarkMode();
    };
    darkModeQuery.addEventListener('change', this.darkModeHandler);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Cleanup
    if (this.audioProcessor) {
      this.audioProcessor.stop();
    }
    if (this.referencePlayer) {
      this.referencePlayer.stop();
    }
    this.releaseWakeLock();
    
    // Remove event listener
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeQuery.removeEventListener('change', this.darkModeHandler);
  }

  updateDarkMode() {
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('Wake lock activated');
      }
    } catch (error) {
      console.error('Wake lock error:', error);
    }
  }

  async releaseWakeLock() {
    if (this.wakeLock) {
      await this.wakeLock.release();
      this.wakeLock = null;
      console.log('Wake lock released');
    }
  }

  handlePitchUpdate(frequency) {
    if (frequency) {
      const noteData = frequencyToNote(frequency);
      if (noteData) {
        this.currentNote = noteData.note;
        this.centsOff = noteData.cents;
      }
    } else {
      this.currentNote = '--';
      this.centsOff = 0;
    }
  }

  async startSession() {
    console.log('Starting session...');
    this.audioProcessor = new AudioProcessor((freq) => this.handlePitchUpdate(freq));
    const success = await this.audioProcessor.start();
    
    if (success) {
      this.sessionActive = true;
      await this.requestWakeLock();
      console.log('Session started successfully');
    } else {
      alert('Could not access microphone. Please grant permission and try again.');
    }
  }

  stopSession() {
    console.log('Stopping session...');
    if (this.audioProcessor) {
      this.audioProcessor.stop();
      this.audioProcessor = null;
    }
    
    this.sessionActive = false;
    this.monitoringEnabled = false;
    this.currentNote = '--';
    this.centsOff = 0;
    this.releaseWakeLock();
  }

  async toggleMonitoring() {
    if (!this.monitoringEnabled) {
      // Trying to enable monitoring - check for headphones
      const hasHeadphones = await detectHeadphones();
      
      if (!hasHeadphones) {
        // Show warning but still allow monitoring
        this.showHeadphoneWarning = true;
        setTimeout(() => {
          this.showHeadphoneWarning = false;
        }, 4000);
      }
      
      // Enable monitoring regardless (user knows the risks)
      this.audioProcessor?.enableMonitoring();
      this.monitoringEnabled = true;
    } else {
      // Disable monitoring
      this.audioProcessor?.disableMonitoring();
      this.monitoringEnabled = false;
    }
  }

  playReference() {
    if (this.isPlayingReference) return;
    
    const { noteName, octave } = parseNoteString(this.selectedReferenceNote);
    const frequency = noteToFrequency(noteName, octave);
    
    if (!this.referencePlayer) {
      this.referencePlayer = new ReferencePlayer();
    }
    
    this.referencePlayer.playTone(frequency, 3000);
    this.isPlayingReference = true;
    
    setTimeout(() => {
      this.isPlayingReference = false;
    }, 3000);
  }

  getTunerBarStyle() {
    const clampedCents = Math.max(-50, Math.min(50, this.centsOff));
    const percentage = ((clampedCents + 50) / 100) * 100;
    
    let color;
    if (Math.abs(clampedCents) <= 10) {
      color = '#10b981'; // Green
    } else {
      color = '#fbbf24'; // Yellow
    }
    
    return `width: ${percentage}%; background-color: ${color}; transition: all 0.2s ease-out;`;
  }

  render() {
    return html`
      <!-- Visual Metronome -->
      <visual-metronome></visual-metronome>
      
      <!-- Main App -->
      <div class="min-h-screen ${this.isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200 pb-6">
        <div class="max-w-2xl mx-auto p-4 space-y-4">
          
          <!-- Header -->
          <div class="text-center pt-6 pb-2">
            <h1 class="${this.isDarkMode ? 'text-white' : 'text-gray-900'} text-2xl font-bold">
              Voice Monitor
            </h1>
            <p class="${this.isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs mt-1">
              Real-time Pitch Trainer
            </p>
          </div>

          ${!this.sessionActive ? this.renderReadyState() : this.renderActiveSession()}

          <!-- Footer -->
          <div class="text-center text-xs ${this.isDarkMode ? 'text-gray-500' : 'text-gray-500'} pt-2">
            Use wired headphones for best results
          </div>
        </div>
      </div>
    `;
  }

  renderReadyState() {
    return html`
      <!-- Ready Card -->
      <div class="rounded-xl shadow-md p-6 ${this.isDarkMode ? 'bg-gray-800' : 'bg-white'} text-center">
        <div class="${this.isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-base mb-4">
          Ready to start practicing
        </div>
        <button
          @click=${this.startSession}
          class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 text-sm"
        >
          START SESSION
        </button>
      </div>
    `;
  }

  renderActiveSession() {
    return html`
      <!-- Session Status Card -->
      <div class="rounded-xl shadow-md p-4 ${this.isDarkMode ? 'bg-gray-800' : 'bg-white'}">
        <div class="flex items-center justify-center gap-2">
          <div class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span class="${this.isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold text-sm">
            SESSION ACTIVE
          </span>
          ${this.monitoringEnabled ? html`
            <span class="${this.isDarkMode ? 'text-green-400' : 'text-green-600'} ml-2 text-xs">
              🎧 Monitoring ON
            </span>
          ` : ''}
        </div>

        <!-- Headphone Warning -->
        ${this.showHeadphoneWarning ? html`
          <div class="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-600 rounded-lg p-2 text-center mt-3">
            <p class="text-yellow-800 dark:text-yellow-200 text-xs font-medium">
              ⚠️ For best results, use wired headphones
            </p>
          </div>
        ` : ''}
      </div>

      <!-- Pitch Display Card -->
      <div class="rounded-xl shadow-md p-6 ${this.isDarkMode ? 'bg-gray-800' : 'bg-white'}">
        <div class="text-center mb-4">
          <div class="${this.isDarkMode ? 'text-white' : 'text-gray-900'} text-6xl font-bold">
            ${this.currentNote}
          </div>
        </div>

        <!-- Tuner Bar -->
        <div class="space-y-2">
          <div class="${this.isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} h-10 rounded-lg overflow-hidden relative">
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="${this.isDarkMode ? 'bg-gray-500' : 'bg-gray-400'} w-0.5 h-full"></div>
            </div>
            <div class="h-full" style="${this.getTunerBarStyle()}"></div>
          </div>
          <div class="flex justify-between text-xs ${this.isDarkMode ? 'text-gray-400' : 'text-gray-600'}">
            <span>flat</span>
            <span>in tune</span>
            <span>sharp</span>
          </div>
        </div>
      </div>

      <!-- Live Audio Card -->
      <div class="rounded-xl shadow-md p-4 ${this.isDarkMode ? 'bg-gray-800' : 'bg-white'}">
        <div class="flex items-center justify-between">
          <span class="${this.isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-medium text-sm">
            Live Audio:
          </span>
          <button
            @click=${this.toggleMonitoring}
            class="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              this.monitoringEnabled
                ? 'bg-green-600 text-white'
                : this.isDarkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }"
          >
            ${this.monitoringEnabled ? '🔊' : '🔇'}
            ${this.monitoringEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <!-- Reference Player Card -->
      <div class="rounded-xl shadow-md p-4 ${this.isDarkMode ? 'bg-gray-800' : 'bg-white'}">
        <label class="${this.isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium mb-2">
          Reference Note:
        </label>
        <div class="flex gap-2">
          <select
            .value=${this.selectedReferenceNote}
            @change=${(e) => { this.selectedReferenceNote = e.target.value; }}
            class="flex-1 px-3 py-2 rounded-lg border text-sm ${
              this.isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            ${this.referenceNotes.map(note => html`
              <option value="${note}">${note}</option>
            `)}
          </select>
          <button
            @click=${this.playReference}
            ?disabled=${this.isPlayingReference}
            class="px-5 py-2 rounded-lg font-medium transition-colors text-sm ${
              this.isPlayingReference
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }"
          >
            ${this.isPlayingReference ? '⏹' : '▶'}
          </button>
        </div>
      </div>

      <!-- Stop Button Card -->
      <div class="rounded-xl shadow-md p-4 ${this.isDarkMode ? 'bg-gray-800' : 'bg-white'} text-center">
        <button
          @click=${this.stopSession}
          class="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors duration-200 text-sm"
        >
          STOP SESSION
        </button>
      </div>
    `;
  }
}

customElements.define('voice-monitor', VoiceMonitor);