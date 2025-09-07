import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  TextInput,
  ScrollView,
  Alert,
  Text,
  ActivityIndicator
} from 'react-native';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { useTheme } from '../../theme/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const countries = [
  { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧' },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦' },
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺' },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪' },
  { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷' },
  { name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳' },
  { name: 'Japan', code: 'JP', dialCode: '+81', flag: '🇯🇵' },
  { name: 'China', code: 'CN', dialCode: '+86', flag: '🇨🇳' },
  { name: 'Brazil', code: 'BR', dialCode: '+55', flag: '🇧🇷' },
];

export default function PhoneVerificationScreen({ navigation, route }) {
  const { theme } = useTheme();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(countries[6]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [accessToken, setAccessToken] = useState(null);

  // Get access token from params or storage
  React.useEffect(() => {
    const getAccessToken = async () => {
      const token = route?.params?.accessToken || await AsyncStorage.getItem('access_token');
      setAccessToken(token);
    };
    getAccessToken();
  }, []);

  const handlePhoneSubmit = async () => {
    if (phoneNumber.length !== 10) {
      Alert.alert('Invalid Phone', 'Please enter exactly 10 digits');
      return;
    }
    
    if (!accessToken) {
      Alert.alert('Authentication Error', 'Please sign in again.');
      return;
    }
    
    setIsUpdatingPhone(true);
    
    try {
      // Extract country code without the + sign
      const countryCode = selectedCountry.dialCode.replace('+', '');
      
      // Update phone number via API endpoint with Bearer token
      const response = await fetch('https://24pw8gqd0i.execute-api.us-east-1.amazonaws.com/api/v1/auth/update-phone', {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          country_code: countryCode
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Phone number updated successfully:', `${selectedCountry.dialCode}${phoneNumber}`);
        
        // Update stored user data
        const userData = await AsyncStorage.getItem('user_data');
        if (userData) {
          const user = JSON.parse(userData);
          user.phone_number = phoneNumber;
          user.country_code = countryCode;
          await AsyncStorage.setItem('user_data', JSON.stringify(user));
        }
        
        // Navigate to main app
        navigation.navigate('Tabs');
      } else {
        throw new Error(data.message || 'Failed to update phone number');
      }
    } catch (error) {
      console.error('Failed to update phone number:', error);
      Alert.alert(
        'Update Failed',
        error.message || 'Failed to update phone number. Please try again.',
        [
          { text: 'OK', onPress: () => setIsUpdatingPhone(false) }
        ]
      );
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setShowCountryPicker(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <IconSymbol name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>
        
        {/* Progress Indicator - Below Back Button */}
        <View style={styles.progressSection}>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>Step 3 of 3</Text>
          <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
            <View style={[styles.progressFill, { width: '100%', backgroundColor: theme.primary }]} />
          </View>
        </View>

        {/* Main Content */}
        <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <View style={[styles.iconContainer, { backgroundColor: theme.surface, shadowColor: theme.primary }]}>
              <IconSymbol name="phone.fill" size={60} color={theme.primary} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>
              Verify your phone
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Add your phone number to secure your account and connect with friends
            </Text>
          </View>

          {/* Phone Input */}
          <View style={styles.phoneSection}>
            <View style={[styles.phoneInputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity 
                style={[styles.countrySelector, { borderRightColor: theme.border }]}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                <Text style={[styles.countryCodeText, { color: theme.text }]}>{selectedCountry.dialCode}</Text>
                <IconSymbol name="chevron.down" size={16} color={theme.primary} />
              </TouchableOpacity>
              <TextInput
                style={[styles.phoneInput, { color: theme.text }]}
                placeholder="Phone number (10 digits)"
                placeholderTextColor={theme.textSecondary}
                value={phoneNumber}
                onChangeText={(text) => {
                  // Only allow numeric characters and limit to 10 digits
                  const numericText = text.replace(/[^0-9]/g, '');
                  if (numericText.length <= 10) {
                    setPhoneNumber(numericText);
                  }
                }}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
            <TouchableOpacity 
              style={[
                styles.sendButton,
                { backgroundColor: (phoneNumber.length !== 10 || isUpdatingPhone) ? theme.border : theme.primary }
              ]} 
              onPress={handlePhoneSubmit}
              disabled={phoneNumber.length !== 10 || isUpdatingPhone}
            >
              {isUpdatingPhone ? (
                <ActivityIndicator size="small" color={theme.textSecondary} />
              ) : (
                <>
                  <Text style={[
                    styles.sendButtonText,
                    { color: phoneNumber.length !== 10 ? theme.textSecondary : 'white' }
                  ]}>
                    Continue
                  </Text>
                  <IconSymbol 
                    name="arrow.right" 
                    size={20} 
                    color={phoneNumber.length !== 10 ? theme.textSecondary : "white"} 
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Country Picker Modal */}
        {showCountryPicker && (
          <View style={styles.modalOverlay}>
            <View style={[styles.countryPickerModal, { backgroundColor: theme.surface }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Select Country</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowCountryPicker(false)}
                >
                  <IconSymbol name="xmark" size={24} color={theme.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.countryList}>
                {countries.map((country) => (
                  <TouchableOpacity
                    key={country.code}
                    style={[
                      styles.countryItem,
                      selectedCountry.code === country.code ? { backgroundColor: theme.primary + '20' } : null
                    ]}
                    onPress={() => handleCountrySelect(country)}
                  >
                    <Text style={styles.countryFlag}>{country.flag}</Text>
                    <Text style={[styles.countryName, { color: theme.text }]}>{country.name}</Text>
                    <Text style={[styles.countryDialCode, { color: theme.text }]}>{country.dialCode}</Text>
                    {selectedCountry.code === country.code && (
                      <IconSymbol name="checkmark" size={20} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  phoneSection: {
    marginBottom: 30,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 16,
    marginBottom: 20,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRightWidth: 1,
    gap: 8,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    gap: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  progressSection: {
    alignItems: 'center',
    marginBottom: 20,
    marginHorizontal: 24,
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryPickerModal: {
    borderRadius: 20,
    width: '85%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  countryList: {
    maxHeight: 400,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  countryDialCode: {
    fontSize: 16,
    fontWeight: '600',
  },
});