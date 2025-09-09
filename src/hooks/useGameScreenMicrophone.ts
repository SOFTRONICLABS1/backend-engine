import { useEffect } from 'react';
import { useGlobalMicrophone } from './useGlobalMicrophoneManager';

/**
 * Hook for game screens to ensure microphone is available and active.
 * This hook:
 * 1. Requests permission if not granted
 * 2. Ensures streaming is active
 * 3. Does NOT stop the microphone when unmounting (lets it persist across games)
 */
export const useGameScreenMicrophone = () => {
  const {
    pitch,
    rms,
    audioBuffer,
    bufferId,
    sampleRate,
    permissionStatus,
    isActive,
    requestPermission,
    startStreaming,
  } = useGlobalMicrophone();

  useEffect(() => {
    let isMounted = true;
    
    const initializeMicrophone = async () => {
      console.log('🎤 Game Screen: Ensuring microphone is available...');
      
      try {
        // Wait for any ongoing initialization to complete
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          if (!isMounted) return;
          
          // Check if microphone is already active
          if (isActive && permissionStatus === 'granted') {
            console.log('🎤 Game Screen: Microphone already active and ready');
            return;
          }
          
          // If permission is pending or denied, try to get it
          if (permissionStatus !== 'granted') {
            console.log(`🎤 Game Screen: Requesting microphone permission (attempt ${attempts + 1})...`);
            const newStatus = await requestPermission();
            if (newStatus !== 'granted') {
              if (newStatus === 'denied') {
                console.log('🎤 Game Screen: Microphone permission denied');
                return;
              }
              // If still pending/requesting, wait a bit and retry
              console.log('🎤 Game Screen: Permission still pending, retrying...');
              await new Promise(resolve => setTimeout(resolve, 500));
              attempts++;
              continue;
            }
          }
          
          // If we have permission but no active stream, start it
          if (permissionStatus === 'granted' && !isActive) {
            console.log('🎤 Game Screen: Permission granted, starting stream...');
            await startStreaming();
            
            // Wait a bit for stream to become active
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          // Check if we're now active
          if (isActive) {
            console.log('🎤 Game Screen: Microphone successfully activated');
            return;
          }
          
          attempts++;
          if (attempts < maxAttempts) {
            console.log(`🎤 Game Screen: Microphone not active yet, retrying (${attempts}/${maxAttempts})...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        if (!isActive) {
          console.warn('🎤 Game Screen: Failed to activate microphone after maximum attempts');
        }
        
      } catch (error) {
        console.error('🎤 Game Screen: Error initializing microphone:', error);
      }
    };
    
    // Start initialization with a small delay to avoid race conditions
    const timer = setTimeout(initializeMicrophone, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []); // Intentionally empty - we want this to run once on mount only, not when mic state changes

  return {
    pitch,
    rms,
    audioBuffer,
    bufferId,
    sampleRate,
    permissionStatus,
    isActive,
    // Legacy compatibility
    micAccess: permissionStatus,
  };
};