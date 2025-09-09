/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import apiClient from '../client';
import { API_ENDPOINTS } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface GoogleSignInPayload {
  idToken: string;
  platform?: string;
  userInfo: any;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: any;
  is_new_user: boolean;
}

class AuthService {
  /**
   * Complete Google Sign-In authentication flow
   * @param {string} idToken - Google ID token
   * @param {string} platform - Platform (ios/android)
   * @param {object} userInfo - Google user information
   * @returns {Promise} API response with access token
   */
  async googleSignIn(idToken: string, platform = 'ios', userInfo: any): Promise<AuthResponse> {
    try {
      console.log('=================== Starting Google Sign In ===================');
      const verifyResponse = await apiClient.post(API_ENDPOINTS.AUTH.GOOGLE_VERIFY, {
        id_token: idToken,
        platform: platform,
        additional_details: {
          user_info: userInfo,
          device_info: {
            platform: 'mobile',
            os: platform,
          }
        },
      });
      const authResponse = await apiClient.post(API_ENDPOINTS.AUTH.GOOGLE_VERIFIED, {
        google_user: {
          id: userInfo.id,
          email: userInfo.email,
          email_verified: true,
          name: userInfo.name,
          picture: userInfo.photo,
          given_name: userInfo.givenName,
          family_name: userInfo.familyName,
        }
      });
      
      // Store tokens and user data
      if (authResponse.data.access_token) {
        await AsyncStorage.setItem('access_token', authResponse.data.access_token);
      }
      
      if (authResponse.data.refresh_token) {
        await AsyncStorage.setItem('refresh_token', authResponse.data.refresh_token);
      }
      
      if (authResponse.data.user) {
        await AsyncStorage.setItem('user_data', JSON.stringify(authResponse.data.user));
      }
      
      console.log('=================== Google Sign In Completed ===================');
      
      return {
        access_token: authResponse.data.access_token,
        refresh_token: authResponse.data.refresh_token,
        user: authResponse.data.user,
        is_new_user: authResponse.data.is_new_user,
      };
    } catch (error: any) {
      console.log('=================== Google Sign In Failed ===================');
      console.error('Status:', error.response?.status);
      console.error('Error Data:', error.response?.data);
      console.error('Error Message:', error.message);
      console.log('=============================================================');
      
      throw error;
    }
  }
  
