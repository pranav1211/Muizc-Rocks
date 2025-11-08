import { PitchDetector } from './pitch-detector.js';

/**
 * Audio processor - handles microphone input and pitch detection
 */
export class AudioProcessor {
  constructor(onPitchUpdate) {
    this.onPitchUpdate = onPitchUpdate;
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.gainNode = null;
    this.pitchDetector = null;
    this.animationFrame = null;
    this.stream = null;
    this.monitoringEnabled = false;
    this.smoothedFrequency = null;
    this.smoothingFactor = 0.3; // Lower = more smoothing
  }

  /**
   * Start audio processing
   * @returns {Promise<boolean>} - Success status
   */
  async start() {
    try {
      // Request microphone access with low latency settings
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          latency: 0,
          sampleRate: 48000
        }
      });

      // Create audio context with low latency
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 48000
      });

      // Create analyser for pitch detection
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.3;

      // Create microphone source
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);

      // Create gain node for monitoring (starts at 0 = muted)
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0;

      // Connect audio graph:
      // Microphone -> Analyser (for pitch detection)
      // Microphone -> Gain -> Speakers (for monitoring)
      this.microphone.connect(this.analyser);
      this.microphone.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      // Create pitch detector
      this.pitchDetector = new PitchDetector(
        this.audioContext,
        this.audioContext.sampleRate
      );

      // Start pitch detection loop
      this.detectPitchLoop();

      return true;
    } catch (error) {
      console.error('Error starting audio:', error);
      return false;
    }
  }

  /**
   * Main pitch detection loop
   */
  detectPitchLoop() {
    const bufferLength = this.analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);

    let lastDetectionTime = 0;
    const detectionInterval = 100; // Detect pitch every 100ms (10 times per second)

    const detect = () => {
      const now = Date.now();

      // Only detect pitch at specified interval (reduce CPU usage)
      if (now - lastDetectionTime >= detectionInterval) {
        lastDetectionTime = now;

        // Get time domain data
        this.analyser.getFloatTimeDomainData(dataArray);

        // Detect pitch
        const frequency = this.pitchDetector.detectPitch(dataArray);

        if (frequency) {
          // Apply smoothing
          if (this.smoothedFrequency === null) {
            this.smoothedFrequency = frequency;
          } else {
            this.smoothedFrequency =
              this.smoothedFrequency * (1 - this.smoothingFactor) +
              frequency * this.smoothingFactor;
          }

          // Send update to UI
          this.onPitchUpdate(this.smoothedFrequency);
        } else {
          // No pitch detected
          this.onPitchUpdate(null);
          this.smoothedFrequency = null;
        }
      }

      // Continue loop (runs at ~60fps but only processes at detectionInterval)
      this.animationFrame = requestAnimationFrame(detect);
    };

    detect();
  }

  /**
   * Enable live monitoring (user hears themselves)
   */
  enableMonitoring() {
    if (this.gainNode && this.audioContext) {
      // Resume audio context if suspended (fixes iOS issues)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      // Set monitoring volume (0.8 = 80%)
      this.gainNode.gain.setValueAtTime(0.8, this.audioContext.currentTime);
      this.monitoringEnabled = true;
    }
  }

  /**
   * Disable live monitoring
   */
  disableMonitoring() {
    if (this.gainNode && this.audioContext) {
      // Smoothly ramp down to avoid clicks
      this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      this.monitoringEnabled = false;
    }
  }

  /**
   * Stop audio processing and release resources
   */
  stop() {
    // Stop animation loop
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    // Disconnect audio nodes
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    if (this.analyser) {
      this.analyser = null;
    }

    // Stop microphone stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Reset state
    this.smoothedFrequency = null;
    this.monitoringEnabled = false;
  }

  /**
   * Check if monitoring is enabled
   * @returns {boolean}
   */
  isMonitoringEnabled() {
    return this.monitoringEnabled;
  }
}