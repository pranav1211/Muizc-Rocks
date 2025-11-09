// Note converter utilities for NotePlayer component

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const A4_FREQ = 440;

/**
 * Convert note name to frequency
 * @param {string} noteName - Note name (C, C#, D, etc.)
 * @param {number} octave - Octave number
 * @returns {number} - Frequency in Hz
 */
export function noteToFrequency(noteName, octave) {
  const noteIndex = NOTE_NAMES.indexOf(noteName);
  if (noteIndex === -1) return 440;

  const midiNote = (octave + 1) * 12 + noteIndex;
  return A4_FREQ * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * Parse note string into name and octave
 * @param {string} noteString - e.g., "C4", "D#3"
 * @returns {object} - { noteName, octave }
 */
export function parseNoteString(noteString) {
  const match = noteString.match(/^([A-G]#?)(\d+)$/);
  if (!match) return { noteName: 'A', octave: 4 };

  return {
    noteName: match[1],
    octave: parseInt(match[2])
  };
}
