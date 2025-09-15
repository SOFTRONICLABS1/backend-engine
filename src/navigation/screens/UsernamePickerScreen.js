import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Text,
  ActivityIndicator,
  Platform
} from 'react-native';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { useTheme } from '../../theme/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function UsernamePickerScreen({ navigation, route }) {
  const { theme } = useTheme();
  const [username, setUsername] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [checkedSuggestions, setCheckedSuggestions] = useState([]);
  const [isUsernameValid, setIsUsernameValid] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const debounceTimer = useRef(null);

  // Get user data from navigation params or storage
  const userInfo = route?.params?.userInfo || {};
  const user = route?.params?.user || userInfo.user || {};
  const userEmail = user.email || 'user@example.com';
  const userEmailPrefix = userEmail.split('@')[0];

  // Get user's name for suggestions
  const userName = user.name || user.displayName || userEmailPrefix;
  const userFirstName = userName.split(' ')[0].toLowerCase();
  const userLastName = userName.split(' ')[1]?.toLowerCase() || '';
  const userFullNameClean = userName.replace(/\s+/g, '').toLowerCase();

  // Check availability of username suggestions
  const checkSuggestionsAvailability = useCallback(async (token) => {
    // Generate more unique suggestions
    const allSuggestions = [
      userFirstName,
      userFullNameClean,
      userLastName ? `${userFirstName}.${userLastName}` : `${userFirstName}.music`,
      userLastName ? `${userFirstName}_${userLastName}` : `${userFirstName}_beats`,
      `${userFirstName}.123`,
      `${userFirstName}.456`,
      `music_${userFirstName}`,
      `${userFirstName}_player`,
      `beat.${userFirstName}`,
      `${userFirstName}_official`,
      `the_${userFirstName}`,
      `${userFirstName}.sound`,
      `${userFirstName}_vibes`,
      `${userFirstName}.pro`,
      userLastName ? `${userLastName}.${userFirstName}` : `${userFirstName}_music`,
    ];

    // Remove duplicates and filter valid suggestions
    const baseSuggestions = [...new Set(allSuggestions)].filter(suggestion =>
      suggestion && suggestion.length >= 3 && suggestion !== userFirstName + userFirstName
    );

    const availableSuggestions = [];

    for (const suggestion of baseSuggestions) {
      try {
        const response = await fetch('https://24pw8gqd0i.execute-api.us-east-1.amazonaws.com/api/v1/auth/check-username', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: suggestion
          })
        });

        const data = await response.json();
        if (data.available) {
          availableSuggestions.push(suggestion);
        }
      } catch (error) {
        console.error('Failed to check suggestion:', suggestion, error);
      }

      // Stop after finding 5 available suggestions
      if (availableSuggestions.length >= 5) {
        break;
      }
    }

    setCheckedSuggestions(availableSuggestions);
  }, [userFirstName, userFullNameClean, userLastName]);

  useEffect(() => {
    // Get access token from params or storage
    const getAccessToken = async () => {
      const token = route?.params?.accessToken || await AsyncStorage.getItem('access_token');
      setAccessToken(token);

      // Once we have the token, check username suggestions
      if (token) {
        checkSuggestionsAvailability(token);
      }
    };
    getAccessToken();
  }, [checkSuggestionsAvailability]);

  // Debounced username availability check
  const checkUsernameAvailability = useCallback(async (usernameToCheck) => {
    if (!usernameToCheck || usernameToCheck.length < 3 || !accessToken) {
      setIsUsernameAvailable(null);
      return;
    }

    setIsCheckingUsername(true);
    setUsernameError('');
    
    try {
      const response = await fetch('https://24pw8gqd0i.execute-api.us-east-1.amazonaws.com/api/v1/auth/check-username', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: usernameToCheck
        })
      });
      
      const data = await response.json();
      setIsUsernameAvailable(data.available);
      
      if (!data.available) {
        setUsernameError(data.message || 'Username is not available');
      }
    } catch (error) {
      console.error('Failed to check username:', error);
      setUsernameError('Failed to check username availability');
      setIsUsernameAvailable(null);
    } finally {
      setIsCheckingUsername(false);
    }
  }, [accessToken]);

  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Basic validation - allow dots in the middle but not at the end
    const isValid = username.length >= 3 &&
      /^[a-zA-Z0-9_][a-zA-Z0-9_.]*[a-zA-Z0-9_]$/.test(username) &&
      !username.endsWith('.');
    setIsUsernameValid(isValid);
    
    if (!isValid) {
      setIsUsernameAvailable(null);
      if (username.length > 0 && username.length < 3) {
        setUsernameError('Username must be at least 3 characters');
      } else if (username.length > 0 && (
        !/^[a-zA-Z0-9_][a-zA-Z0-9_.]*[a-zA-Z0-9_]$/.test(username) || username.endsWith('.')
      )) {
        setUsernameError('Username can only contain letters, numbers, underscores, and dots (dots cannot be at the end)');
      } else {
        setUsernameError('');
      }
      return;
    }

    // Set up debounced API call (500ms delay)
    debounceTimer.current = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 500);

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [username, checkUsernameAvailability]);

  const handleSuggestionPress = (suggestion) => {
    setUsername(suggestion);
    // The useEffect will automatically trigger the availability check
  };

  const handleContinue = async () => {
    if (!isUsernameValid || !isUsernameAvailable) {
      Alert.alert(
        'Username Not Available', 
        isUsernameAvailable === false 
          ? 'This username is already taken. Please choose another one.'
          : 'Please enter a valid and available username.'
      );
      return;
    }
    
    setIsUpdatingUsername(true);
    
    try {
      // Update username via API endpoint with Bearer token
      const response = await fetch('https://24pw8gqd0i.execute-api.us-east-1.amazonaws.com/api/v1/auth/update-username', {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Username updated successfully:', username);
        
        // Update stored user data
        const userData = await AsyncStorage.getItem('user_data');
        if (userData) {
          const user = JSON.parse(userData);
          user.username = username;
          await AsyncStorage.setItem('user_data', JSON.stringify(user));
        }
        
        // Navigate to next screen
        navigation.navigate('PhoneVerification', {
          accessToken: accessToken
        });
      } else {
        throw new Error(data.message || 'Failed to update username');
      }
      
    } catch (error) {
      console.error('Failed to update username:', error);
      Alert.alert(
        'Update Failed',
        error.message || 'Failed to update username. Please try again.',
        [
          { text: 'OK', onPress: () => setIsUpdatingUsername(false) }
        ]
      );
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        {/* Header - No back button */}
        <View style={styles.header}>
        </View>
        
        {/* Progress Indicator - Below Back Button */}
        <View style={styles.progressSection}>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>Step 2 of 3</Text>
          <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
            <View style={[styles.progressFill, { width: '66%', backgroundColor: theme.primary }]} />
          </View>
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Enhanced Title Section */}
          <View style={styles.titleSection}>
          <View style={[styles.iconContainer, { backgroundColor: theme.surface, shadowColor: theme.primary }]}>
            <IconSymbol name="person.badge.plus" size={80} color={theme.primary} />
          </View>
          
          {/* Decorative elements */}
          <View style={styles.decorativeElements}>
            <View style={[styles.decorativeCircle, styles.circle1, { backgroundColor: theme.primary + '20', shadowColor: theme.primary }]}>
              <IconSymbol name="at" size={20} color={theme.primary} />
            </View>
            <View style={[styles.decorativeCircle, styles.circle2, { backgroundColor: theme.primary + '20', shadowColor: theme.primary }]}>
              <IconSymbol name="person.fill" size={18} color={theme.primary} />
            </View>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Pick your username</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Your username is how other musicians will find and connect with you
          </Text>
        </View>

        {/* Username Input Section */}
        <View style={styles.inputSection}>
          <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <IconSymbol name="at" size={20} color={theme.primary} />
            <TextInput
              style={[styles.usernameInput, { color: theme.text }]}
              placeholder="Enter your username"
              placeholderTextColor={theme.textSecondary}
              
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
            {username.length > 0 && (
              isCheckingUsername ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <IconSymbol 
                  name={
                    isUsernameAvailable === true 
                      ? "checkmark.circle.fill" 
                      : isUsernameAvailable === false 
                        ? "xmark.circle.fill"
                        : isUsernameValid 
                          ? "checkmark.circle" 
                          : "exclamationmark.circle.fill"
                  } 
                  size={20} 
                  color={
                    isUsernameAvailable === true 
                      ? theme.success || '#4CAF50' 
                      : (isUsernameAvailable === false || !isUsernameValid)
                        ? theme.error || '#F44336'
                        : theme.textSecondary
                  } 
                />
              )
            )}
          </View>
          
          {username.length > 0 && (
            <View style={styles.usernameStatus}>
              <Text style={[
                styles.statusText,
                { 
                  color: isUsernameAvailable === true 
                    ? (theme.success || '#4CAF50') 
                    : (isUsernameAvailable === false || usernameError) 
                      ? (theme.error || '#F44336')
                      : theme.textSecondary
                }
              ]}>
                {isCheckingUsername 
                  ? 'Checking availability...'
                  : isUsernameAvailable === true 
                    ? '✓ Username is available!'
                    : isUsernameAvailable === false
                      ? '✗ Username is already taken'
                      : usernameError || (isUsernameValid ? 'Checking...' : '⚠ Username must be 3+ characters, letters, numbers, and underscores only')
                }
              </Text>
            </View>
          )}
        </View>

        {/* Professional Suggestions Section - Only show if we have checked suggestions */}
        {checkedSuggestions.length > 0 && (
          <View style={[styles.suggestionsSection, { backgroundColor: theme.surface }]}>
            <View style={styles.suggestionsHeader}>
              <IconSymbol name="lightbulb.fill" size={20} color={theme.primary} />
              <Text style={[styles.suggestionsTitle, { color: theme.text }]}>Available usernames</Text>
            </View>
            <Text style={[styles.suggestionsSubtitle, { color: theme.textSecondary }]}>
              These usernames are available - tap to use
            </Text>
            <View style={styles.suggestionsGrid}>
              {checkedSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.suggestionChip,
                  { backgroundColor: username === suggestion ? theme.primary : theme.background, borderColor: theme.border },
                  username === suggestion ? { borderColor: theme.primary } : null
                ]}
                onPress={() => handleSuggestionPress(suggestion)}
              >
                <Text style={[
                  styles.suggestionText,
                  { color: username === suggestion ? 'white' : theme.text }
                ]}>
                  @{suggestion}
                </Text>
                {username === suggestion && (
                  <IconSymbol name="checkmark" size={12} color="white" />
                )}
              </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        </ScrollView>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <TouchableOpacity 
            style={[
              styles.continueButton,
              { backgroundColor: (!isUsernameValid || !isUsernameAvailable || isCheckingUsername || isUpdatingUsername) ? theme.border : theme.primary }
            ]} 
            onPress={handleContinue}
            disabled={!isUsernameValid || !isUsernameAvailable || isCheckingUsername || isUpdatingUsername}
          >
            {isUpdatingUsername ? (
              <ActivityIndicator size="small" color={theme.textSecondary} />
            ) : (
              <>
                <Text style={[
                  styles.continueButtonText,
                  { color: (!isUsernameValid || !isUsernameAvailable || isCheckingUsername) ? theme.textSecondary : 'white' }
                ]}>
                  Continue
                </Text>
                <IconSymbol 
                  name="arrow.right" 
                  size={20} 
                  color={(!isUsernameValid || !isUsernameAvailable || isCheckingUsername) ? theme.textSecondary : "white"} 
                />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  titleSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 10,
    marginBottom: 20,
    position: 'relative',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  decorativeElements: {
    position: 'absolute',
    width: '100%',
    height: '60%',
    top: 20,
  },
  decorativeCircle: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  circle1: {
    top: '30%',
    right: '10%',
  },
  circle2: {
    bottom: '25%',
    left: '5%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  inputSection: {
    paddingHorizontal: 24,
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 4,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  usernameInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    fontWeight: '500',
  },
  usernameStatus: {
    marginTop: 12,
    paddingHorizontal: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  suggestionsSection: {
    marginBottom: 20,
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  suggestionsSubtitle: {
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '500',
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 30,
    paddingTop: 10,
    backgroundColor: 'transparent',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  progressSection: {
    alignItems: 'center',
    marginBottom: 20,
    marginHorizontal: 24,
    marginTop: Platform.OS === 'android' ? 10 : 0,
  },
  progressText: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});