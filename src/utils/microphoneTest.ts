/**
 * Simple utility to test microphone reinitialization
 * This can be used to verify that the microphone system works correctly
 * after navigating between different screens
 */

import { reinitializeMicrophone, restartMicrophoneStream } from '../hooks/useGlobalMicrophoneManager';

export const testMicrophoneReinitialization = async (): Promise<boolean> => {
  console.log('🎤 Testing microphone reinitialization...');
  
  try {
    // Test reinitialize function
    const reinitResult = await reinitializeMicrophone();
    console.log('🎤 Reinitialize result:', reinitResult);
    
    if (reinitResult) {
      console.log('✅ Microphone reinitialization successful');
      return true;
    } else {
      console.log('⚠️ Microphone reinitialization failed, trying stream restart...');
      
      // Try restart stream as fallback
      const restartResult = await restartMicrophoneStream();
      console.log('🎤 Restart stream result:', restartResult);
      
      if (restartResult) {
        console.log('✅ Microphone stream restart successful');
        return true;
      } else {
        console.log('❌ Both reinitialize and restart failed');
        return false;
      }
    }
  } catch (error) {
    console.error('🎤 Error testing microphone reinitialization:', error);
    return false;
  }
};

export const logMicrophoneStatus = () => {
  console.log('🎤 Microphone Status Check:');
  console.log('- Call this function from any component to check microphone health');
  console.log('- Use testMicrophoneReinitialization() to verify functionality');
};