/**
 * Pitch detection using autocorrelation algorithm
 */
export class PitchDetector {
  constructor(audioContext, sampleRate) {
    this.audioContext = audioContext;
    this.sampleRate = sampleRate;

    // Smoothing parameters - adjust these for sensitivity
    this.pitchHistory = [];
    this.historySize = 5;  // Number of consecutive detections needed (3-10)
    this.pitchTolerance = 10;  // Hz tolerance for "same" pitch (5-20)
    this.rmsThreshold = 0.05;  // Volume threshold (0.01-0.1)
    this.correlationThreshold = 0.92;  // Correlation quality (0.9-0.95)
    this.minCorrelationQuality = 0.05;  // Minimum correlation strength (0.01-0.1)
  }

  /**
   * Autocorrelation algorithm to detect pitch
   * @param {Float32Array} buffer - Audio buffer
   * @returns {number} - Frequency in Hz, or -1 if no pitch detected
   */
  autoCorrelate(buffer) {
    const SIZE = buffer.length;
    const MAX_SAMPLES = Math.floor(SIZE / 2);
    let bestOffset = -1;
    let bestCorrelation = 0;
    let rms = 0;

    // Calculate RMS (Root Mean Square) to detect silence
    for (let i = 0; i < SIZE; i++) {
      const val = buffer[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);

    // If too quiet, no pitch
    if (rms < this.rmsThreshold) return -1;

    // Find the best autocorrelation offset
    let lastCorrelation = 1;
    for (let offset = 1; offset < MAX_SAMPLES; offset++) {
      let correlation = 0;

      // Calculate correlation at this offset
      for (let i = 0; i < MAX_SAMPLES; i++) {
        correlation += Math.abs(buffer[i] - buffer[i + offset]);
      }
      correlation = 1 - (correlation / MAX_SAMPLES);

      // Look for correlation peak
      if (correlation > this.correlationThreshold && correlation > lastCorrelation) {
        const foundGoodCorrelation = (correlation - lastCorrelation);
        if (foundGoodCorrelation > bestCorrelation) {
          bestCorrelation = foundGoodCorrelation;
          bestOffset = offset;
        }
      }
      lastCorrelation = correlation;
    }

    if (bestOffset === -1) return -1;

    // Require minimum correlation quality
    if (bestCorrelation < this.minCorrelationQuality) return -1;

    // Convert offset to frequency
    return this.sampleRate / bestOffset;
  }

  /**
   * Detect pitch from audio buffer with temporal smoothing
   * @param {Float32Array} dataArray - Time domain audio data
   * @returns {number|null} - Frequency in Hz or null
   */
  detectPitch(dataArray) {
    const frequency = this.autoCorrelate(dataArray);

    // Filter out unrealistic frequencies (C2 = 65Hz, C5 = 523Hz)
    if (frequency < 60 || frequency > 1000) {
      this.pitchHistory = [];  // Reset on bad detection
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
   * Reset the pitch history (useful when starting/stopping detection)
   */
  reset() {
    this.pitchHistory = [];
  }

  /**
   * Update sensitivity settings
   * @param {Object} settings - { historySize, pitchTolerance, rmsThreshold, etc. }
   */
  setSensitivity(settings) {
    if (settings.historySize !== undefined) this.historySize = settings.historySize;
    if (settings.pitchTolerance !== undefined) this.pitchTolerance = settings.pitchTolerance;
    if (settings.rmsThreshold !== undefined) this.rmsThreshold = settings.rmsThreshold;
    if (settings.correlationThreshold !== undefined) this.correlationThreshold = settings.correlationThreshold;
    if (settings.minCorrelationQuality !== undefined) this.minCorrelationQuality = settings.minCorrelationQuality;
    this.reset();
  }
}