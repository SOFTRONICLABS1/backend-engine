import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { PermissionsAndroid } from 'react-native';
import Voice from '@react-native-voice/voice';

const VoiceDetector = ({ onSpeechStart, onSpeechEnd, onResults, theme }) => {
  const [isListening, setIsListening] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [partialResults, setPartialResults] = useState([]);

  useEffect(() => {
    checkMicrophonePermission();
    
    // Set up voice recognition event listeners
    Voice.onSpeechStart = onSpeechStartEvent;
    Voice.onSpeechEnd = onSpeechEndEvent;
    Voice.onSpeechResults = onSpeechResultsEvent;
    Voice.onSpeechPartialResults = onSpeechPartialResultsEvent;
    Voice.onSpeechError = onSpeechErrorEvent;
    Voice.onSpeechVolumeChanged = onVolumeChangeEvent;

    return () => {
      // Clean up voice recognition
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const checkMicrophonePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        setHasPermission(granted);
      } catch (err) {
        console.warn(err);
        setHasPermission(false);
      }
    } else {
      // For iOS, assume permission is granted for now
      setHasPermission(true);
    }
  };

  const requestMicrophonePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone for voice detection.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        setHasPermission(hasPermission);
        return hasPermission;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS
  };

  // Voice recognition event handlers
  const onSpeechStartEvent = () => {
    setIsListening(true);
    if (onSpeechStart) onSpeechStart();
  };

  const onSpeechEndEvent = () => {
    setIsListening(false);
    if (onSpeechEnd) onSpeechEnd();
  };

  const onSpeechResultsEvent = (e) => {
    if (onResults && e.value) {
      onResults(e.value);
    }
    setPartialResults([]);
  };

  const onSpeechPartialResultsEvent = (e) => {
    if (e.value) {
      setPartialResults(e.value);
    }
  };

  const onVolumeChangeEvent = (e) => {
    // Optional: You can use this to show volume level visualization
    // console.log('Volume:', e.value);
  };

  const onSpeechErrorEvent = (e) => {
    console.error('Speech recognition error:', e.error);
    setIsListening(false);
    
    // Only show alert for critical errors, not timeout/no speech
    if (e.error?.code !== 'recognition_fail' && e.error?.code !== 'no_speech') {
      Alert.alert('Speech Recognition Error', e.error?.message || 'Unknown error occurred');
    }
  };

  const startListening = async () => {
    if (!hasPermission) {
      const permissionGranted = await requestMicrophonePermission();
      if (!permissionGranted) {
        Alert.alert(
          'Permission Required',
          'Microphone permission is required for voice detection.'
        );
        return;
      }
    }

    try {
      await Voice.start('en-US');
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      Alert.alert('Error', 'Failed to start voice recognition');
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      setPartialResults([]);
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.micButton,
          {
            backgroundColor: isListening 
              ? (theme?.error || '#ff4444') 
              : (theme?.primary || '#007AFF')
          }
        ]}
        onPress={isListening ? stopListening : startListening}
        disabled={!hasPermission && Platform.OS === 'android'}
      >
        <Text style={[styles.micButtonText, { color: theme?.buttonText || '#FFFFFF' }]}>
          {isListening ? '🛑 Stop' : '🎤 Start Voice'}
        </Text>
      </TouchableOpacity>
      
      {isListening && (
        <View style={styles.listeningContainer}>
          <Text style={[styles.listeningText, { color: theme?.text || '#000000' }]}>
            🎙️ Listening... Speak now!
          </Text>
          {partialResults.length > 0 && (
            <Text style={[styles.partialText, { color: theme?.textSecondary || '#666666' }]}>
              {partialResults[0]}
            </Text>
          )}
        </View>
      )}
      
      {!hasPermission && Platform.OS === 'android' && (
        <Text style={[styles.permissionText, { color: theme?.error || '#ff4444' }]}>
          Microphone permission required
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  micButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 150,
    alignItems: 'center',
  },
  micButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  listeningContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  listeningText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  partialText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  permissionText: {
    marginTop: 10,
    fontSize: 12,
    textAlign: 'center',
  },
});

export default VoiceDetector;