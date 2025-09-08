import { useEffect, useState, useRef, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { AudioModule } from 'expo-audio';
import MicrophoneStreamModule, { AudioBuffer } from '../../modules/microphone-stream';
import DSPModule from '../../specs/NativeDSPModule';

interface PitchData {
  pitch: number;
  rms: number;
  audioBuffer: number[];
  bufferId: number;
  sampleRate: number;
  timestamp: number;
}

type MicrophonePermissionStatus = 'pending' | 'granted' | 'denied' | 'requesting';

// Global state for the microphone manager
let globalMicrophoneState = {
  permissionStatus: 'pending' as MicrophonePermissionStatus,
  isStreaming: false,
  sampleRate: 44100,
  pitchData: {
    pitch: -1,
    rms: 0,
    audioBuffer: new Array(9000).fill(0),
    bufferId: 0,
    sampleRate: 44100,
    timestamp: 0,
  } as PitchData,
};

let globalListeners: Set<(data: PitchData) => void> = new Set();
let globalPermissionListeners: Set<(status: MicrophonePermissionStatus) => void> = new Set();
let microphoneSubscription: any = null;
let isInitialized = false;

// Constants for audio processing
const BUF_SIZE = 9000;
const OVERLAP_SIZE = 4000;
const MIN_FREQ = 80;
const MAX_FREQ = 1000;
const THRESHOLD_DEFAULT = 0.3;

// Global functions for managing microphone
export const requestMicrophonePermission = async (): Promise<MicrophonePermissionStatus> => {
  if (globalMicrophoneState.permissionStatus === 'granted') {
    return 'granted';
  }

  if (globalMicrophoneState.permissionStatus === 'requesting') {
    return 'requesting';
  }

  try {
    globalMicrophoneState.permissionStatus = 'requesting';
    notifyPermissionListeners();

    // Use our native MicrophoneStream module for permission request
    const permissionResult = await MicrophoneStreamModule.requestPermission();
    const hasPermission = permissionResult === 'granted';
    
    if (hasPermission) {
      globalMicrophoneState.permissionStatus = 'granted';
      // Auto-start streaming when permission is granted
      await startMicrophoneStream();
    } else {
      globalMicrophoneState.permissionStatus = 'denied';
      
      if (Platform.OS === 'ios') {
        Alert.alert(
          'Microphone Access Required',
          'Please enable microphone access in Settings > Privacy & Security > Microphone > Tuneo to use voice features.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Microphone Access Required',
          'Please enable microphone access in your device settings to use voice features.',
          [{ text: 'OK' }]
        );
      }
    }
  } catch (error) {
    console.error('Error requesting microphone permission:', error);
    globalMicrophoneState.permissionStatus = 'denied';
  }

  notifyPermissionListeners();
  return globalMicrophoneState.permissionStatus;
};

const startMicrophoneStream = async () => {
  if (globalMicrophoneState.isStreaming || globalMicrophoneState.permissionStatus !== 'granted') {
    return;
  }

  try {
    globalMicrophoneState.isStreaming = true;
    
    let audioBuffer = new Array(BUF_SIZE).fill(0);
    let rmsQueue: number[] = [];
    let bufferIdCounter = 0;

    microphoneSubscription = MicrophoneStreamModule.addListener('onAudioBuffer', (buffer: AudioBuffer) => {
      if (!globalMicrophoneState.isStreaming) return;

      bufferIdCounter++;

      // Update audio buffer with overlap
      const len = Math.min(buffer.samples.length, BUF_SIZE - OVERLAP_SIZE);
      audioBuffer = audioBuffer.slice(len);
      audioBuffer.push(...buffer.samples.slice(0, len));

      // Process audio data asynchronously
      (async () => {
        try {
          // Debug: Log buffer info          
          // Calculate RMS
          const rms = await DSPModule.rms(buffer.samples);
          rmsQueue.push(rms);
          if (rmsQueue.length > 10) rmsQueue.shift(); // Keep last 10 RMS values
          
          // Pitch detection
          const detectedPitch = await DSPModule.pitch(
            audioBuffer, 
            globalMicrophoneState.sampleRate, 
            MIN_FREQ, 
            MAX_FREQ, 
            THRESHOLD_DEFAULT
          );
          
          // Update global pitch data
          globalMicrophoneState.pitchData = {
            pitch: detectedPitch,
            rms: rmsQueue[rmsQueue.length - 1] || 0,
            audioBuffer: [...audioBuffer],
            bufferId: bufferIdCounter,
            sampleRate: globalMicrophoneState.sampleRate,
            timestamp: Date.now(),
          };

          // Notify all listeners
          notifyPitchListeners();
        } catch (error) {
          console.error('Error processing audio data:', error);
        }
      })();
    });

    MicrophoneStreamModule.startRecording();
    
    // Get sample rate after starting recording
    setTimeout(() => {
      try {
        globalMicrophoneState.sampleRate = MicrophoneStreamModule.getSampleRate();
      } catch (error) {
        console.error('Error getting sample rate:', error);
        globalMicrophoneState.sampleRate = 44100; // Default fallback
      }
    }, 100);
    
  } catch (error) {
    console.error('Error starting microphone stream:', error);
    globalMicrophoneState.isStreaming = false;
  }
};

const stopMicrophoneStream = async () => {
  if (!globalMicrophoneState.isStreaming) return;

  try {
    globalMicrophoneState.isStreaming = false;
    
    if (microphoneSubscription) {
      microphoneSubscription.remove();
      microphoneSubscription = null;
    }

    MicrophoneStreamModule.stopRecording();
  } catch (error) {
    console.error('Error stopping microphone stream:', error);
  }
};

const notifyPitchListeners = () => {
  globalListeners.forEach(listener => {
    try {
      listener(globalMicrophoneState.pitchData);
    } catch (error) {
      console.error("Error in pitch detection listener:", error);
    }
  });
};

const notifyPermissionListeners = () => {
  globalPermissionListeners.forEach(listener => {
    try {
      listener(globalMicrophoneState.permissionStatus);
    } catch (error) {
      console.error("Error in permission listener:", error);
    }
  });
};

// Initialize the microphone system (called once at app startup)
export const initializeGlobalMicrophone = async () => {
  if (isInitialized) return;
  
  isInitialized = true;
  
  // Check if we already have permission
  try {
    const permission = await AudioModule.getRecordingPermissionsAsync();
    if (permission.granted) {
      globalMicrophoneState.permissionStatus = 'granted';
      await startMicrophoneStream();
    } else {
      // Request microphone permission immediately when app starts
      await requestMicrophonePermission();
    }
  } catch (error) {
    console.error('Error checking microphone permission:', error);
    globalMicrophoneState.permissionStatus = 'pending';
    // Still try to request permission even if checking failed
    await requestMicrophonePermission();
  }
  
  notifyPermissionListeners();
};

// Reinitialize microphone system (for when navigating to game screens)
export const reinitializeMicrophone = async (): Promise<boolean> => {
  console.log('🎤 Reinitializing microphone system...');
  
  try {
    // First stop existing stream if running
    if (globalMicrophoneState.isStreaming) {
      await stopMicrophoneStream();
    }
    
    // Check current permission status
    const permission = await AudioModule.getRecordingPermissionsAsync();
    if (permission.granted) {
      globalMicrophoneState.permissionStatus = 'granted';
      await startMicrophoneStream();
      notifyPermissionListeners();
      console.log('🎤 Microphone successfully reinitialized');
      return true;
    } else {
      // Request permission again
      const newStatus = await requestMicrophonePermission();
      console.log('🎤 Microphone permission status after reinit:', newStatus);
      return newStatus === 'granted';
    }
  } catch (error) {
    console.error('🎤 Error reinitializing microphone:', error);
    return false;
  }
};

// Force restart microphone stream (for when stream gets stuck)
export const restartMicrophoneStream = async (): Promise<boolean> => {
  console.log('🎤 Restarting microphone stream...');
  
  try {
    // Stop current stream
    await stopMicrophoneStream();
    
    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Start again if we have permission
    if (globalMicrophoneState.permissionStatus === 'granted') {
      await startMicrophoneStream();
      console.log('🎤 Microphone stream successfully restarted');
      return true;
    } else {
      console.log('🎤 Cannot restart stream - no permission');
      return false;
    }
  } catch (error) {
    console.error('🎤 Error restarting microphone stream:', error);
    return false;
  }
};

// Hook for components to use the global microphone system
export const useGlobalMicrophone = () => {
  const [pitchData, setPitchData] = useState<PitchData>(globalMicrophoneState.pitchData);
  const [permissionStatus, setPermissionStatus] = useState<MicrophonePermissionStatus>(globalMicrophoneState.permissionStatus);
  const [isStreaming, setIsStreaming] = useState(globalMicrophoneState.isStreaming);

  // Subscribe to pitch data updates
  useEffect(() => {
    const pitchListener = (data: PitchData) => {
      setPitchData(data);
      setIsStreaming(globalMicrophoneState.isStreaming);
    };
    
    const permissionListener = (status: MicrophonePermissionStatus) => {
      setPermissionStatus(status);
    };

    globalListeners.add(pitchListener);
    globalPermissionListeners.add(permissionListener);

    // Set initial values
    setPitchData(globalMicrophoneState.pitchData);
    setPermissionStatus(globalMicrophoneState.permissionStatus);
    setIsStreaming(globalMicrophoneState.isStreaming);

    return () => {
      globalListeners.delete(pitchListener);
      globalPermissionListeners.delete(permissionListener);
    };
  }, []);

  const requestPermission = useCallback(async () => {
    return await requestMicrophonePermission();
  }, []);

  const startStreaming = useCallback(async () => {
    if (globalMicrophoneState.permissionStatus === 'granted') {
      await startMicrophoneStream();
    } else {
      await requestMicrophonePermission();
    }
  }, []);

  const stopStreaming = useCallback(async () => {
    await stopMicrophoneStream();
  }, []);

  // Check if data is fresh (within last 2 seconds)
  const isDataFresh = (Date.now() - pitchData.timestamp) < 2000;

  const reinitialize = useCallback(async () => {
    return await reinitializeMicrophone();
  }, []);

  const restartStream = useCallback(async () => {
    return await restartMicrophoneStream();
  }, []);

  return {
    // Pitch data
    pitch: pitchData.pitch,
    rms: pitchData.rms,
    audioBuffer: pitchData.audioBuffer,
    bufferId: pitchData.bufferId,
    sampleRate: pitchData.sampleRate,
    timestamp: pitchData.timestamp,
    
    // Status
    permissionStatus,
    isStreaming,
    isActive: isDataFresh && isStreaming && pitchData.bufferId > 0,
    
    // Controls
    requestPermission,
    startStreaming,
    stopStreaming,
    reinitialize,
    restartStream,
    
    // Legacy compatibility
    micAccess: permissionStatus,
  };
};