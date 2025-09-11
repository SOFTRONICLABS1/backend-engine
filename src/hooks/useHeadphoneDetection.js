import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

// Set this to true when developing in emulator to bypass headphone requirement
const USING_EMULATOR = true;

const useHeadphoneDetection = () => {
  const [isHeadphoneConnected, setIsHeadphoneConnected] = useState(false);
  const [audioOutputType, setAudioOutputType] = useState('speaker');

  useEffect(() => {
    let interval = null;

    const checkHeadphoneConnection = async () => {
      try {
        // Bypass headphone check when using emulator
        if (USING_EMULATOR) {
          console.log('🎧 Emulator mode: bypassing headphone requirement');
          setIsHeadphoneConnected(true);
          setAudioOutputType('emulator');
          return;
        }
        
        // For development and testing, we'll use a simpler approach
        // that doesn't require complex native modules
        
        if (Platform.OS === 'web') {
          // Web platform - always allow for testing
          setIsHeadphoneConnected(true);
          setAudioOutputType('unknown');
          return;
        }

        // Try to detect using available React Native APIs
        // This is a simplified detection that works with current RN setup
        
        // Check if we have access to audio session info
        try {
          const AudioSession = require('react-native-audio-session').default;
          
          if (AudioSession && typeof AudioSession.currentRoute === 'function') {
            const currentRoute = await AudioSession.currentRoute();
            console.log('🎧 Audio route check:', currentRoute);
            
            if (currentRoute && currentRoute.outputs && Array.isArray(currentRoute.outputs)) {
              const hasHeadphones = currentRoute.outputs.some(output => {
                const portType = (output.portType || '').toLowerCase();
                return portType.includes('headphone') || 
                       portType.includes('headset') ||
                       portType.includes('bluetooth') ||
                       portType.includes('a2dp') ||
                       portType.includes('airpods');
              });
              
              setIsHeadphoneConnected(hasHeadphones);
              
              // Determine the type
              if (currentRoute.outputs.some(output => {
                const portType = (output.portType || '').toLowerCase();
                return portType.includes('headphone') || portType.includes('headset');
              })) {
                setAudioOutputType('wired');
              } else if (currentRoute.outputs.some(output => {
                const portType = (output.portType || '').toLowerCase();
                return portType.includes('bluetooth') || 
                       portType.includes('a2dp') || 
                       portType.includes('airpods');
              })) {
                setAudioOutputType('bluetooth');
              } else {
                setAudioOutputType('speaker');
              }
              
              console.log('🎧 Headphone connected:', hasHeadphones, 'Type:', audioOutputType);
            } else {
              // No route info available, default to speaker
              setIsHeadphoneConnected(false);
              setAudioOutputType('speaker');
            }
          } else {
            console.log('🎧 AudioSession.currentRoute not available');
            // Fallback: assume no headphones
            setIsHeadphoneConnected(false);
            setAudioOutputType('speaker');
          }
        } catch (audioError) {
          console.log('🎧 Audio session error:', audioError.message);
          // For now, default to allowing access to avoid blocking users
          // In production, you might want to be more restrictive
          setIsHeadphoneConnected(false);
          setAudioOutputType('speaker');
        }
      } catch (error) {
        console.log('🎧 Headphone detection error:', error.message);
        // Default state
        setIsHeadphoneConnected(false);
        setAudioOutputType('speaker');
      }
    };

    // Initial check
    checkHeadphoneConnection();

    // Set up polling for changes (every 2 seconds)
    interval = setInterval(checkHeadphoneConnection, 2000);

    // Cleanup
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  return {
    isHeadphoneConnected,
    audioOutputType, // 'wired', 'bluetooth', 'speaker', 'emulator', or 'unknown'
    isEmulatorMode: USING_EMULATOR,
  };
};

export default useHeadphoneDetection;