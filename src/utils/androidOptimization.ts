import { Platform } from 'react-native';

// Enhanced Android config to match iOS smoothness while maintaining stability
export const ANDROID_AUDIO_CONFIG = {
  sampleRate: 44100,  // Match iOS for better quality - modern Android devices can handle this
  bufferSize: 6144,   // Larger buffer for more stable audio processing
  channelCount: 1,
  audioFormat: 'PCM_16BIT',
  audioSource: 'MIC',
  frameSize: 3072,    // Increased for better quality
  overlapSize: 2048,  // Better overlap for smooth processing
  updateInterval: 25, // Faster updates - closer to iOS performance
  pitchDetectionThreshold: 0.12, // More sensitive for quick detection
  minFrequency: 70,   // Extended range for better octave detection
  maxFrequency: 1400, // Extended range to match iOS capabilities
  enableNoiseSuppression: true,
  enableEchoCancellation: false,
  enableAutoGainControl: true,
  // New Android-specific optimizations
  enableLowLatencyMode: true,
  prioritizeAccuracy: true,
  adaptiveBuffering: true,
};

export const IOS_AUDIO_CONFIG = {
  sampleRate: 44100,
  bufferSize: 9000,
  channelCount: 1,
  audioFormat: 'PCM_16BIT',
  audioSource: 'MIC',
  frameSize: 4096,
  overlapSize: 4000,
  updateInterval: 100,
  pitchDetectionThreshold: 0.3,
  minFrequency: 80,
  maxFrequency: 1000,
  enableNoiseSuppression: false,
  enableEchoCancellation: false,
  enableAutoGainControl: false,
};

export const getOptimizedAudioConfig = () => {
  return Platform.OS === 'android' ? ANDROID_AUDIO_CONFIG : IOS_AUDIO_CONFIG;
};

// Enhanced Android performance settings for iOS-level smoothness
export const ANDROID_PERFORMANCE_SETTINGS = {
  enableHardwareAcceleration: true,
  reducedMotion: false,            // Enable smooth animations like iOS
  disableAnimationsWhileStreaming: false, // Allow animations for better UX
  maxConcurrentSounds: 5,          // Increased for richer audio experience
  preloadSounds: true,
  useNativeDriver: true,
  renderAheadOffset: 1,            // Reduced for more responsive updates
  throttleUpdates: false,          // Disable throttling for smoother performance
  updateThrottleMs: 8,             // Faster updates when throttling is needed
  // New iOS-matching optimizations
  enableVSync: true,
  prioritizeUI: true,
  enableMetalRendering: true,      // Android equivalent optimizations
  adaptiveQuality: true,
  lowLatencyAudio: true,
  enableParallelProcessing: true,
};

export const shouldThrottleUpdate = (lastUpdate: number, currentTime: number): boolean => {
  if (Platform.OS !== 'android') return false;
  // Only throttle if explicitly enabled (now disabled by default for iOS-level performance)
  if (!ANDROID_PERFORMANCE_SETTINGS.throttleUpdates) return false;
  return (currentTime - lastUpdate) < ANDROID_PERFORMANCE_SETTINGS.updateThrottleMs;
};

export const getOptimizedBufferSize = (): number => {
  return Platform.OS === 'android' ? 6144 : 9000; // Increased Android buffer for better quality
};

export const getOptimizedSampleRate = (): number => {
  return Platform.OS === 'android' ? 44100 : 44100; // Match iOS sample rate for consistency
};

// New function to get iOS-level performance settings for Android
export const getIOSLevelPerformanceSettings = () => {
  return {
    audioConfig: ANDROID_AUDIO_CONFIG,
    performanceSettings: ANDROID_PERFORMANCE_SETTINGS,
    renderingOptimizations: {
      enableHardwareAcceleration: true,
      useNativeDriver: true,
      enableVSync: true,
      prioritizeRendering: true,
      adaptiveFrameRate: true,
      maxFrameRate: 60,
      minFrameRate: 30,
    },
    pitchDetectionOptimizations: {
      enableParallelProcessing: true,
      useOptimizedAlgorithm: true,
      enablePredictiveSmoothing: true,
      fastResponseMode: true,
    }
  };
};