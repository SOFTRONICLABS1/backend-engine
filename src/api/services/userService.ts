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