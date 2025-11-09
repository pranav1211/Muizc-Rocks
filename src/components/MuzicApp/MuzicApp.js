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
      <div class="min-h-screen ${this.isDarkMode ? 'bg-gray-950' : 'bg-gradient-to-br from-blue-50 to-purple-50'}">

        <!-- Header -->
        <header class="sticky top-0 z-10 backdrop-blur-lg ${this.isDarkMode ? 'bg-gray-900/80 border-gray-800' : 'bg-white/80 border-gray-200'} border-b shadow-sm">
          <div class="max-w-6xl mx-auto px-4 sm:px-6 py-4">
            <div class="flex items-center justify-between">
              <div>
                <h1 class="${this.isDarkMode ? 'text-white' : 'text-gray-900'} text-xl sm:text-2xl font-bold tracking-tight">
                  🎵 Muzic Rocks
                </h1>
                <p class="${this.isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs sm:text-sm mt-0.5">
                  Professional Voice Training Suite
                </p>
              </div>
              <div class="${this.isDarkMode ? 'bg-gray-800' : 'bg-blue-100'} px-3 py-1.5 rounded-full">
                <span class="${this.isDarkMode ? 'text-blue-400' : 'text-blue-700'} text-xs font-medium">
                  ${this.isDarkMode ? '🌙 Dark' : '☀️ Light'}
                </span>
              </div>
            </div>
          </div>
        </header>

        <!-- Main Content Area -->
        <main class="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

          <!-- Pitch Monitor Section -->
          <section
            class="${this.isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} rounded-3xl border-2 shadow-2xl overflow-hidden"
            role="region"
            aria-labelledby="pitch-monitor-heading"
          >
            <div class="${this.isDarkMode ? 'bg-gradient-to-r from-purple-900/60 to-blue-900/60 border-gray-700' : 'bg-gradient-to-r from-purple-100 to-blue-100 border-gray-200'} border-b-2 px-6 py-4">
              <h2
                id="pitch-monitor-heading"
                class="${this.isDarkMode ? 'text-white' : 'text-gray-900'} text-xl sm:text-2xl font-bold flex items-center gap-3"
              >
                <span class="text-2xl" aria-hidden="true">🎤</span>
                <span>Pitch Monitor</span>
              </h2>
              <p class="${this.isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-sm mt-1">
                Real-time frequency detection and voice feedback
              </p>
            </div>
            <pitch-detector></pitch-detector>
          </section>

          <!-- Metronome Section -->
          <section
            class="${this.isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} rounded-3xl border-2 shadow-2xl overflow-hidden"
            role="region"
            aria-labelledby="metronome-heading"
          >
            <div class="${this.isDarkMode ? 'bg-gradient-to-r from-green-900/60 to-teal-900/60 border-gray-700' : 'bg-gradient-to-r from-green-100 to-teal-100 border-gray-200'} border-b-2 px-6 py-4">
              <h2
                id="metronome-heading"
                class="${this.isDarkMode ? 'text-white' : 'text-gray-900'} text-xl sm:text-2xl font-bold flex items-center gap-3"
              >
                <span class="text-2xl" aria-hidden="true">⏱️</span>
                <span>Visual Metronome</span>
              </h2>
              <p class="${this.isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-sm mt-1">
                Keep perfect timing with visual and audio cues
              </p>
            </div>
            <visual-metronome></visual-metronome>
          </section>

          <!-- Note Player Section -->
          <section
            class="${this.isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} rounded-3xl border-2 shadow-2xl overflow-hidden"
            role="region"
            aria-labelledby="note-player-heading"
          >
            <div class="${this.isDarkMode ? 'bg-gradient-to-r from-orange-900/60 to-red-900/60 border-gray-700' : 'bg-gradient-to-r from-orange-100 to-red-100 border-gray-200'} border-b-2 px-6 py-4">
              <h2
                id="note-player-heading"
                class="${this.isDarkMode ? 'text-white' : 'text-gray-900'} text-xl sm:text-2xl font-bold flex items-center gap-3"
              >
                <span class="text-2xl" aria-hidden="true">🎹</span>
                <span>Note Player</span>
              </h2>
              <p class="${this.isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-sm mt-1">
                Practice with reference tones and scales
              </p>
            </div>
            <note-player></note-player>
          </section>

        </main>

        <!-- Playback Module (hidden, used programmatically) -->
        <playback-module style="display: none;"></playback-module>

        <!-- Footer -->
        <footer class="mt-12 pb-8 ${this.isDarkMode ? 'text-gray-600' : 'text-gray-500'} text-center">
          <div class="max-w-6xl mx-auto px-4 sm:px-6">
            <p class="text-xs">
              Independent modular components • Built with Web Components
            </p>
          </div>
        </footer>

      </div>
    `;
  }
}

customElements.define('muzic-app', MuzicApp);
