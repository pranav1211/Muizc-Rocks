import { LitElement, html } from 'lit';
import { noteToFrequency } from './noteUtils.js';

/**
 * NotePlayer - Interactive note selection and playback component
 * Features:
 * - Button layout for all 12 notes in an octave (C to B)
 * - Octave selector dropdown (C2 to C6)
 * - Visual feedback for playing notes
 * - Accessible keyboard navigation
 * - Dark mode support
 * - Emits events for integration with PlaybackModule
 *
 * Events:
 * - 'play-note': { frequency: number, note: string, octave: number }
 * - 'stop-note': {}
 */
export class NotePlayer extends LitElement {
  static properties = {
    selectedOctave: { type: Number },
    playingNote: { type: String },
    isDarkMode: { type: Boolean }
  };

  constructor() {
    super();
    this.selectedOctave = 4; // Default to octave 4 (middle octave)
    this.playingNote = null;
    this.isDarkMode = false;

    // All 12 notes in chromatic scale
    this.notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

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
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeQuery.removeEventListener('change', this.darkModeHandler);
  }

  loadSettings() {
    try {
      const savedOctave = localStorage.getItem('note-player-octave');
      if (savedOctave) {
        this.selectedOctave = parseInt(savedOctave, 10);
      }
    } catch (error) {
      console.error('Failed to load note player settings:', error);
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('note-player-octave', this.selectedOctave.toString());
    } catch (error) {
      console.error('Failed to save note player settings:', error);
    }
  }

  handleOctaveChange(e) {
    this.selectedOctave = parseInt(e.target.value, 10);
    this.saveSettings();
  }

  /**
   * Play a note
   * @param {string} noteName - e.g., 'C', 'C#', 'D'
   */
  playNote(noteName) {
    // Calculate frequency
    const frequency = noteToFrequency(noteName, this.selectedOctave);

    // Update visual state
    this.playingNote = noteName;

    // Dispatch event for external playback handler
    this.dispatchEvent(new CustomEvent('play-note', {
      detail: {
        frequency,
        note: noteName,
        octave: this.selectedOctave,
        fullNote: `${noteName}${this.selectedOctave}`
      },
      bubbles: true,
      composed: true
    }));

    // Auto-clear playing state after 3 seconds
    setTimeout(() => {
      if (this.playingNote === noteName) {
        this.playingNote = null;
      }
    }, 3000);
  }

  stopNote() {
    this.playingNote = null;

    this.dispatchEvent(new CustomEvent('stop-note', {
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Check if note is a black key (sharp)
   * @param {string} noteName
   * @returns {boolean}
   */
  isBlackKey(noteName) {
    return noteName.includes('#');
  }

  /**
   * Get button classes based on note and state
   * @param {string} noteName
   * @returns {string}
   */
  getNoteButtonClass(noteName) {
    const isPlaying = this.playingNote === noteName;
    const isBlack = this.isBlackKey(noteName);

    let classes = 'px-4 py-3 rounded-lg font-medium transition-all duration-150 ';

    if (isPlaying) {
      // Playing state
      classes += 'ring-2 ring-blue-500 ';
      if (isBlack) {
        classes += 'bg-blue-600 text-white scale-95 ';
      } else {
        classes += 'bg-blue-500 text-white scale-95 ';
      }
    } else {
      // Normal state
      if (isBlack) {
        // Black keys (sharps)
        classes += this.isDarkMode
          ? 'bg-gray-700 hover:bg-gray-600 text-white '
          : 'bg-gray-800 hover:bg-gray-700 text-white ';
      } else {
        // White keys (naturals)
        classes += this.isDarkMode
          ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 '
          : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300 ';
      }
    }

    classes += 'active:scale-90 focus:outline-none focus:ring-2 focus:ring-blue-500';

    return classes;
  }

  render() {
    // Generate octave options (C2 to C6)
    const octaves = [2, 3, 4, 5, 6];

    return html`
      <div
        class="w-full ${this.isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} border-b ${this.isDarkMode ? 'border-gray-800' : 'border-gray-200'} py-4"
        role="region"
        aria-label="Note Player"
      >
        <div class="max-w-4xl mx-auto px-6">

          <!-- Header with Octave Selector -->
          <div class="flex items-center justify-between mb-3">
            <h3 class="${this.isDarkMode ? 'text-white' : 'text-gray-900'} text-lg font-semibold">
              Note Player
            </h3>

            <div class="flex items-center gap-2">
              <label
                for="octave-select"
                class="${this.isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-sm font-medium"
              >
                Octave:
              </label>
              <select
                id="octave-select"
                .value=${this.selectedOctave.toString()}
                @change=${this.handleOctaveChange}
                class="px-3 py-1 rounded border ${
                  this.isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Select octave"
              >
                ${octaves.map(octave => html`
                  <option value="${octave}">
                    C${octave} - B${octave}
                  </option>
                `)}
              </select>
            </div>
          </div>

          <!-- Note Buttons Grid -->
          <div
            class="grid grid-cols-6 gap-2"
            role="group"
            aria-label="Note buttons for octave ${this.selectedOctave}"
          >
            ${this.notes.map(noteName => html`
              <button
                @click=${() => this.playNote(noteName)}
                class="${this.getNoteButtonClass(noteName)}"
                aria-label="Play ${noteName}${this.selectedOctave}"
                aria-pressed="${this.playingNote === noteName}"
              >
                <div class="text-center">
                  <div class="text-base font-semibold">${noteName}</div>
                  <div class="text-xs opacity-75">${this.selectedOctave}</div>
                </div>
              </button>
            `)}
          </div>

          <!-- Stop Button -->
          ${this.playingNote ? html`
            <div class="mt-3 text-center">
              <button
                @click=${this.stopNote}
                class="px-6 py-2 rounded ${
                  this.isDarkMode
                    ? 'bg-red-700 hover:bg-red-600'
                    : 'bg-red-600 hover:bg-red-700'
                } text-white font-medium transition-colors"
                aria-label="Stop playing note"
              >
                Stop
              </button>
            </div>
          ` : ''}

          <!-- Instructions -->
          <div class="mt-3 ${this.isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs text-center">
            Click any note to play. The octave selector changes which octave of notes you're playing.
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('note-player', NotePlayer);
