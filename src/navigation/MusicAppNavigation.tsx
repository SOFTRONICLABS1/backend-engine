import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemeProvider } from '../theme/ThemeContext';
import { AuthProvider } from '../context/AuthContext';

// Import existing backend-engine screens
import { Home } from './screens/Home';
import { Settings } from './screens/Settings';
import { Tuneo } from './screens/Tuneo';
import { FlappyBird } from './screens/FlappyBird';
import { TestGameLauncher } from '../test/TestGameLauncher';

// Import mobile app components and screens
import SplashScreen from '../components/SplashScreen';
import WelcomeScreen from '../components/WelcomeScreen';
import AuthScreen from './screens/AuthScreen';
import ResponseScreen from './screens/ResponseScreen';
import WelcomeUserScreen from './screens/WelcomeUserScreen';
import UsernamePickerScreen from './screens/UsernamePickerScreen';
import PhoneVerificationScreen from './screens/PhoneVerificationScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import GameScreen from './screens/GameScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import MusicSettingsScreen from './screens/SettingsScreen';
import CreatePostScreen from './screens/CreatePostScreen';
import PostDetailScreen from './screens/PostDetailScreen';
import ContentViewerScreen from './screens/ContentViewerScreen';
import UserExploreScreen from './screens/UserExploreScreen';
import UserHomeScreen from './screens/UserHomeScreen';
import GamesScreen from './screens/GamesScreen';
import GamePayloadScreen from './screens/GamePayloadScreen';
import ProfileScreen from './screens/ProfileScreen';
import ExploreScreen from './screens/ExploreScreen';
import MusicHomeScreen from './screens/MusicHomeScreen';
import TabNavigator from './TabNavigator';

import Colors from '../Colors';
import { CloseButton } from '../components/CloseButton';
import { Platform } from 'react-native';

const Stack = createNativeStackNavigator();

