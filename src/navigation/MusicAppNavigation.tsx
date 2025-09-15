import React, { useState, useEffect } from 'react';
import { StatusBar, View, Text } from 'react-native';
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
// import { FlappyBird } from './screens/FlappyBird';
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
import FollowersScreen from './screens/FollowersScreen';
import FollowingScreen from './screens/FollowingScreen';
import SingleContentViewerScreen from './screens/SingleContentViewerScreen';
import TabNavigator from './TabNavigator';

import Colors from '../Colors';
import { CloseButton } from '../components/CloseButton';
import { Platform } from 'react-native';

const Stack = createNativeStackNavigator();

interface MusicAppNavigationProps {
  onReady?: () => void;
}

export function MusicAppNavigation({ onReady }: MusicAppNavigationProps) {
  console.log('🎯 MusicAppNavigation starting...');
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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
    
    // Check auth status immediately on app start
    checkAuthStatus();
  }, []);

  // Handle splash screen completion
  const handleSplashComplete = () => {
    setCurrentScreen('welcome');
  };

  // Handle welcome slides completion
  const handleWelcomeComplete = async () => {
    // Mark that user has seen welcome slides
    await AsyncStorage.setItem('hasSeenWelcome', 'true');
    setCurrentScreen('unauthenticated');
  };

  // Check for existing authentication token
  const checkAuthStatus = async () => {
    try {
      setIsCheckingAuth(true);
      console.log('=================== Checking Authentication Status ===================');
      
      const token = await AsyncStorage.getItem('access_token');
      const userData = await AsyncStorage.getItem('user_data');
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      
      console.log('🔑 Stored token exists:', !!token);
      console.log('🔄 Stored refresh token exists:', !!refreshToken);
      console.log('📄 Stored user data exists:', !!userData);
      
      // Debug: Show first 20 characters of token if it exists
      if (token) {
        console.log('🔍 Token preview:', token.substring(0, 20) + '...');
      }
      
      // Debug: Show full user data if it exists
      if (userData) {
        try {
          const user = JSON.parse(userData);
          console.log('👤 Full stored user data:', JSON.stringify(user, null, 2));
          console.log('👤 Username specifically:', user.username);
          console.log('👤 Username type:', typeof user.username);
          console.log('👤 Username is null:', user.username === null);
          console.log('👤 Username is undefined:', user.username === undefined);
          console.log('👤 Username truthy check:', !!user.username);
          
          if (user.username && user.username !== null && user.username !== 'null') {
            // User is authenticated and has complete profile - go to main app
            console.log('✅ User authenticated with complete profile - navigating to Tabs');
            console.log('=================== Auth Check Completed - Authenticated ===================');
            setCurrentScreen('authenticated');
            return;
          } else {
            console.log('⚠️ User authenticated but missing username - needs profile completion');
            setCurrentScreen('needsUsername');
            return;
          }
        } catch (parseError) {
          console.error('❌ Error parsing user data:', parseError);
          console.log('📄 Raw user data:', userData);
        }
      } else {
        console.log('📄 No user data found in storage');
      }
      
      if (token && !userData) {
        console.log('🔑 Token exists but no user data - clearing token');
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('refresh_token');
      }
      
      console.log('❌ No valid authentication found - checking if first time user');
      console.log('=================== Auth Check Completed - Not Authenticated ===================');
      
      // Check if user has seen welcome slides before
      const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome');
      if (hasSeenWelcome) {
        // Returning user - go directly to auth
        setCurrentScreen('unauthenticated');
      } else {
        // First time user - show splash and welcome screens
        setCurrentScreen('splash');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setCurrentScreen('unauthenticated');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Show splash screen first
  if (currentScreen === 'splash') {
    return (
      <ThemeProvider>
        <AuthProvider>
          <SplashScreen onComplete={handleSplashComplete} />
        </AuthProvider>
      </ThemeProvider>
    );
  }

  // Show welcome slides after splash
  if (currentScreen === 'welcome') {
    return (
      <ThemeProvider>
        <AuthProvider>
          <WelcomeScreen onGetStarted={handleWelcomeComplete} />
        </AuthProvider>
      </ThemeProvider>
    );
  }

  // Show loading while checking auth
  if (currentScreen === 'loading' || isCheckingAuth) {
    return (
      <ThemeProvider>
        <AuthProvider>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
            <StatusBar barStyle="light-content" />
            {/* Simple loading indicator */}
            <Text style={{ color: 'white', fontSize: 16 }}>Loading...</Text>
          </View>
        </AuthProvider>
      </ThemeProvider>
    );
  }

  // User is authenticated - show main app with Tabs as initial route
  if (currentScreen === 'authenticated') {
    return (
      <ThemeProvider>
        <AuthProvider>
          <NavigationContainer onReady={onReady}>
            <StatusBar barStyle="light-content" />
            <Stack.Navigator 
              screenOptions={{ 
                headerShown: false,
                animation: 'slide_from_right'
              }}
              initialRouteName="Tabs"
            >
              {/* Main App Screens */}
              <Stack.Screen name="Tabs" component={TabNavigator} />
              <Stack.Screen name="UserProfile" component={UserProfileScreen} />
              <Stack.Screen
                name="Game"
                component={GameScreen}
                options={{
                  animation: 'fade',
                  animationDuration: 200,
                  gestureEnabled: false
                }}
              />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen name="MusicSettings" component={MusicSettingsScreen} />
              <Stack.Screen name="CreatePost" component={CreatePostScreen} />
              <Stack.Screen name="PostDetail" component={PostDetailScreen} />
              <Stack.Screen name="ContentViewer" component={ContentViewerScreen} options={{ headerShown: false }} />
              <Stack.Screen name="UserExplore" component={UserExploreScreen} options={{ headerShown: false }} />
              <Stack.Screen name="UserHome" component={UserHomeScreen} options={{ headerShown: false }} />
              <Stack.Screen
                name="Games"
                component={GamesScreen}
                options={{
                  animation: 'fade',
                  animationDuration: 200
                }}
              />
              <Stack.Screen
                name="GamePayload"
                component={GamePayloadScreen}
                options={{
                  animation: 'fade',
                  animationDuration: 300
                }}
              />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Followers" component={FollowersScreen} />
              <Stack.Screen name="Following" component={FollowingScreen} />
              <Stack.Screen name="Explore" component={ExploreScreen} />
              <Stack.Screen name="SingleContentViewer" component={SingleContentViewerScreen} options={{ headerShown: false }} />
              <Stack.Screen name="MusicHome" component={MusicHomeScreen} />
              
              {/* Backend Engine Screens */}
              <Stack.Screen name="BackendHome" component={Home} />
              <Stack.Screen name="Tuneo" component={Tuneo} />
              {/* <Stack.Screen name="FlappyBird" component={FlappyBird} /> */}
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
              
              {/* Auth screens (accessible for re-auth if needed) */}
              <Stack.Screen name="Auth" component={AuthScreen} />
              <Stack.Screen name="ResponseScreen" component={ResponseScreen} />
              <Stack.Screen name="WelcomeUser" component={WelcomeUserScreen} />
              <Stack.Screen name="UsernamePicker" component={UsernamePickerScreen} />
              <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </AuthProvider>
      </ThemeProvider>
    );
  }

  // User needs to complete username
  if (currentScreen === 'needsUsername') {
    return (
      <ThemeProvider>
        <AuthProvider>
          <NavigationContainer onReady={onReady}>
            <StatusBar barStyle="light-content" />
            <Stack.Navigator 
              screenOptions={{ 
                headerShown: false,
                animation: 'slide_from_right'
              }}
              initialRouteName="UsernamePicker"
            >
              <Stack.Screen name="UsernamePicker" component={UsernamePickerScreen} />
              <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />
              <Stack.Screen name="Tabs" component={TabNavigator} />
              {/* Add other screens as needed */}
            </Stack.Navigator>
          </NavigationContainer>
        </AuthProvider>
      </ThemeProvider>
    );
  }

  // Default: show authentication flow
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer onReady={onReady}>
          <StatusBar barStyle="light-content" />
          <Stack.Navigator 
            screenOptions={{ 
              headerShown: false,
              animation: 'slide_from_right'
            }}
            initialRouteName="Auth"
          >
            {/* Music App Authentication Flow */}
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="ResponseScreen" component={ResponseScreen} />
            <Stack.Screen name="WelcomeUser" component={WelcomeUserScreen} />
            <Stack.Screen name="UsernamePicker" component={UsernamePickerScreen} />
            <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />
            
            {/* These screens accessible after auth */}
            <Stack.Screen name="Tabs" component={TabNavigator} />
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
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Explore" component={ExploreScreen} />
            <Stack.Screen name="SingleContentViewer" component={SingleContentViewerScreen} options={{ headerShown: false }} />
            <Stack.Screen name="MusicHome" component={MusicHomeScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}