import { useState, useEffect } from 'react';
import { NativeEventEmitter, NativeModules } from 'react-native';

const useHeadphoneDetection = () => {
  const [isHeadphoneConnected, setIsHeadphoneConnected] = useState(false);
  const [audioOutputType, setAudioOutputType] = useState('speaker');

  useEffect(() => {
    let HeadphoneDetection = null;
    let audioJackEventEmitter = null;
    let audioJackListener = null;

    const initializeDetection = async () => {
      try {
        // Try to import the headphone detection module
        HeadphoneDetection = require('react-native-headphone-detection').default;
        
        if (HeadphoneDetection) {
          // Check initial state
          HeadphoneDetection.isAudioDeviceConnected().then(({ audioJack, bluetooth }) => {
            console.log('Initial headphone state - audioJack:', audioJack, 'bluetooth:', bluetooth);
            const connected = audioJack || bluetooth;
            setIsHeadphoneConnected(connected);
            
            if (audioJack) {
              setAudioOutputType('wired');
            } else if (bluetooth) {
              setAudioOutputType('bluetooth');
            } else {
              setAudioOutputType('speaker');
            }
          }).catch(error => {
            console.log('Error checking initial headphone state:', error);
            // Fallback to not connected
            setIsHeadphoneConnected(false);
            setAudioOutputType('speaker');
          });

          // Set up listeners
          audioJackEventEmitter = new NativeEventEmitter(NativeModules.RNHeadphoneDetection);
          audioJackListener = audioJackEventEmitter.addListener('onChange', (data) => {
            console.log('Headphone state changed:', data);
            const connected = data.audioJack || data.bluetooth;
            setIsHeadphoneConnected(connected);
            
            if (data.audioJack) {
              setAudioOutputType('wired');
            } else if (data.bluetooth) {
              setAudioOutputType('bluetooth');
            } else {
              setAudioOutputType('speaker');
            }
          });
        }
      } catch (error) {
        console.log('Headphone detection module not available, using fallback:', error.message);
        
        // Fallback: Try using the audio session if available
        try {
          const AudioSession = require('react-native-audio-session').default;
          
          const checkAudioRoute = async () => {
            try {
              if (AudioSession && AudioSession.currentRoute) {
                const currentRoute = await AudioSession.currentRoute();
                console.log('Audio Route (fallback):', currentRoute);
                
                if (currentRoute && currentRoute.outputs) {
                  const hasHeadphones = currentRoute.outputs.some(output => {
                    const portType = (output.portType || '').toLowerCase();
                    return portType.includes('headphone') || 
                           portType.includes('headset') ||
                           portType.includes('bluetooth') ||
                           portType.includes('a2dp');
                  });
                  
                  setIsHeadphoneConnected(hasHeadphones);
                  
                  if (currentRoute.outputs.some(output => {
                    const portType = (output.portType || '').toLowerCase();
                    return portType.includes('headphone') || portType.includes('headset');
                  })) {
                    setAudioOutputType('wired');
                  } else if (currentRoute.outputs.some(output => {
                    const portType = (output.portType || '').toLowerCase();
                    return portType.includes('bluetooth') || portType.includes('a2dp');
                  })) {
                    setAudioOutputType('bluetooth');
                  } else {
                    setAudioOutputType('speaker');
                  }
                }
              }
            } catch (err) {
              console.log('Fallback audio route check failed:', err);
              // Default to no headphones
              setIsHeadphoneConnected(false);
              setAudioOutputType('speaker');
            }
          };
          
          // Initial check
          checkAudioRoute();
          
          // Poll for changes
          const interval = setInterval(checkAudioRoute, 3000);
          
          return () => clearInterval(interval);
        } catch (fallbackError) {
          console.log('No headphone detection available:', fallbackError.message);
          // Default to allowing access (no restriction)
          setIsHeadphoneConnected(true);
          setAudioOutputType('unknown');
        }
      }
    };

    initializeDetection();

    // Cleanup
    return () => {
      if (audioJackListener) {
        audioJackListener.remove();
      }
    };
  }, []);

  return {
    isHeadphoneConnected,
    audioOutputType, // 'wired', 'bluetooth', 'speaker', or 'unknown'
  };
};

export default useHeadphoneDetection;