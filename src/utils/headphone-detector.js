/* Detect if headphones are connected
 * @returns {Promise<boolean>}
 */
export async function detectHeadphones() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
    console.log(device)
    
    // Check if any output device label mentions headphones
    const hasHeadphones = audioOutputs.some(device => {
      const label = device.label.toLowerCase();
      return label.includes('headphone') ||
             label.includes('headset') ||
             label.includes('earphone') ||
             label.includes('airpods') ||
             label.includes('buds');
    });
    
    // If we have multiple audio outputs, likely one is headphones
    const hasMultipleOutputs = audioOutputs.length > 1;
    
    return hasHeadphones || hasMultipleOutputs;
  } catch (error) {
    console.error('Error detecting headphones:', error);
    // Default to false if detection fails
    return false;
  }
}

/**
 * Check if audio device is Bluetooth (high latency)
 * @param {MediaDeviceInfo} device
 * @returns {boolean}
 */
export function isBluetoothAudio(device) {
  const label = device.label.toLowerCase();
  return label.includes('bluetooth') ||
         label.includes('wireless') ||
         label.includes('airpods') ||
         label.includes('buds');
}