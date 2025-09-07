/**
 * Direct Firebase Token Service
 * Uses Firebase REST API directly like the HTML reference
 * No React Native Firebase dependency needed
 */

import { Platform } from 'react-native';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

interface FirebaseTokenResult {
  firebaseIdToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  displayName: string;
  photoUrl: string;
  providerId: string;
  platform: string;
  timestamp: string;
  rawResponse: any;
}

interface APITestResult {
  status: number;
  data: any;
  platform: string;
  timestamp: string;
}

class FirebaseTokenService {
  private firebaseConfig: FirebaseConfig;

  constructor() {
    this.firebaseConfig = {
      apiKey: "AIzaSyCPAPOy37WNjDYQWfijKZNu8MGp3o5h714",
      authDomain: "signin-60f32.firebaseapp.com",
      projectId: "signin-60f32",
      storageBucket: "signin-60f32.firebasestorage.app",
      messagingSenderId: "60455306259",
      appId: "1:60455306259:web:YOUR_WEB_APP_ID"
    };
  }

  /**
   * Exchange Google ID token for Firebase ID token using REST API
   * This mimics exactly what your HTML file does
   */
  async exchangeGoogleTokenForFirebaseToken(googleIdToken: string): Promise<FirebaseTokenResult> {
    try {
      // Use Firebase REST API to sign in with Google credential
      // This is the same approach as your HTML file but using fetch instead of Firebase SDK
      const firebaseAuthUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${this.firebaseConfig.apiKey}`;
      
      const requestBody = {
        postBody: `id_token=${googleIdToken}&providerId=google.com`,
        requestUri: 'http://localhost',
        returnIdpCredential: true,
        returnSecureToken: true
      };

      console.log('API:', firebaseAuthUrl);
      console.log('Payload:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(firebaseAuthUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(`Firebase Auth API error: ${responseData.error?.message || 'Unknown error'}`);
      }

      // The idToken from this response is the Firebase ID token
      const firebaseIdToken = responseData.idToken;

      console.log('Firebase ID Token:', firebaseIdToken);

      const result: FirebaseTokenResult = {
        firebaseIdToken: firebaseIdToken,
        refreshToken: responseData.refreshToken,
        userId: responseData.localId,
        email: responseData.email,
        displayName: responseData.displayName,
        photoUrl: responseData.photoUrl,
        providerId: responseData.providerId,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
        rawResponse: responseData
      };
      
      return result;

    } catch (error) {
      console.error('Firebase Token Exchange Error:', (error as Error).message);
      throw error;
    }
  }

  /**
   * Test Firebase token with backend API (same as HTML file)
   */
  async testFirebaseTokenWithAPI(firebaseIdToken: string, additionalDetails: Record<string, any> = {}): Promise<APITestResult> {
    try {
      const requestBody = {
        id_token: firebaseIdToken,
        additional_details: {
          device_type: 'mobile',
          platform: Platform.OS,
          test_user: true,
          ...additionalDetails
        }
      };

      const response = await fetch('https://24pw8gqd0i.execute-api.us-east-1.amazonaws.com/api/v1/auth/sso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json();

      return {
        status: response.status,
        data: responseData,
        platform: Platform.OS,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Firebase token API test failed:', error);
      throw error;
    }
  }
}

export default new FirebaseTokenService();