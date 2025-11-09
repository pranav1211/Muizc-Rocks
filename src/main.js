import './style.css';

// Import all modular components
import './components/VisualMetronome/VisualMetronome.js';
import './components/PitchDetector/PitchDetector.js';
import './components/VoiceFeedback/VoiceFeedback.js';
import './components/PlaybackModule/PlaybackModule.js';
import './components/NotePlayer/NotePlayer.js';
import './components/MuzicApp/MuzicApp.js';

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('Service worker registration failed:', err);
    });
  });
}