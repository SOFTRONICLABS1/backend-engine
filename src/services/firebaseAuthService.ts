/**
 * Firebase Authentication Service
 * Handles Firebase token generation similar to the HTML reference
 */

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { Platform } from 'react-native';

interface GoogleCredential {
  providerId: string;
  token: string;
  secret?: string;
}

interface FirebaseAuthResult {
  firebaseUser: FirebaseAuthTypes.User;
  firebaseIdToken: string;
  googleCredential: GoogleCredential;
  platform: string;
  additionalUserInfo: FirebaseAuthTypes.AdditionalUserInfo | null;
  timestamp: string;
}

interface APITestResult {
  status: number;
  data: any;
  platform: string;
  timestamp: string;
}

class FirebaseAuthService {
  private currentUser: FirebaseAuthTypes.User | null = null;
  private currentFirebaseIdToken: string | null = null;

  /**
   * Initialize Firebase Auth service
   */
  init(): void {
    console.log('🔥 Initializing Firebase Auth Service...');
    
    // Listen to authentication state changes
    auth().onAuthStateChanged((user) => {
      this.currentUser = user;
      if (user) {
        console.log('🔥 Firebase Auth State: User signed in -', user.email);
      } else {
        console.log('🔥 Firebase Auth State: User signed out');
        this.currentFirebaseIdToken = null;
      }
    });
  }

  /**
   * Sign in with Google and get Firebase ID token
   * This mimics the strategy from firebase-test.html
   */
  async signInWithGoogle(googleUserInfo: any): Promise<FirebaseAuthResult> {
    try {
      console.log('=================== Starting Firebase Google Sign In ===================');
      console.log('🔥 Firebase service instance exists:', !!this);
      console.log('🔥 Auth function exists:', !!auth);
      console.log('🔥 Input Google User Info:', JSON.stringify({
        user: googleUserInfo?.user || googleUserInfo?.data?.user,
        idToken: !!googleUserInfo?.idToken || !!googleUserInfo?.data?.idToken
      }, null, 2));

      // Extract Google ID token from the user info
      const googleIdToken = googleUserInfo?.idToken || googleUserInfo?.data?.idToken;
      
      if (!googleIdToken) {
        throw new Error('Google ID token not found in user info');
      }

      console.log('🔥 Google ID Token (first 50 chars):', googleIdToken.substring(0, 50) + '...');

      // Create a Google credential using the Google ID token
      const googleCredential = auth.GoogleAuthProvider.credential(googleIdToken);
      
      console.log('🔥 Created Google credential for Firebase');

      // Sign in to Firebase using the Google credential
      const firebaseUserCredential = await auth().signInWithCredential(googleCredential);
      
      console.log('🔥 Firebase sign-in successful!');
      console.log('🔥 Firebase User:', {
        uid: firebaseUserCredential.user.uid,
        email: firebaseUserCredential.user.email,
        displayName: firebaseUserCredential.user.displayName,
        photoURL: firebaseUserCredential.user.photoURL
      });

      // Get Firebase ID token (this is what we need for backend API)
      const firebaseIdToken = await firebaseUserCredential.user.getIdToken(true);
      
      this.currentFirebaseIdToken = firebaseIdToken;
      this.currentUser = firebaseUserCredential.user;

      console.log('🔥🔥🔥 FIREBASE ID TOKEN GENERATED (RAW RESPONSE) 🔥🔥🔥');
      console.log('Platform:', Platform.OS);
      console.log('Firebase ID Token Length:', firebaseIdToken.length);
      console.log('Firebase ID Token (first 100 chars):', firebaseIdToken.substring(0, 100) + '...');
      console.log('Firebase ID Token (last 50 chars):', '...' + firebaseIdToken.slice(-50));
      console.log('🔥🔥🔥 END FIREBASE TOKEN RAW RESPONSE 🔥🔥🔥');

      const result: FirebaseAuthResult = {
        firebaseUser: firebaseUserCredential.user,
        firebaseIdToken: firebaseIdToken,
        googleCredential: googleCredential as GoogleCredential,
        platform: Platform.OS,
        additionalUserInfo: firebaseUserCredential.additionalUserInfo,
        timestamp: new Date().toISOString()
      };

      console.log('🔥 Complete Firebase Auth Result:', JSON.stringify({
        ...result,
        firebaseIdToken: firebaseIdToken.substring(0, 50) + '...' // Truncate for logging
      }, null, 2));

      console.log('=================== Firebase Google Sign In Completed ===================');
      
      return result;

    } catch (error) {
      console.log('=================== Firebase Google Sign In Failed ===================');
      console.error('🔥 Firebase Auth Error:', error);
      console.error('🔥 Error Code:', (error as any).code);
      console.error('🔥 Error Message:', (error as any).message);
      console.log('=================================================================');
      
      throw error;
    }
  }

  /**
   * Get current Firebase ID token
   */
  async getCurrentFirebaseIdToken(forceRefresh: boolean = false): Promise<string | null> {
    try {
      if (this.currentUser) {
        const token = await this.currentUser.getIdToken(forceRefresh);
        this.currentFirebaseIdToken = token;
        
        console.log('🔥 Retrieved current Firebase ID token');
        console.log('🔥 Token length:', token.length);
        console.log('🔥 Platform:', Platform.OS);
        
        return token;
      } else {
        console.log('🔥 No current Firebase user');
        return null;
      }
    } catch (error) {
      console.error('🔥 Error getting Firebase ID token:', error);
      throw error;
    }
  }

  /**
   * Test API call with Firebase ID token (similar to HTML testAPI function)
   */
  async testFirebaseTokenWithAPI(additionalDetails: Record<string, any> = {}): Promise<APITestResult> {
    try {
      if (!this.currentFirebaseIdToken) {
        throw new Error('No Firebase ID token available. Please sign in first.');
      }

      console.log('🔥 Testing Firebase token with backend API...');
      console.log('🔥 Using token:', this.currentFirebaseIdToken.substring(0, 50) + '...');

      const requestBody = {
        id_token: this.currentFirebaseIdToken,
        additional_details: {
          device_type: 'mobile',
          platform: Platform.OS,
          test_user: true,
          ...additionalDetails
        }
      };

      console.log('🔥 API Request Body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch('https://24pw8gqd0i.execute-api.us-east-1.amazonaws.com/api/v1/auth/sso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json();

      console.log('🔥🔥🔥 FIREBASE TOKEN API TEST RESULT 🔥🔥🔥');
      console.log('Status:', response.status);
      console.log('Platform:', Platform.OS);
      console.log('Response Data:', JSON.stringify(responseData, null, 2));
      console.log('🔥🔥🔥 END API TEST RESULT 🔥🔥🔥');

      return {
        status: response.status,
        data: responseData,
        platform: Platform.OS,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('🔥 Firebase token API test failed:', error);
      throw error;
    }
  }

  /**
   * Sign out from Firebase
   */
  async signOut(): Promise<void> {
    try {
      console.log('🔥 Signing out from Firebase...');
      await auth().signOut();
      this.currentUser = null;
      this.currentFirebaseIdToken = null;
      console.log('🔥 Firebase sign out completed');
    } catch (error) {
      console.error('🔥 Firebase sign out failed:', error);
      throw error;
    }
  }
}

export default new FirebaseAuthService();