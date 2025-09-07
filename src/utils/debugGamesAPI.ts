/**
 * Debug script for Games API
 * Run this with: npx ts-node debugGamesAPI.ts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = 'https://24pw8gqd0i.execute-api.us-east-1.amazonaws.com/api/v1';

interface AuthResponse {
  data: any;
  status: number;
}

interface RefreshResponse {
  data: {
    access_token: string;
    refresh_token?: string;
  };
}

async function testGamesAPI(): Promise<void> {
  try {
    console.log('🔍 Checking stored tokens...');
    
    // Check if we have tokens stored
    let accessToken = await AsyncStorage.getItem('access_token');
    const refreshToken = await AsyncStorage.getItem('refresh_token');
    
    console.log('Access Token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'NOT FOUND');
    console.log('Refresh Token:', refreshToken ? `${refreshToken.substring(0, 20)}...` : 'NOT FOUND');
    
    if (!accessToken) {
      console.log('❌ No access token found. Please login first.');
      return;
    }
    
    console.log('\n🔄 Testing auth/me API...');
    
    // Test auth/me first
    try {
      const authResponse: AxiosResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        }
      });
      
      console.log('✅ Auth/me API successful:', authResponse.status);
      console.log('User data:', JSON.stringify(authResponse.data, null, 2));
    } catch (authError: any) {
      console.log('❌ Auth/me API failed:');
      console.log('Status:', authError.response?.status);
      console.log('Error:', authError.response?.data || authError.message);
      
      if (authError.response?.status === 401) {
        console.log('🔄 Token expired, trying refresh...');
        
        try {
          const refreshResponse: RefreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken
          }, {
            headers: {
              'accept': 'application/json',
              'Content-Type': 'application/json',
            }
          });
          
          const { access_token, refresh_token: newRefreshToken } = refreshResponse.data;
          
          await AsyncStorage.setItem('access_token', access_token);
          if (newRefreshToken) {
            await AsyncStorage.setItem('refresh_token', newRefreshToken);
          }
          
          console.log('✅ Token refreshed successfully');
          console.log('New access token:', access_token.substring(0, 20) + '...');
          
          // Update accessToken for games API test
          accessToken = access_token;
          
        } catch (refreshError: any) {
          console.log('❌ Token refresh failed:');
          console.log('Status:', refreshError.response?.status);
          console.log('Error:', refreshError.response?.data || refreshError.message);
          return;
        }
      } else {
        return;
      }
    }
    
    console.log('\n🎮 Testing games API...');
    
    // Test games API
    try {
      const gamesResponse: AxiosResponse = await axios.get(`${API_BASE_URL}/games`, {
        params: {
          page: 1,
          per_page: 20
        },
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        }
      });
      
      console.log('✅ Games API successful:', gamesResponse.status);
      console.log('Games data:', JSON.stringify(gamesResponse.data, null, 2));
      
    } catch (gamesError: any) {
      console.log('❌ Games API failed:');
      console.log('Status:', gamesError.response?.status);
      console.log('Headers sent:', gamesError.config?.headers);
      console.log('URL:', gamesError.config?.url);
      console.log('Error:', JSON.stringify(gamesError.response?.data || gamesError.message, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
export const runGamesAPIDebug = (): Promise<void> => {
  return testGamesAPI().then(() => {
    console.log('\n🏁 Debug complete');
  }).catch(console.error);
};

// For direct execution
if (require.main === module) {
  runGamesAPIDebug();
}