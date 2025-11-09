/**
 * Metronome timer with drift correction
 * Uses setTimeout with compensation for timing drift
 */
export class MetronomeTimer {
  constructor(bpm, beatsPerMeasure, onBeat) {
    this.bpm = bpm;
    this.beatsPerMeasure = beatsPerMeasure;
    this.onBeat = onBeat;
    this.intervalMs = (60 / bpm) * 1000;
    this.expectedTime = null;
    this.timeoutId = null;
    this.currentBeat = 1;
    this.isRunning = false;
  }

  /**
   * Start the metronome
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.currentBeat = 1;
    this.expectedTime = Date.now() + this.intervalMs;

    // Fire first beat immediately
    this.onBeat(this.currentBeat);

    // Schedule next beat
    this.tick();
  }

  /**
   * Internal tick function with drift correction
   */
  tick() {
    if (!this.isRunning) return;

    this.timeoutId = setTimeout(() => {
      // Calculate drift
      const drift = Date.now() - this.expectedTime;

      // Advance to next beat
      this.currentBeat++;
      if (this.currentBeat > this.beatsPerMeasure) {
        this.currentBeat = 1;
      }

      // Fire beat callback
      this.onBeat(this.currentBeat);

      // Schedule next beat with drift correction
      this.expectedTime += this.intervalMs;
      this.tick();

    }, Math.max(0, this.intervalMs - (Date.now() - this.expectedTime)));
  }

  /**
   * Stop the metronome
   */
  stop() {
    this.isRunning = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.currentBeat = 1;
  }

  /**
   * Update BPM (applies immediately)
   */
  updateBPM(newBpm) {
    this.bpm = newBpm;
    this.intervalMs = (60 / newBpm) * 1000;

    // If running, recalculate expected time for next beat
    if (this.isRunning) {
      this.expectedTime = Date.now() + this.intervalMs;
    }
  }

  /**
   * Update time signature (resets to beat 1)
   */
  updateTimeSignature(beatsPerMeasure) {
    this.beatsPerMeasure = beatsPerMeasure;
    this.currentBeat = 1;

    if (this.isRunning) {
      // Restart to apply new time signature
      this.stop();
      this.start();
    }
  }

  /**
   * Pause the metronome (preserves current beat)
   */
  pause() {
    this.isRunning = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Resume the metronome (continues from current beat)
   */
  resume() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.expectedTime = Date.now() + this.intervalMs;
    this.tick();
  }

  /**
   * Check if metronome is running
   */
  getIsRunning() {
    return this.isRunning;
  }

  /**
   * Get current beat number
   */
  getCurrentBeat() {
    return this.currentBeat;
  }
}
