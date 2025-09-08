/**
 * User Service
 * Handles user-related API calls
 */

import apiClient from '../client';
import { API_ENDPOINTS } from '../config';

class UserService {
  /**
   * Get user profile by ID
   * @param {string} userId - User ID
   * @returns {Promise} User profile data
   */
  async getUserProfile(userId: string) {
    try {
      console.log('=================== Fetching User Profile ===================');
      
      const response = await apiClient.get(`${API_ENDPOINTS.USER.PROFILE}/${userId}`);
      
      console.log('✅ User profile fetched successfully');
      console.log('=================== User Profile Fetched ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch user profile:', error);
      throw error;
    }
  }

  /**
   * Get user by ID (alias for getUserProfile for backward compatibility)
   * @param {string} userId - User ID
   * @returns {Promise} User data
   */
  async getUserById(userId: string) {
    try {
      console.log('=================== Fetching User By ID ===================');
      console.log('🔍 User ID:', userId);
      
      // Use the correct endpoint from your curl command: /auth/user/{user_id}
      const response = await apiClient.get(API_ENDPOINTS.AUTH.USER(userId));
      
      console.log('✅ User fetched successfully');
      console.log('👤 User data:', JSON.stringify(response.data, null, 2));
      console.log('=================== User By ID Fetched ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to fetch user by ID:', error);
      if (error.response) {
        console.error('❌ API Error Response:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {object} profileData - Profile data to update
   * @returns {Promise} Updated profile data
   */
  async updateUserProfile(profileData: any) {
    try {
      console.log('=================== Updating User Profile ===================');
      
      const response = await apiClient.put(API_ENDPOINTS.USER.UPDATE_PROFILE, profileData);
      
      console.log('✅ User profile updated successfully');
      console.log('=================== User Profile Updated ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to update user profile:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   * @param {string} userId - User ID (optional, defaults to current user)
   * @returns {Promise} User statistics
   */
  async getUserStats(userId?: string) {
    try {
      console.log('=================== Fetching User Stats ===================');
      
      let url = API_ENDPOINTS.USER.STATS;
      if (userId) {
        url += `?user_id=${userId}`;
      }
      
      const response = await apiClient.get(url);
      
      console.log('✅ User stats fetched successfully');
      console.log('=================== User Stats Fetched ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch user stats:', error);
      throw error;
    }
  }
}

export default new UserService();