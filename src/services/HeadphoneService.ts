/**
 * Headphone Detection Service
 * Cross-platform service to detect headphone connectivity
 */

import { Platform, NativeModules, NativeEventEmitter } from 'react-native';

interface HeadphoneStatus {
  isConnected: boolean;
  deviceType?: 'wired' | 'bluetooth' | 'unknown';
}

type HeadphoneListener = (status: HeadphoneStatus) => void;

class HeadphoneService {
  private listeners: Set<HeadphoneListener> = new Set();
  private currentStatus: HeadphoneStatus = { isConnected: false };
  private eventEmitter?: NativeEventEmitter;
  private subscription?: any;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize headphone detection
   */
  private async initialize(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await this.initializeAndroid();
      } else if (Platform.OS === 'ios') {
        await this.initializeIOS();
      }
      
      // Get initial status
      await this.updateHeadphoneStatus();
      
      console.log('🎧 HeadphoneService initialized successfully');
    } catch (error) {
      console.error('🎧 Failed to initialize HeadphoneService:', error);
    }
  }

  /**
   * Initialize Android-specific headphone detection
   */
  private async initializeAndroid(): Promise<void> {
    // For Android, we'll use audio manager to detect audio output devices
    // This requires native implementation in Android
    if (NativeModules.AudioManager) {
      this.eventEmitter = new NativeEventEmitter(NativeModules.AudioManager);
      this.subscription = this.eventEmitter.addListener('audioDeviceChanged', (event) => {
        this.handleAudioDeviceChange(event);
      });
    } else {
      // Fallback: Use a simple check method
      console.warn('🎧 AudioManager native module not found, using fallback method');
      this.startPolling();
    }
  }

  /**
   * Initialize iOS-specific headphone detection
   */
  private async initializeIOS(): Promise<void> {
    // For iOS, we'll use AVAudioSession to detect audio route changes
    // This requires native implementation in iOS
    if (NativeModules.AudioRouteManager) {
      this.eventEmitter = new NativeEventEmitter(NativeModules.AudioRouteManager);
      this.subscription = this.eventEmitter.addListener('audioRouteChanged', (event) => {
        this.handleAudioRouteChange(event);
      });
    } else {
      // Fallback: Use a simple check method
      console.warn('🎧 AudioRouteManager native module not found, using fallback method');
      this.startPolling();
    }
  }

  /**
   * Handle Android audio device changes
   */
  private handleAudioDeviceChange(event: any): void {
    console.log('🎧 Android audio device changed:', event);
    
    const isHeadphoneConnected = event.devices?.some((device: any) => 
      device.type === 'WIRED_HEADPHONES' || 
      device.type === 'WIRED_HEADSET' ||
      device.type === 'BLUETOOTH_A2DP' ||
      device.type === 'BLUETOOTH_SCO'
    ) || false;

    const deviceType = this.getAndroidDeviceType(event.devices);
    
    this.updateStatus({
      isConnected: isHeadphoneConnected,
      deviceType
    });
  }

  /**
   * Handle iOS audio route changes
   */
  private handleAudioRouteChange(event: any): void {
    console.log('🎧 iOS audio route changed:', event);
    
    const isHeadphoneConnected = event.outputs?.some((output: any) => 
      output.portType === 'HeadphonesPort' ||
      output.portType === 'BluetoothA2DPOutput' ||
      output.portType === 'BluetoothHFPOutput' ||
      output.portType === 'BluetoothLEOutput'
    ) || false;

    const deviceType = this.getIOSDeviceType(event.outputs);
    
    this.updateStatus({
      isConnected: isHeadphoneConnected,
      deviceType
    });
  }

  /**
   * Get Android device type
   */
  private getAndroidDeviceType(devices: any[]): 'wired' | 'bluetooth' | 'unknown' {
    if (!devices || devices.length === 0) return 'unknown';
    
    for (const device of devices) {
      if (device.type === 'WIRED_HEADPHONES' || device.type === 'WIRED_HEADSET') {
        return 'wired';
      }
      if (device.type === 'BLUETOOTH_A2DP' || device.type === 'BLUETOOTH_SCO') {
        return 'bluetooth';
      }
    }
    
    return 'unknown';
  }

  /**
   * Get iOS device type
   */
  private getIOSDeviceType(outputs: any[]): 'wired' | 'bluetooth' | 'unknown' {
    if (!outputs || outputs.length === 0) return 'unknown';
    
    for (const output of outputs) {
      if (output.portType === 'HeadphonesPort') {
        return 'wired';
      }
      if (output.portType === 'BluetoothA2DPOutput' || 
          output.portType === 'BluetoothHFPOutput' ||
          output.portType === 'BluetoothLEOutput') {
        return 'bluetooth';
      }
    }
    
    return 'unknown';
  }

  /**
   * Fallback polling method for headphone detection
   */
  private startPolling(): void {
    // This is a simplified fallback method
    // In a real implementation, you would need native modules
    console.warn('🎧 Using polling fallback method for headphone detection');
    
    setInterval(() => {
      // For now, we'll assume headphones are always connected in fallback mode
      // This should be replaced with actual native implementation
      this.updateStatus({
        isConnected: true, // Temporary for development
        deviceType: 'unknown'
      });
    }, 5000);
  }

  /**
   * Update headphone status from native modules
   */
  private async updateHeadphoneStatus(): Promise<void> {
    try {
      let status: HeadphoneStatus = { isConnected: false };

      if (Platform.OS === 'android' && NativeModules.AudioManager) {
        const result = await NativeModules.AudioManager.getAudioDevices();
        status = {
          isConnected: result.hasHeadphones || false,
          deviceType: result.deviceType || 'unknown'
        };
      } else if (Platform.OS === 'ios' && NativeModules.AudioRouteManager) {
        const result = await NativeModules.AudioRouteManager.getCurrentAudioRoute();
        status = {
          isConnected: result.hasHeadphones || false,
          deviceType: result.deviceType || 'unknown'
        };
      }

      this.updateStatus(status);
    } catch (error) {
      console.error('🎧 Failed to update headphone status:', error);
    }
  }

  /**
   * Update status and notify listeners
   */
  private updateStatus(newStatus: HeadphoneStatus): void {
    const statusChanged = 
      this.currentStatus.isConnected !== newStatus.isConnected ||
      this.currentStatus.deviceType !== newStatus.deviceType;

    if (statusChanged) {
      this.currentStatus = { ...newStatus };
      console.log('🎧 Headphone status updated:', this.currentStatus);
      
      // Notify all listeners
      this.listeners.forEach(listener => {
        try {
          listener(this.currentStatus);
        } catch (error) {
          console.error('🎧 Error notifying headphone listener:', error);
        }
      });
    }
  }

  /**
   * Get current headphone status
   */
  public getCurrentStatus(): HeadphoneStatus {
    return { ...this.currentStatus };
  }

  /**
   * Check if headphones are currently connected
   */
  public isConnected(): boolean {
    return this.currentStatus.isConnected;
  }

  /**
   * Add listener for headphone status changes
   */
  public addListener(listener: HeadphoneListener): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current status
    listener(this.currentStatus);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Remove listener
   */
  public removeListener(listener: HeadphoneListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Remove all listeners
   */
  public removeAllListeners(): void {
    this.listeners.clear();
  }

  /**
   * Manual refresh of headphone status
   */
  public async refresh(): Promise<HeadphoneStatus> {
    await this.updateHeadphoneStatus();
    return this.getCurrentStatus();
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    
    this.removeAllListeners();
    console.log('🎧 HeadphoneService disposed');
  }
}

// Export singleton instance
export default new HeadphoneService();
export { HeadphoneService, HeadphoneStatus, HeadphoneListener };