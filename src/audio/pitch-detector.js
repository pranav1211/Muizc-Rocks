/**
 * Pitch detection using autocorrelation algorithm
 */
export class PitchDetector {
  constructor(audioContext, sampleRate) {
    this.audioContext = audioContext;
    this.sampleRate = sampleRate;
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
    if (rms < 0.05) return -1;
    
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
      if (correlation > 0.9 && correlation > lastCorrelation) {
        const foundGoodCorrelation = (correlation - lastCorrelation);
        if (foundGoodCorrelation > bestCorrelation) {
          bestCorrelation = foundGoodCorrelation;
          bestOffset = offset;
        }
      }
      lastCorrelation = correlation;
    }
    
    if (bestOffset === -1) return -1;
    
    // Convert offset to frequency
    return this.sampleRate / bestOffset;
  }

  /**
   * Detect pitch from audio buffer
   * @param {Float32Array} dataArray - Time domain audio data
   * @returns {number|null} - Frequency in Hz or null
   */
  detectPitch(dataArray) {
    const frequency = this.autoCorrelate(dataArray);
    
    // Filter out unrealistic frequencies (C2 = 65Hz, C5 = 523Hz)
    if (frequency > 0 && frequency >= 60 && frequency <= 1000) {
      return frequency;
    }
    
    return null;
  }
}