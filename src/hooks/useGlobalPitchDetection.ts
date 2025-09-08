import { useCallback } from 'react';
import { useGlobalMicrophone } from './useGlobalMicrophoneManager';

interface UseGlobalPitchDetectionOptions {
  enabled?: boolean;
  onPitchUpdate?: (data: any) => void;
}

// Compatibility layer - this hook now uses the new global microphone system
export const useGlobalPitchDetection = (options: UseGlobalPitchDetectionOptions = {}) => {
  const { enabled = true, onPitchUpdate } = options;
  
  // Use the new global microphone system
  const microphoneData = useGlobalMicrophone();
  
  // Call onPitchUpdate callback when data changes (if provided)
  const handlePitchUpdate = useCallback(() => {
    if (enabled && onPitchUpdate && microphoneData.isActive) {
      onPitchUpdate({
        pitch: microphoneData.pitch,
        rms: microphoneData.rms,
        audioBuffer: microphoneData.audioBuffer,
        bufferId: microphoneData.bufferId,
        sampleRate: microphoneData.sampleRate,
        timestamp: microphoneData.timestamp,
      });
    }
  }, [enabled, onPitchUpdate, microphoneData]);

  // Call the callback whenever microphone data updates
  if (enabled && onPitchUpdate && microphoneData.isActive) {
    handlePitchUpdate();
  }

  return {
    // Pitch data
    pitch: microphoneData.pitch,
    rms: microphoneData.rms,
    audioBuffer: microphoneData.audioBuffer,
    bufferId: microphoneData.bufferId,
    sampleRate: microphoneData.sampleRate,
    timestamp: microphoneData.timestamp,
    
    // Status (legacy compatibility)
    micAccess: microphoneData.permissionStatus === 'granted' ? 'granted' : 
               microphoneData.permissionStatus === 'denied' ? 'denied' : 'pending',
    isActive: microphoneData.isActive,
    
    // New controls
    requestPermission: microphoneData.requestPermission,
    startStreaming: microphoneData.startStreaming,
    stopStreaming: microphoneData.stopStreaming,
    reinitialize: microphoneData.reinitialize,
    restartStream: microphoneData.restartStream,
  };
};

// Legacy function for backward compatibility (no longer needed but keeping for existing code)
export const updateGlobalPitchData = (data: any) => {
  // This function is no longer needed as the global microphone system handles everything
  // Keeping it for backward compatibility but it won't do anything
  console.log('updateGlobalPitchData is deprecated - data is now handled by global microphone system');
};

