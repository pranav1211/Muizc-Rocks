/**
 * Improved pitch detection using autocorrelation (ACF2+ algorithm)
 * Based on Chris Wilson's well-tested implementation
 *
 * NOTE: DO NOT MODIFY THIS ALGORITHM - IT WORKS PERFECTLY
 */
export class PitchDetectorAlgorithm {
  constructor(audioContext, sampleRate) {
    this.audioContext = audioContext;
    this.sampleRate = sampleRate;

    // Smoothing parameters
    this.pitchHistory = [];
    this.historySize = 3;  // Number of consecutive detections needed
    this.pitchTolerance = 15;  // Hz tolerance for "same" pitch
  }

  /**
   * ACF2+ Autocorrelation algorithm
   * @param {Float32Array} buffer - Audio buffer
   * @param {number} sampleRate - Sample rate
   * @returns {number} - Frequency in Hz, or -1 if no pitch detected
   */
  autoCorrelate(buffer, sampleRate) {
    let SIZE = buffer.length;
    let rms = 0;

    // Calculate RMS (Root Mean Square) to detect silence
    for (let i = 0; i < SIZE; i++) {
      const val = buffer[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);

    // If too quiet, no pitch
    if (rms < 0.01) return -1;

    // Center clipping - remove low amplitude values
    // This helps remove noise and focus on the main signal
    let r1 = 0, r2 = SIZE - 1;
    const thres = 0.2;

    // Find first value above threshold from start
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buffer[i]) < thres) {
        r1 = i;
        break;
      }
    }

    // Find first value above threshold from end
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buffer[SIZE - i]) < thres) {
        r2 = SIZE - i;
        break;
      }
    }

    // Trim buffer to relevant section
    buffer = buffer.slice(r1, r2);
    SIZE = buffer.length;

    // Autocorrelation calculation
    const c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE - i; j++) {
        c[i] = c[i] + buffer[j] * buffer[j + i];
      }
    }

    // Find first low point (valley) after zero
    // This is the DC offset that we want to skip
    let d = 0;
    while (c[d] > c[d + 1]) d++;

    // Find the highest peak after the first valley
    let maxval = -1;
    let maxpos = -1;
    for (let i = d; i < SIZE; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }

    let T0 = maxpos;

    // Parabolic interpolation for sub-sample accuracy
    // This gives us much better frequency resolution
    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;

    if (a) {
      T0 = T0 - b / (2 * a);
    }

    return sampleRate / T0;
  }

  /**
   * Detect pitch from audio buffer with temporal smoothing
   * @param {Float32Array} dataArray - Time domain audio data
   * @returns {number|null} - Frequency in Hz or null
   */
  detectPitch(dataArray) {
    const frequency = this.autoCorrelate(dataArray, this.sampleRate);

    // Filter out unrealistic frequencies
    if (frequency < 60 || frequency > 1000) {
      this.pitchHistory = [];
      return null;
    }

    // Add to history
    this.pitchHistory.push(frequency);
    if (this.pitchHistory.length > this.historySize) {
      this.pitchHistory.shift();
    }

    // Only return a pitch if we have enough consistent readings
    if (this.pitchHistory.length < this.historySize) {
      return null;
    }

    // Check if all readings are similar (within tolerance)
    const avgFreq = this.pitchHistory.reduce((a, b) => a + b) / this.historySize;
    const isConsistent = this.pitchHistory.every(
      freq => Math.abs(freq - avgFreq) < this.pitchTolerance
    );

    return isConsistent ? avgFreq : null;
  }

  /**
   * Reset the pitch history
   */
  reset() {
    this.pitchHistory = [];
  }

  /**
   * Update sensitivity settings
   * @param {Object} settings - { historySize, pitchTolerance }
   */
  setSensitivity(settings) {
    if (settings.historySize !== undefined) {
      this.historySize = settings.historySize;
    }
    if (settings.pitchTolerance !== undefined) {
      this.pitchTolerance = settings.pitchTolerance;
    }
    this.reset();
  }
}
