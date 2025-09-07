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

interface MusicAppNavigationProps {
  onReady?: () => void;
}

export function MusicAppNavigation({ onReady }: MusicAppNavigationProps) {
  console.log('🎯 MusicAppNavigation starting...');

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

  // Direct navigation approach - no state management
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
            
            {/* Music App Tabs - After authentication */}
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
            <Stack.Screen name="MusicHome" component={MusicHomeScreen} />
            
            {/* Backend Engine Screens - Accessible from music app profile */}
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