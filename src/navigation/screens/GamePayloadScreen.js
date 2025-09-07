import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import contentService from '../../api/services/contentService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VoiceDetector from '../../components/VoiceDetector';

export default function GamePayloadScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { gameId, gameTitle, contentId, contentTitle } = route.params || {};

  const [userId, setUserId] = useState(null);
  const [notes, setNotes] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [speechResults, setSpeechResults] = useState([]);

  useEffect(() => {
    const loadPayloadData = async () => {
      try {
        setIsLoading(true);
        
        // Get userId from stored auth data
        const userDataString = await AsyncStorage.getItem('user_data');
        let userIdFromAuth = null;
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          userIdFromAuth = userData?.id || null;
        }
        setUserId(userIdFromAuth);

        // Get content details to extract notes
        if (contentId) {
          console.log('===== Fetching content details for notes =====');
          const contentDetails = await contentService.getContentDetails(contentId);
          console.log('===== Content details response:', JSON.stringify(contentDetails, null, 2), '=====');
          setNotes(contentDetails.notes_data || null);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error loading payload data:', err);
        setError('Failed to load payload data');
      } finally {
        setIsLoading(false);
      }
    };

    loadPayloadData();
  }, [contentId]);

  const formatNotes = (notesData) => {
    if (!notesData) return 'No notes available';
    
    try {
      return JSON.stringify(notesData, null, 2);
    } catch (e) {
      return 'Invalid notes format';
    }
  };

  // Speech handler functions
  const handleSpeechStart = () => {
    console.log('Speech started');
  };

  const handleSpeechEnd = () => {
    console.log('Speech ended');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading payload data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backIcon, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Game Payload</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Game Info */}
        <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Selected Game</Text>
          <Text style={[styles.gameTitle, { color: theme.primary }]}>{gameTitle}</Text>
          <Text style={[styles.contentTitle, { color: theme.textSecondary }]}>
            Content: {contentTitle}
          </Text>
        </View>

        {/* Voice Detection */}
        <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Voice Detection</Text>
          <VoiceDetector 
            onSpeechStart={handleSpeechStart}
            onSpeechEnd={handleSpeechEnd}
            onResults={(results) => setSpeechResults(results)}
            theme={theme}
          />
          {speechResults.length > 0 && (
            <View style={styles.speechResults}>
              <Text style={[styles.speechLabel, { color: theme.primary }]}>Speech Results:</Text>
              {speechResults.map((result, index) => (
                <Text key={index} style={[styles.speechResult, { color: theme.text }]}>
                  • {result}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Payload Display */}
        <View style={[styles.payloadCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Payload Data</Text>
          
          {error ? (
            <Text style={[styles.errorText, { color: 'red' }]}>{error}</Text>
          ) : (
            <View style={styles.payloadContent}>
              {/* User ID */}
              <View style={styles.payloadItem}>
                <Text style={[styles.payloadLabel, { color: theme.primary }]}>userId:</Text>
                <Text style={[styles.payloadValue, { color: theme.text }]}>
                  {userId || 'Not available'}
                </Text>
              </View>

              {/* Game ID */}
              <View style={styles.payloadItem}>
                <Text style={[styles.payloadLabel, { color: theme.primary }]}>gameId:</Text>
                <Text style={[styles.payloadValue, { color: theme.text }]}>
                  {gameId || 'Not available'}
                </Text>
              </View>

              {/* Notes */}
              <View style={styles.payloadItem}>
                <Text style={[styles.payloadLabel, { color: theme.primary }]}>notes:</Text>
                <ScrollView 
                  style={[styles.notesContainer, { backgroundColor: theme.background }]}
                  nestedScrollEnabled={true}
                >
                  <Text style={[styles.notesText, { color: theme.text }]}>
                    {formatNotes(notes)}
                  </Text>
                </ScrollView>
              </View>
            </View>
          )}
        </View>

        {/* Raw Payload JSON */}
        <View style={[styles.rawCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Raw JSON Payload</Text>
          <ScrollView 
            style={[styles.jsonContainer, { backgroundColor: theme.background }]}
            nestedScrollEnabled={true}
          >
            <Text style={[styles.jsonText, { color: theme.textSecondary }]}>
              {JSON.stringify({
                userId: userId,
                gameId: gameId,
                notes: notes
              }, null, 2)}
            </Text>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  payloadCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  rawCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  contentTitle: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
  payloadContent: {
    gap: 16,
  },
  payloadItem: {
    marginBottom: 12,
  },
  payloadLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  payloadValue: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  notesContainer: {
    maxHeight: 200,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  notesText: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  jsonContainer: {
    maxHeight: 300,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  jsonText: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  speechResults: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  speechLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  speechResult: {
    fontSize: 14,
    marginLeft: 8,
    marginBottom: 4,
  },
});