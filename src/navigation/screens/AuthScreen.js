import React from 'react';
import { View, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SignInForm } from '../../components/auth/SignInForm';
import { useTheme } from '../../theme/ThemeContext';

export default function AuthScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const handleGoogleSignInSuccess = (userInfo) => {
    // Check if we have database result (the new flow)
    const databaseData = userInfo.databaseResult;
    
    if (databaseData && databaseData.user) {
      // Use the database API response data
      const isNewUser = databaseData.is_new_user;
      const user = databaseData.user;
      const hasUsername = user && user.username && user.username !== null;
      
      if (isNewUser === false && hasUsername) {
        // Existing user with complete profile - go back to home
        console.log('✅ User authenticated with complete profile - navigating to Home');
        navigation.navigate('Home');
        return;
      } else {
        // New user or user without username - go to Welcome page
        navigation.navigate('WelcomeUser', { 
          userInfo: userInfo,
          isNewUser: isNewUser,
          user: user,
          accessToken: userInfo.access_token
        });
        return;
      }
    }
    
    // Fallback - shouldn't reach here with new flow
    navigation.navigate('WelcomeUser');
    
    console.log('🎉 Navigation completed!');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SignInForm onGoogleSignInSuccess={handleGoogleSignInSuccess} />
      </KeyboardAvoidingView>
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
});