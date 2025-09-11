import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  SafeAreaView, 
  Text, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { useTheme } from '../../theme/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  responsiveHeight, 
  responsiveWidth, 
  useResponsiveValues 
} from '../../utils/responsive';

export default function EditProfileScreen({ navigation, route }) {
  const { theme } = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const responsiveValues = useResponsiveValues(safeAreaInsets);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    phoneNumber: '',
    countryCode: '91'
  });
  
  // Validation state
  const [usernameStatus, setUsernameStatus] = useState({
    isChecking: false,
    isValid: null,
    message: ''
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchUserData();
  }, []);

  // Get access token on component mount
  useEffect(() => {
    const getAccessToken = async () => {
      const token = await AsyncStorage.getItem('access_token');
      setAccessToken(token);
    };
    getAccessToken();
  }, []);

  // Check if Save button should be enabled
  const isSaveButtonEnabled = () => {
    const hasValidUsername = usernameStatus.isValid === true || 
                            (formData.username === userData?.username && formData.username.length >= 3);
    const hasValidPhone = formData.phoneNumber.length === 10 || formData.phoneNumber.length === 0; // Allow empty phone
    
    return hasValidUsername && hasValidPhone && !usernameStatus.isChecking && !isSaving;
  };

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      
      // Get access token
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert('Authentication Error', 'Please sign in again.');
        navigation.goBack();
        return;
      }

      // Fetch user profile using new API
      const response = await fetch('https://24pw8gqd0i.execute-api.us-east-1.amazonaws.com/api/v1/auth/me', {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });

      const userProfile = await response.json();

      if (!response.ok) {
        throw new Error(userProfile.message || 'Failed to fetch user profile');
      }

      setUserData(userProfile);
      
      // Pre-populate form with current data
      setFormData({
        username: userProfile.username || '',
        bio: userProfile.bio || '',
        phoneNumber: userProfile.phone_number || '',
        countryCode: userProfile.country_code || '91'
      });
      
      // Set initial username status for current username
      if (userProfile.username) {
        setUsernameStatus({
          isChecking: false,
          isValid: true,
          message: 'Current username'
        });
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const validateUsername = async (username) => {
    if (!username || username.length < 3) {
      setUsernameStatus({
        isChecking: false,
        isValid: false,
        message: 'Username must be at least 3 characters'
      });
      return;
    }

    // Don't check if username hasn't changed
    if (username === userData?.username) {
      setUsernameStatus({
        isChecking: false,
        isValid: true,
        message: 'Current username'
      });
      return;
    }

    try {
      setUsernameStatus({ isChecking: true, isValid: null, message: 'Checking...' });
      
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('https://24pw8gqd0i.execute-api.us-east-1.amazonaws.com/api/v1/auth/check-username', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.available) {
        setUsernameStatus({
          isChecking: false,
          isValid: true,
          message: 'Username is available'
        });
      } else {
        setUsernameStatus({
          isChecking: false,
          isValid: false,
          message: data.message || 'Username is already taken'
        });
      }
    } catch (error) {
      console.error('Username check failed:', error);
      setUsernameStatus({
        isChecking: false,
        isValid: false,
        message: 'Failed to check username'
      });
    }
  };

  const handleUsernameChange = (text) => {
    setFormData(prev => ({ ...prev, username: text }));
    
    // Clear previous validation
    setUsernameStatus({ isChecking: false, isValid: null, message: '' });
    
    // Debounce username validation
    const timeoutId = setTimeout(() => {
      validateUsername(text);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const updateProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('https://24pw8gqd0i.execute-api.us-east-1.amazonaws.com/api/v1/auth/update-profile', {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bio: formData.bio,
          profile_image_url: "",
          instruments_taught: [],
          years_of_experience: 0,
          teaching_style: "",
          location: ""
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      return data;
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      setErrors({});

      // Validate form
      const newErrors = {};
      
      if (!formData.username || formData.username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters';
      }
      
      if (usernameStatus.isValid === false && formData.username !== userData?.username) {
        newErrors.username = usernameStatus.message;
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      const promises = [];
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert('Authentication Error', 'Please sign in again.');
        return;
      }

      // Update username if changed
      if (formData.username !== userData?.username && usernameStatus.isValid) {
        const usernamePromise = fetch('https://24pw8gqd0i.execute-api.us-east-1.amazonaws.com/api/v1/auth/update-username', {
          method: 'PUT',
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: formData.username
          })
        }).then(async (response) => {
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || 'Failed to update username');
          }
          return data;
        });
        promises.push(usernamePromise);
      }

      // Update bio if changed
      if (formData.bio !== userData?.bio) {
        console.log('🔄 Bio changed, calling update-profile API');
        console.log('📝 Old bio:', userData?.bio);
        console.log('📝 New bio:', formData.bio);
        promises.push(updateProfile());
      }

      // Update phone number if changed
      if (formData.phoneNumber !== userData?.phone_number || 
          formData.countryCode !== userData?.country_code) {
        const phonePromise = fetch('https://24pw8gqd0i.execute-api.us-east-1.amazonaws.com/api/v1/auth/update-phone', {
          method: 'PUT',
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone_number: formData.phoneNumber,
            country_code: formData.countryCode
          })
        }).then(async (response) => {
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || 'Failed to update phone number');
          }
          return data;
        });
        promises.push(phonePromise);
      }

      if (promises.length === 0) {
        Alert.alert('No Changes', 'No changes to save');
        return;
      }

      await Promise.all(promises);

      Alert.alert(
        'Success', 
        'Profile updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );

    } catch (error) {
      console.error('Failed to save changes:', error);
      Alert.alert(
        'Error', 
        error.message || 'Failed to update profile. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[
          styles.header, 
          { 
            backgroundColor: theme.surface,
            marginTop: Platform.OS === 'android' ? responsiveHeight(20) : 0,
          }
        ]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <IconSymbol name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Username Section */}
          <View style={[styles.section, styles.firstSection, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Username</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={[
                    styles.input, 
                    styles.inputWithRightIcon,
                    { 
                      backgroundColor: theme.background, 
                      borderColor: errors.username ? theme.error : theme.border,
                      color: theme.text 
                    }
                  ]}
                  value={formData.username}
                  onChangeText={handleUsernameChange}
                  placeholder="Enter username"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  maxLength={30}
                />
                
                {/* Status icon inside input */}
                <View style={styles.inputIcon}>
                  {usernameStatus.isChecking && (
                    <ActivityIndicator size="small" color={theme.primary} />
                  )}
                  {usernameStatus.isValid === true && !usernameStatus.isChecking && (
                    <View style={[styles.checkIcon, { backgroundColor: '#4CAF50' }]}>
                      <IconSymbol name="checkmark" size={12} color="white" />
                    </View>
                  )}
                  {usernameStatus.isValid === false && !usernameStatus.isChecking && (
                    <View style={[styles.checkIcon, { backgroundColor: theme.error || '#F44336' }]}>
                      <IconSymbol name="xmark" size={12} color="white" />
                    </View>
                  )}
                </View>
              </View>
              
              {/* Username validation status */}
              {usernameStatus.message && !usernameStatus.isChecking && (
                <Text style={[
                  styles.validationText, 
                  { 
                    color: usernameStatus.isValid ? theme.success || '#4CAF50' : theme.error || '#F44336'
                  }
                ]}>
                  {usernameStatus.message}
                </Text>
              )}
            </View>
            {errors.username && (
              <Text style={[styles.errorText, { color: theme.error }]}>{errors.username}</Text>
            )}
          </View>

          {/* Bio Section */}
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Bio</Text>
            <TextInput
              style={[
                styles.input, 
                styles.bioInput,
                { 
                  backgroundColor: theme.background, 
                  borderColor: theme.border,
                  color: theme.text 
                }
              ]}
              value={formData.bio}
              onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
              placeholder="Tell us about yourself..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={150}
            />
            <Text style={[styles.characterCount, { color: theme.textSecondary }]}>
              {formData.bio.length}/150
            </Text>
          </View>

          {/* Phone Number Section */}
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Phone Number</Text>
            <View style={styles.phoneContainer}>
              <View style={[styles.countryCodeContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.countryCodeText, { color: theme.text }]}>+{formData.countryCode}</Text>
              </View>
              <TextInput
                style={[
                  styles.input, 
                  styles.phoneInput,
                  { 
                    backgroundColor: theme.background, 
                    borderColor: formData.phoneNumber.length > 0 && formData.phoneNumber.length !== 10 ? theme.error : theme.border,
                    color: theme.text 
                  }
                ]}
                value={formData.phoneNumber}
                onChangeText={(text) => {
                  // Only allow numeric input
                  const numericText = text.replace(/[^0-9]/g, '');
                  setFormData(prev => ({ ...prev, phoneNumber: numericText }));
                }}
                placeholder="Enter 10-digit phone number"
                placeholderTextColor={theme.textSecondary}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            {formData.phoneNumber.length > 0 && formData.phoneNumber.length !== 10 && (
              <Text style={[styles.errorText, { color: theme.error }]}>
                Phone number must be exactly 10 digits
              </Text>
            )}
          </View>

          {/* Save Button */}
          <View style={styles.saveButtonContainer}>
            <TouchableOpacity 
              style={[
                styles.saveButton, 
                { 
                  backgroundColor: isSaveButtonEnabled() ? theme.primary : theme.textSecondary,
                  opacity: isSaving ? 0.7 : 1
                }
              ]}
              onPress={handleSaveChanges}
              disabled={!isSaveButtonEnabled()}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
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
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
  },
  firstSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 8,
  },
  inputWithIcon: {
    position: 'relative',
  },
  inputWithRightIcon: {
    paddingRight: 40,
  },
  inputIcon: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  bioInput: {
    minHeight: 80,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countryCodeContainer: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
  },
  validationText: {
    fontSize: 12,
    marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  saveButtonContainer: {
    padding: 16,
  },
  saveButton: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
});