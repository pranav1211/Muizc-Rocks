import { LitElement, html } from 'lit';

/**
 * MuzicApp - Main application component
 * Integrates all modular components:
 * - VisualMetronome
 * - PitchDetector
 * - PlaybackModule
 * - NotePlayer
 *
 * This component acts as a coordinator but keeps components independent
 */
export class MuzicApp extends LitElement {
  static properties = {
    isDarkMode: { type: Boolean }
  };

  constructor() {
    super();
    this.isDarkMode = false;
    this.playbackModule = null;
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
      document.documentElement.classList.toggle('dark', e.matches);
    };
    darkModeQuery.addEventListener('change', this.darkModeHandler);

    // Set initial dark mode class
    document.documentElement.classList.toggle('dark', this.isDarkMode);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeQuery.removeEventListener('change', this.darkModeHandler);
  }

  firstUpdated() {
    // Get reference to playback module for note player integration
    this.playbackModule = this.querySelector('playback-module');

    // Listen for note player events and connect to playback module
    const notePlayer = this.querySelector('note-player');
    if (notePlayer && this.playbackModule) {
      notePlayer.addEventListener('play-note', (e) => {
        this.playbackModule.playTone(e.detail.frequency, 3000);
      });

      notePlayer.addEventListener('stop-note', () => {
        this.playbackModule.stop();
      });
    }
  }

  render() {
    return html`
      <div class="min-h-screen ${this.isDarkMode ? 'bg-gray-900' : 'bg-white'}">

        <!-- Header -->
        <header class="border-b ${this.isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'} py-4">
          <div class="max-w-4xl mx-auto px-6">
            <h1 class="${this.isDarkMode ? 'text-white' : 'text-gray-900'} text-2xl font-bold">
              Muzic Rocks
            </h1>
            <p class="${this.isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm mt-1">
              Voice training and pitch monitoring tools
            </p>
          </div>
        </header>

        <!-- Visual Metronome -->
        <visual-metronome></visual-metronome>

        <!-- Pitch Detector -->
        <pitch-detector></pitch-detector>

        <!-- Note Player -->
        <note-player></note-player>

        <!-- Playback Module (hidden, used programmatically) -->
        <playback-module></playback-module>

        <!-- Footer -->
        <footer class="mt-8 py-6 ${this.isDarkMode ? 'text-gray-500' : 'text-gray-600'} text-center text-sm">
          <div class="max-w-4xl mx-auto px-6">
            <p>All components are independent and modular</p>
          </div>
        </footer>

      </div>
    `;
  }
}

customElements.define('muzic-app', MuzicApp);