  /**
   * Refresh authentication token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise} New auth token
   */
  async refreshToken(refreshToken: string) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
        refresh_token: refreshToken,
      });
      
      return response.data;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }
  
  /**
   * Check username availability
   * @param {string} username - Username to check
   * @returns {Promise} Response indicating if username is available
   */
  async checkUsernameAvailability(username: string) {
    try {
      console.log('=================== Starting Username Check ===================');
      
      // Get the stored access token
      const token = await AsyncStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No authentication token found. Please sign in again.');
      }
      
      const response = await apiClient.post(
        API_ENDPOINTS.AUTH.CHECK_USERNAME,
        { username },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      console.log('=================== Username Check Completed ===================');
      return response.data;
    } catch (error: any) {
      console.log('=================== Username Check Failed ===================');
      console.error('Username check failed:', error);
      if (error.response) {
        console.error('❌ Username Check Error Response:', error.response.data);
        throw new Error(error.response.data.message || 'Username check failed');
      } else if (error.request) {
        console.error('❌ No response received:', error.request);
        throw new Error('No response from server. Please check your connection.');
      } else {
        console.error('❌ Error setting up request:', error.message);
        throw new Error('Failed to check username. Please try again.');
      }
    }
  }

  /**
   * Update username for authenticated user
   * @param {string} username - New username to set
   * @returns {Promise} Response from update username API
   */
  async updateUsername(username: string) {
    try {
      console.log('=================== Starting Username Update ===================');
      
      // Get the stored access token
      const token = await AsyncStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No authentication token found. Please sign in again.');
      }

      console.log('📝 Updating username to:', username);
      
      const response = await apiClient.put(
        API_ENDPOINTS.AUTH.UPDATE_USERNAME,
        { username },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      console.log('✅ Username updated successfully:', response.data);
      console.log('=================== Username Update Completed ===================');
      return response.data;
    } catch (error: any) {
      console.log('=================== Username Update Failed ===================');
      console.error('Username update failed:', error);
      if (error.response) {
        console.error('❌ Username Update Error Response:', error.response.data);
        throw new Error(error.response.data.message || 'Failed to update username');
      } else if (error.request) {
        console.error('❌ No response received:', error.request);
        throw new Error('No response from server. Please check your connection.');
      } else {
        console.error('❌ Error setting up request:', error.message);
        throw new Error('Failed to update username. Please try again.');
      }
    }
  }

  /**
   * Update phone number for authenticated user
   * @param {string} countryCode - Country code (e.g., "91" for India)
   * @param {string} phoneNumber - Phone number without country code
   * @returns {Promise} Response from update phone API
   */
  async updatePhoneNumber(countryCode: string, phoneNumber: string) {
    try {
      console.log('=================== Starting Phone Update ===================');
      
      // Get the stored access token
      const token = await AsyncStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No authentication token found. Please sign in again.');
      }

      console.log('📱 Updating phone number:', `+${countryCode}${phoneNumber}`);
      
      const response = await apiClient.put(
        API_ENDPOINTS.AUTH.UPDATE_PHONE,
        { 
          country_code: countryCode,
          phone_number: phoneNumber 
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      console.log('✅ Phone number updated successfully:', response.data);
      console.log('=================== Phone Update Completed ===================');
      return response.data;
    } catch (error: any) {
      console.log('=================== Phone Update Failed ===================');
      console.error('Phone number update failed:', error);
      if (error.response) {
        console.error('❌ Phone Update Error Response:', error.response.data);
        throw new Error(error.response.data.message || 'Failed to update phone number');
      } else if (error.request) {
        console.error('❌ No response received:', error.request);
        throw new Error('No response from server. Please check your connection.');
      } else {
        console.error('❌ Error setting up request:', error.message);
        throw new Error('Failed to update phone number. Please try again.');
      }
    }
  }

  /**
   * Update user profile information (bio, profile_image_url, etc.)
   * @param {object} profileData - Profile data to update
   * @returns {Promise} Response from update profile API
   */
  async updateProfile(profileData: any) {
    try {
      console.log('=================== Starting Profile Update ===================');
      
      // Get the stored access token
      const token = await AsyncStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No authentication token found. Please sign in again.');
      }

      console.log('📝 Updating profile with data:', profileData);
      
      const response = await apiClient.put(
        API_ENDPOINTS.AUTH.UPDATE_PROFILE,
        profileData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      console.log('✅ Profile updated successfully:', response.data);
      console.log('=================== Profile Update Completed ===================');
      return response.data;
    } catch (error: any) {
      console.log('=================== Profile Update Failed ===================');
      console.error('Profile update failed:', error);
      if (error.response) {
        console.error('❌ Profile Update Error Response:', error.response.data);
        throw new Error(error.response.data.message || 'Failed to update profile');
      } else if (error.request) {
        console.error('❌ No response received:', error.request);
        throw new Error('No response from server. Please check your connection.');
      } else {
        console.error('❌ Error setting up request:', error.message);
        throw new Error('Failed to update profile. Please try again.');
      }
    }
  }

  /**
   * Get current user profile information
   * @returns {Promise} User profile data
   */
  async getCurrentUser() {
    try {
      console.log('=================== Starting Get User Profile ===================');
      console.log('👤 Fetching current user profile...');
      
      const response = await apiClient.get(API_ENDPOINTS.AUTH.ME, {
        timeout: 60000 // Increase timeout for this specific call
      });
      
      console.log('✅ User profile fetched successfully:', response.data);
      console.log('=================== Get User Profile Completed ===================');
      return response.data;
    } catch (error: any) {
      console.log('=================== Get User Profile Failed ===================');
      console.error('Failed to fetch user profile:', error);
      if (error.response) {
        console.error('❌ Get User Profile Error Response:', error.response.data);
        throw new Error(error.response.data.message || 'Failed to fetch user profile');
      } else if (error.request) {
        console.error('❌ No response received:', error.request);
        throw new Error('No response from server. Please check your connection.');
      } else {
        console.error('❌ Error setting up request:', error.message);
        throw new Error('Failed to fetch user profile. Please try again.');
      }
    }
  }

  /**
   * Get current user ID from local storage
   * @returns {Promise<string|null>} User ID or null if not found
   */
  async getCurrentUserId(): Promise<string | null> {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id || user.user_id || null;
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get current user ID:', error);
      return null;
    }
  }

  /**
   * Get user profile by user ID
   * @param {string} userId - User ID to fetch profile for
   * @returns {Promise} User profile data
   */
  async getUserById(userId: string) {
    try {
      console.log('=================== Starting Get User By ID ===================');
      console.log('👤 Fetching user profile for ID:', userId);
      
      const response = await apiClient.get(API_ENDPOINTS.AUTH.USER(userId));
      
      console.log('✅ User profile fetched successfully:', response.data);
      console.log('=================== Get User By ID Completed ===================');
      return response.data;
    } catch (error: any) {
      console.log('=================== Get User By ID Failed ===================');
      console.error('Failed to fetch user profile for ID:', userId, error);
      if (error.response) {
        console.error('❌ Get User By ID Error Response:', error.response.data);
        throw new Error(error.response.data.message || 'Failed to fetch user profile');
      } else if (error.request) {
        console.error('❌ No response received:', error.request);
        throw new Error('No response from server. Please check your connection.');
      } else {
        console.error('❌ Error setting up request:', error.message);
        throw new Error('Failed to fetch user profile. Please try again.');
      }
    }
  }

  /**
   * Logout user
   * @returns {Promise}
   */
  async logout() {
    try {
      console.log('=================== Starting Logout ===================');
      
      // Get token for logout API call
      const token = await AsyncStorage.getItem('access_token');
      
      if (token) {
        try {
          // Call logout API using apiClient
          await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
          console.log('✅ Logout API call successful');
        } catch (apiError: any) {
          console.warn('Logout API failed:', apiError.message || 'Unknown error');
        }
      }
      
      // Clear all stored authentication data
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
      
      console.log('🗑️ Cleared all authentication data from storage');
      console.log('=================== Logout Completed ===================');
      
      return { success: true };
    } catch (error: any) {
      console.log('=================== Logout Failed ===================');
      console.error('Logout failed:', error);
      
      // Even if API call fails, still clear local storage
      try {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
        console.log('🗑️ Cleared local storage despite API failure');
      } catch (storageError) {
        console.error('Failed to clear storage:', storageError);
      }
      
      throw error;
    }
  }
}

export default new AuthService();