export function MusicAppNavigation() {
  const [currentScreen, setCurrentScreen] = useState('backend_engine'); // Temporary: skip splash for debugging
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  useEffect(() => {
    // Configure Google Sign In
    GoogleSignin.configure({
      webClientId: '60455306259-ml12gn46kbaac5rmnsint4i88e0d7amj.apps.googleusercontent.com',
      iosClientId: '60455306259-c9erh3v8qcn6pvjcd45a4848siakqfrs.apps.googleusercontent.com',
      offlineAccess: true,
      scopes: ['profile', 'email'],
      forceCodeForRefreshToken: true, // Forces account picker on Android
    });

    // Firebase token service will be loaded on-demand during sign-in
    console.log('🔥 Firebase token service ready (on-demand loading)');
  }, []);

  // Check for existing authentication token
  const checkAuthStatus = async () => {
    try {
      setIsCheckingAuth(true);
      console.log('=================== Checking Authentication Status ===================');
      
      const token = await AsyncStorage.getItem('access_token');
      const userData = await AsyncStorage.getItem('user_data');
      
      console.log('🔑 Stored token exists:', !!token);
      
      if (token && userData) {
        const user = JSON.parse(userData);
        console.log('👤 Stored user data:', user);
        console.log('👤 Has username:', !!user.username);
        
        if (user.username && user.username !== null) {
          // User is authenticated and has complete profile - go to main app
          console.log('✅ User authenticated with complete profile - navigating to Music App');
          console.log('=================== Auth Check Completed - Authenticated ===================');
          setCurrentScreen('authenticated');
          return;
        } else {
          console.log('⚠️ User authenticated but missing username - clearing auth');
          // Clear incomplete auth data
          await AsyncStorage.removeItem('access_token');
          await AsyncStorage.removeItem('user_data');
        }
      }
      
      console.log('❌ No valid authentication found - showing backend engine home');
      console.log('=================== Auth Check Completed - Not Authenticated ===================');
      console.log('🔄 Setting currentScreen to: backend_engine');
      setCurrentScreen('backend_engine');
    } catch (error) {
      console.error('Error checking auth status:', error);
      setCurrentScreen('backend_engine');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Handle splash screen completion
  const handleSplashComplete = () => {
    console.log('🎬 Splash screen completed, checking auth status...');
    checkAuthStatus();
  };

  // Handle welcome screen completion
  const handleWelcomeComplete = () => {
    setCurrentScreen('navigation');
  };

  // Show splash screen
  console.log('🎯 Current screen state:', currentScreen, 'isCheckingAuth:', isCheckingAuth);
  
  if (currentScreen === 'splash') {
    return (
      <ThemeProvider>
        <AuthProvider>
          <StatusBar barStyle="light-content" />
          <SplashScreen onComplete={handleSplashComplete} />
        </AuthProvider>
      </ThemeProvider>
    );
  }

  // Show welcome screen when starting music app flow
  if (currentScreen === 'welcome') {
    return (
      <ThemeProvider>
        <AuthProvider>
          <StatusBar barStyle="light-content" />
          <WelcomeScreen onGetStarted={handleWelcomeComplete} />
        </AuthProvider>
      </ThemeProvider>
    );
  }

  // Show authenticated music app
  if (currentScreen === 'authenticated') {
    return (
      <ThemeProvider>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar barStyle="light-content" />
            <Stack.Navigator 
              screenOptions={{ 
                headerShown: false,
                animation: 'slide_from_right'
              }}
              initialRouteName="Tabs"
            >
              {/* Music App Screens */}
              <Stack.Screen name="Tabs" component={TabNavigator} />
              <Stack.Screen name="Auth" component={AuthScreen} />
              <Stack.Screen name="ResponseScreen" component={ResponseScreen} />
              <Stack.Screen name="WelcomeUser" component={WelcomeUserScreen} />
              <Stack.Screen name="UsernamePicker" component={UsernamePickerScreen} />
              <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />
              <Stack.Screen name="UserProfile" component={UserProfileScreen} />
              <Stack.Screen name="Game" component={GameScreen} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen name="MusicSettings" component={MusicSettingsScreen} />
              <Stack.Screen name="CreatePost" component={CreatePostScreen} />
              <Stack.Screen name="PostDetail" component={PostDetailScreen} />
              <Stack.Screen name="ContentViewer" component={ContentViewerScreen} options={{ headerShown: false }} />
              <Stack.Screen name="UserExplore" component={UserExploreScreen} options={{ headerShown: false }} />
              <Stack.Screen name="UserHome" component={UserHomeScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Games" component={GamesScreen} />
              <Stack.Screen name="GamePayload" component={GamePayloadScreen} />
              
              {/* Backend Engine Screens - accessible from authenticated state */}
              <Stack.Screen name="BackendHome" component={Home} />
              <Stack.Screen name="Tuneo" component={Tuneo} />
              <Stack.Screen name="FlappyBird" component={FlappyBird} />
              <Stack.Screen name="TestSDK" component={TestGameLauncher} />
              <Stack.Screen 
                name="Settings" 
                component={Settings} 
                options={() => ({
                  headerTitleStyle: { color: Colors.primary },
                  headerStyle: { backgroundColor: Colors.bgTitle },
                  headerTintColor: Colors.primary,
                  headerShadowVisible: false,
                  ...(Platform.OS === "ios"
                    ? { presentation: "fullScreenModal", headerRight: () => <CloseButton /> }
                    : {}),
                })}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </AuthProvider>
      </ThemeProvider>
    );
  }

  // Default: Show backend engine navigation flow
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar barStyle="light-content" />
          <Stack.Navigator 
            screenOptions={{ 
              headerShown: false,
              animation: 'slide_from_right'
            }}
            initialRouteName="BackendHome"
          >
            {/* Backend Engine Screens */}
            <Stack.Screen name="BackendHome" component={Home} />
            <Stack.Screen name="Tuneo" component={Tuneo} />
            <Stack.Screen name="FlappyBird" component={FlappyBird} />
            <Stack.Screen name="TestSDK" component={TestGameLauncher} />
            <Stack.Screen 
              name="Settings" 
              component={Settings} 
              options={() => ({
                headerTitleStyle: { color: Colors.primary },
                headerStyle: { backgroundColor: Colors.bgTitle },
                headerTintColor: Colors.primary,
                headerShadowVisible: false,
                ...(Platform.OS === "ios"
                  ? { presentation: "fullScreenModal", headerRight: () => <CloseButton /> }
                  : {}),
              })}
            />
            
            {/* Music App Authentication Flow - accessible from backend engine */}
            <Stack.Screen name="MusicAuth" component={AuthScreen} />
            <Stack.Screen name="ResponseScreen" component={ResponseScreen} />
            <Stack.Screen name="WelcomeUser" component={WelcomeUserScreen} />
            <Stack.Screen name="UsernamePicker" component={UsernamePickerScreen} />
            <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
            <Stack.Screen name="Game" component={GameScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="MusicSettings" component={MusicSettingsScreen} />
            <Stack.Screen name="CreatePost" component={CreatePostScreen} />
            <Stack.Screen name="PostDetail" component={PostDetailScreen} />
            <Stack.Screen name="ContentViewer" component={ContentViewerScreen} options={{ headerShown: false }} />
            <Stack.Screen name="UserExplore" component={UserExploreScreen} options={{ headerShown: false }} />
            <Stack.Screen name="UserHome" component={UserHomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Games" component={GamesScreen} />
            <Stack.Screen name="GamePayload" component={GamePayloadScreen} />
            
            {/* Music App Tabs - accessible from backend engine */}
            <Stack.Screen name="MusicTabs" component={TabNavigator} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Explore" component={ExploreScreen} />
            <Stack.Screen name="MusicHome" component={MusicHomeScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}