import { LitElement, html } from 'lit';

/**
 * MuzicApp - Main application component
 * Displays all independent components in separate, spaced cards
 *
 * Components are COMPLETELY INDEPENDENT:
 * - PitchDetector: Works standalone, no dependencies
 * - VoiceFeedback: Works standalone, no dependencies
 * - VisualMetronome: Works standalone, no dependencies
 * - NotePlayer: Works standalone, no dependencies
 */
export class MuzicApp extends LitElement {
  static properties = {
    isDarkMode: { type: Boolean }
  };

  constructor() {
    super();
    this.isDarkMode = false;
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
      this.requestUpdate();
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

  render() {
    return html`
      <div class="min-h-screen ${this.isDarkMode ? 'bg-gray-950' : 'bg-gradient-to-br from-blue-50 to-purple-50'} pb-12">

        <!-- Header -->
        <header class="sticky top-0 z-10 backdrop-blur-lg ${this.isDarkMode ? 'bg-gray-900/80 border-gray-800' : 'bg-white/80 border-gray-200'} border-b shadow-sm">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div class="flex items-center justify-between">
              <div>
                <h1 class="${this.isDarkMode ? 'text-white' : 'text-gray-900'} text-xl sm:text-2xl font-bold tracking-tight">
                  Muzic Rocks
                </h1>
                <p class="${this.isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs sm:text-sm mt-0.5">
                  Professional Voice Training Suite
                </p>
              </div>
              <div class="${this.isDarkMode ? 'bg-gray-800' : 'bg-blue-100'} px-3 py-1.5 rounded-full">
                <span class="${this.isDarkMode ? 'text-blue-400' : 'text-blue-700'} text-xs font-medium">
                  ${this.isDarkMode ? 'Dark' : 'Light'}
                </span>
              </div>
            </div>
          </div>
        </header>

        <!-- Main Content Area - Centered with max width -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

          <!-- Grid layout for cards - responsive -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">

            <!-- Pitch Detector Card - Independent -->
            <section
              class="rounded-3xl overflow-hidden"
              role="region"
              aria-labelledby="pitch-detector-heading"
            >
              <div class="${this.isDarkMode ? 'bg-gradient-to-r from-purple-900/60 to-blue-900/60' : 'bg-gradient-to-r from-purple-100 to-blue-100'} px-6 py-4">
                <h2
                  id="pitch-detector-heading"
                  class="${this.isDarkMode ? 'text-white' : 'text-gray-900'} text-lg sm:text-xl font-bold flex items-center gap-3"
                >
                  <span class="text-xl sm:text-2xl" aria-hidden="true">🎤</span>
                  <span>Pitch Detector</span>
                </h2>
                <p class="${this.isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-xs sm:text-sm mt-1">
                  Real-time frequency detection
                </p>
              </div>
              <pitch-detector></pitch-detector>
            </section>

            <!-- Voice Feedback Card - Independent -->
            <section
              class="rounded-3xl overflow-hidden"
              role="region"
              aria-labelledby="voice-feedback-heading"
            >
              <div class="${this.isDarkMode ? 'bg-gradient-to-r from-green-900/60 to-teal-900/60' : 'bg-gradient-to-r from-green-100 to-teal-100'} px-6 py-4">
                <h2
                  id="voice-feedback-heading"
                  class="${this.isDarkMode ? 'text-white' : 'text-gray-900'} text-lg sm:text-xl font-bold flex items-center gap-3"
                >
                  <span class="text-xl sm:text-2xl" aria-hidden="true">🎧</span>
                  <span>Voice Feedback</span>
                </h2>
                <p class="${this.isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-xs sm:text-sm mt-1">
                  Hear yourself in real-time
                </p>
              </div>
              <voice-feedback></voice-feedback>
            </section>

            <!-- Metronome Card - Independent -->
            <section
              class="rounded-3xl overflow-hidden"
              role="region"
              aria-labelledby="metronome-heading"
            >
              <div class="${this.isDarkMode ? 'bg-gradient-to-r from-orange-900/60 to-red-900/60' : 'bg-gradient-to-r from-orange-100 to-red-100'} px-6 py-4">
                <h2
                  id="metronome-heading"
                  class="${this.isDarkMode ? 'text-white' : 'text-gray-900'} text-lg sm:text-xl font-bold flex items-center gap-3"
                >
                  <span class="text-xl sm:text-2xl" aria-hidden="true">⏱️</span>
                  <span>Visual Metronome</span>
                </h2>
                <p class="${this.isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-xs sm:text-sm mt-1">
                  Keep perfect timing
                </p>
              </div>
              <visual-metronome></visual-metronome>
            </section>

            <!-- Note Player Card - Independent -->
            <section
              class="rounded-3xl overflow-hidden"
              role="region"
              aria-labelledby="note-player-heading"
            >
              <div class="${this.isDarkMode ? 'bg-gradient-to-r from-indigo-900/60 to-purple-900/60' : 'bg-gradient-to-r from-indigo-100 to-purple-100'} px-6 py-4">
                <h2
                  id="note-player-heading"
                  class="${this.isDarkMode ? 'text-white' : 'text-gray-900'} text-lg sm:text-xl font-bold flex items-center gap-3"
                >
                  <span class="text-xl sm:text-2xl" aria-hidden="true">🎹</span>
                  <span>Note Player</span>
                </h2>
                <p class="${this.isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-xs sm:text-sm mt-1">
                  Practice with reference tones
                </p>
              </div>
              <note-player></note-player>
            </section>

          </div>

        </main>

        <!-- Footer -->
        <footer class="mt-12 pb-8 ${this.isDarkMode ? 'text-gray-600' : 'text-gray-500'} text-center">
          <div class="max-w-7xl mx-auto px-4 sm:px-6">
            <p class="text-xs">
              Independent modular components • No dependencies between components
            </p>
          </div>
        </footer>

        <!-- Hidden Playback Module - Used by Note Player -->
        <playback-module style="display: none;"></playback-module>

      </div>
    `;
  }
}

customElements.define('muzic-app', MuzicApp);
