import { useEffect, useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { AudioModule } from 'expo-audio';
import MicrophoneStreamModule, { AudioBuffer } from '../../modules/microphone-stream';
import DSPModule from '../../specs/NativeDSPModule';
import { getOptimizedAudioConfig, getOptimizedBufferSize, getOptimizedSampleRate } from '../utils/androidOptimization';

interface PitchData {
  pitch: number;
  rms: number;
  audioBuffer: number[];
  bufferId: number;
  sampleRate: number;
  timestamp: number;
}

type MicrophonePermissionStatus = 'pending' | 'granted' | 'denied' | 'requesting';

// Constants for audio processing
const audioConfig = getOptimizedAudioConfig();
const BUF_SIZE = getOptimizedBufferSize();
const OVERLAP_SIZE = Platform.OS === 'android' ? 1024 : 4000;
const MIN_FREQ = audioConfig.minFrequency;
const MAX_FREQ = audioConfig.maxFrequency;
const THRESHOLD_DEFAULT = audioConfig.pitchDetectionThreshold;
const INITIAL_SAMPLE_RATE = getOptimizedSampleRate();

// Global state for the microphone manager
let globalMicrophoneState = {
  permissionStatus: 'pending' as MicrophonePermissionStatus,
  isStreaming: false,
  isInitializing: false,
  sampleRate: INITIAL_SAMPLE_RATE,
  pitchData: {
    pitch: -1,
    rms: 0,
    audioBuffer: new Array(BUF_SIZE).fill(0),
    bufferId: 0,
    sampleRate: INITIAL_SAMPLE_RATE,
    timestamp: 0,
  } as PitchData,
};

let globalListeners: Set<(data: PitchData) => void> = new Set();
let globalPermissionListeners: Set<(status: MicrophonePermissionStatus) => void> = new Set();
let microphoneSubscription: any = null;
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;
let healthCheckInterval: NodeJS.Timeout | null = null;

// Global functions for managing microphone
export const requestMicrophonePermission = async (retryCount = 0): Promise<MicrophonePermissionStatus> => {
  const MAX_RETRIES = 3;
  
  if (globalMicrophoneState.permissionStatus === 'granted') {
    // Verify streaming is actually working
    if (!globalMicrophoneState.isStreaming) {
      console.log('🎤 Permission granted but not streaming, starting stream...');
      await startMicrophoneStream();
    }
    return 'granted';
  }

  if (globalMicrophoneState.permissionStatus === 'requesting' && retryCount === 0) {
    // Wait for existing request to complete
    return new Promise((resolve) => {
      const checkStatus = () => {
        if (globalMicrophoneState.permissionStatus !== 'requesting') {
          resolve(globalMicrophoneState.permissionStatus);
        } else {
          setTimeout(checkStatus, 100);
        }
      };
      checkStatus();
    });
  }

  try {
    globalMicrophoneState.permissionStatus = 'requesting';
    notifyPermissionListeners();
    
    console.log(`🎤 Requesting microphone permission (attempt ${retryCount + 1})...`);

    // Try both permission systems for better compatibility
    let hasPermission = false;
    
    try {
      // First try AudioModule (expo-audio)
      const audioPermission = await AudioModule.requestRecordingPermissionsAsync();
      hasPermission = audioPermission.granted;
      console.log(`🎤 AudioModule permission result: ${hasPermission}`);
    } catch (audioError) {
      console.warn('🎤 AudioModule permission failed, trying native module:', audioError);
      
      // Fallback to native module
      try {
        const nativeResult = await MicrophoneStreamModule.requestPermission();
        hasPermission = nativeResult === 'granted';
        console.log(`🎤 Native module permission result: ${hasPermission}`);
      } catch (nativeError) {
        console.error('🎤 Both permission systems failed:', nativeError);
        throw nativeError;
      }
    }
    
    if (hasPermission) {
      globalMicrophoneState.permissionStatus = 'granted';
      console.log('🎤 Microphone permission granted, starting stream...');
      
      // Wait a bit before starting stream to ensure permission is fully processed
      // Android needs more time to process permissions
      await new Promise(resolve => setTimeout(resolve, Platform.OS === 'android' ? 300 : 100));
      await startMicrophoneStream();
      
      console.log('🎤 Microphone system fully initialized');
    } else {
      globalMicrophoneState.permissionStatus = 'denied';
      console.log('🎤 Microphone permission denied');
      
      // Only show alert on first attempt
      if (retryCount === 0) {
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
    }
  } catch (error) {
    console.error('🎤 Error requesting microphone permission:', error);
    
    // Retry logic
    if (retryCount < MAX_RETRIES) {
      console.log(`🎤 Retrying permission request in 1 second... (${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return await requestMicrophonePermission(retryCount + 1);
    }
    
    globalMicrophoneState.permissionStatus = 'denied';
  }

  notifyPermissionListeners();
  return globalMicrophoneState.permissionStatus;
};

const startMicrophoneStream = async (retryCount = 0) => {
  const MAX_STREAM_RETRIES = 3;
  
  if (globalMicrophoneState.isStreaming) {
    console.log('🎤 Microphone stream is already running');
    return;
  }
  
  if (globalMicrophoneState.permissionStatus !== 'granted') {
    console.log('🎤 Cannot start stream - no permission');
    return;
  }

  if (globalMicrophoneState.isInitializing && retryCount === 0) {
    console.log('🎤 Microphone is already initializing, waiting...');
    return new Promise((resolve) => {
      const checkInitializing = () => {
        if (!globalMicrophoneState.isInitializing) {
          resolve(undefined);
        } else {
          setTimeout(checkInitializing, 100);
        }
      };
      checkInitializing();
    });
  }

  try {
    globalMicrophoneState.isInitializing = true;
    console.log(`🎤 Starting microphone stream (attempt ${retryCount + 1})...`);
    
    let audioBuffer = new Array(BUF_SIZE).fill(0);
    let rmsQueue: number[] = [];
    let bufferIdCounter = 0;
    let lastProcessTime = 0;
    const processThrottle = Platform.OS === 'android' ? 50 : 100; // Process more frequently on Android

    // Clean up any existing subscription first
    if (microphoneSubscription) {
      try {
        microphoneSubscription.remove();
        console.log('🎤 Cleaned up old subscription');
      } catch (error) {
        console.warn('Error removing old subscription:', error);
      }
      microphoneSubscription = null;
    }

    // Set up listener first
    microphoneSubscription = MicrophoneStreamModule.addListener('onAudioBuffer', (buffer: AudioBuffer) => {
      if (!globalMicrophoneState.isStreaming) return;

      bufferIdCounter++;

      // Throttle processing on Android to improve performance
      const now = Date.now();
      if (Platform.OS === 'android' && (now - lastProcessTime) < processThrottle) {
        return;
      }
      lastProcessTime = now;

      // Update audio buffer with overlap
      const len = Math.min(buffer.samples.length, BUF_SIZE - OVERLAP_SIZE);
      audioBuffer = audioBuffer.slice(len);
      audioBuffer.push(...buffer.samples.slice(0, len));

      // Process audio data asynchronously
      (async () => {
        try {
          // Calculate RMS
          const rms = await DSPModule.rms(buffer.samples);
          // Add null check for Android compatibility
          const validRms = (rms !== null && rms !== undefined && !isNaN(rms)) ? rms : 0;
          rmsQueue.push(validRms);
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

    console.log('🎤 Listener set up, starting recording...');
    
    try {
      await MicrophoneStreamModule.startRecording();
      globalMicrophoneState.isStreaming = true;
      console.log('🎤 Microphone recording started successfully');
    } catch (recordingError) {
      console.error('🎤 Error starting recording:', recordingError);
      
      // Clean up and retry
      if (microphoneSubscription) {
        microphoneSubscription.remove();
        microphoneSubscription = null;
      }
      
      // Retry logic
      if (retryCount < MAX_STREAM_RETRIES) {
        globalMicrophoneState.isInitializing = false;
        console.log(`🎤 Retrying stream start in 500ms... (${retryCount + 1}/${MAX_STREAM_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        return await startMicrophoneStream(retryCount + 1);
      } else {
        throw recordingError;
      }
    }
    
    // Get sample rate after starting recording with retry
    setTimeout(async () => {
      try {
        const sampleRate = MicrophoneStreamModule.getSampleRate();
        // Use optimized sample rate for Android
        const optimizedRate = Platform.OS === 'android' ? getOptimizedSampleRate() : sampleRate;
        globalMicrophoneState.sampleRate = optimizedRate;
        console.log('🎤 Sample rate set to:', optimizedRate, '(platform:', Platform.OS, ')');
      } catch (error) {
        console.error('Error getting sample rate:', error);
        globalMicrophoneState.sampleRate = 44100; // Default fallback
      }
    }, 200); // Slightly longer delay
    
    // Start health monitoring
    startHealthCheck();
    
  } catch (error) {
    console.error(`🎤 Error starting microphone stream (attempt ${retryCount + 1}):`, error);
    globalMicrophoneState.isStreaming = false;
    
    if (microphoneSubscription) {
      try {
        microphoneSubscription.remove();
      } catch {}
      microphoneSubscription = null;
    }
    
    // Final retry logic
    if (retryCount < MAX_STREAM_RETRIES) {
      console.log(`🎤 Final retry in 1 second... (${retryCount + 1}/${MAX_STREAM_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      globalMicrophoneState.isInitializing = false;
      return await startMicrophoneStream(retryCount + 1);
    }
  } finally {
    globalMicrophoneState.isInitializing = false;
  }
};

const stopMicrophoneStream = async () => {
  if (!globalMicrophoneState.isStreaming) return;

  try {
    globalMicrophoneState.isStreaming = false;
    
    // Stop health monitoring
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
    }
    
    if (microphoneSubscription) {
      microphoneSubscription.remove();
      microphoneSubscription = null;
    }

    MicrophoneStreamModule.stopRecording();
    console.log('🎤 Microphone stream stopped');
  } catch (error) {
    console.error('Error stopping microphone stream:', error);
  }
};

// Health check mechanism to ensure microphone stays active
const startHealthCheck = () => {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  
  let lastBufferId = globalMicrophoneState.pitchData.bufferId;
  let staleDataCount = 0;
  
  healthCheckInterval = setInterval(async () => {
    if (!globalMicrophoneState.isStreaming) return;
    
    const currentBufferId = globalMicrophoneState.pitchData.bufferId;
    const now = Date.now();
    const lastTimestamp = globalMicrophoneState.pitchData.timestamp;
    
    // Check if we're getting fresh data
    const isDataStale = (now - lastTimestamp) > 3000; // 3 seconds
    const isBufferStuck = currentBufferId === lastBufferId;
    
    if (isDataStale || isBufferStuck) {
      staleDataCount++;
      console.warn(`🎤 Health check: Stale data detected (count: ${staleDataCount})`);
      
      // If data has been stale for too long, restart the stream
      if (staleDataCount >= 3) {
        console.warn('🎤 Health check: Restarting microphone stream due to stale data');
        try {
          await stopMicrophoneStream();
          await new Promise(resolve => setTimeout(resolve, 500));
          await startMicrophoneStream();
          staleDataCount = 0;
        } catch (error) {
          console.error('🎤 Health check: Failed to restart stream:', error);
        }
      }
    } else {
      staleDataCount = 0; // Reset counter if data is fresh
    }
    
    lastBufferId = currentBufferId;
  }, 2000); // Check every 2 seconds
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
  if (isInitialized) {
    // If already initialized, return existing promise if still in progress
    if (initializationPromise) {
      return initializationPromise;
    }
    return;
  }
  
  isInitialized = true;
  
  initializationPromise = (async () => {
    console.log('🎤 Initializing global microphone system...');
    
    try {
      // Check current permission status with both systems
      let hasPermission = false;
      
      // Try AudioModule first
      try {
        const permission = await AudioModule.getRecordingPermissionsAsync();
        hasPermission = permission.granted;
        console.log('🎤 Initial AudioModule permission check:', hasPermission);
      } catch (error) {
        console.warn('🎤 AudioModule permission check failed:', error);
      }
      
      if (hasPermission) {
        globalMicrophoneState.permissionStatus = 'granted';
        console.log('🎤 Permission already granted, starting stream...');
        await startMicrophoneStream();
      } else {
        console.log('🎤 No permission found, requesting...');
        await requestMicrophonePermission();
      }
    } catch (error) {
      console.error('🎤 Error during microphone initialization:', error);
      globalMicrophoneState.permissionStatus = 'pending';
      
      // Fallback: try to request permission anyway
      try {
        await requestMicrophonePermission();
      } catch (requestError) {
        console.error('🎤 Fallback permission request failed:', requestError);
      }
    }
    
    notifyPermissionListeners();
    console.log('🎤 Global microphone system initialization complete');
  })();
  
  return initializationPromise;
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
  const isDataFresh = (Date.now() - (pitchData?.timestamp ?? 0)) < 2000;

  const reinitialize = useCallback(async () => {
    return await reinitializeMicrophone();
  }, []);

  const restartStream = useCallback(async () => {
    return await restartMicrophoneStream();
  }, []);

  return {
    // Pitch data - add null safety for Android
    pitch: pitchData?.pitch ?? -1,
    rms: pitchData?.rms ?? 0,
    audioBuffer: pitchData?.audioBuffer ?? [],
    bufferId: pitchData?.bufferId ?? 0,
    sampleRate: pitchData?.sampleRate ?? 44100,
    timestamp: pitchData?.timestamp ?? 0,
    
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