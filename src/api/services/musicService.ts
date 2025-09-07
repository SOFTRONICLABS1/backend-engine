/**
 * Music Service
 * Handles music lessons and progress tracking
 */

import apiClient from '../client';
import { API_ENDPOINTS } from '../config';

class MusicService {
  /**
   * Get list of music lessons
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 20)
   * @returns {Promise} List of lessons
   */
  async getLessons(page = 1, limit = 20) {
    try {
      console.log('=================== Fetching Music Lessons ===================');
      
      const response = await apiClient.get(`${API_ENDPOINTS.MUSIC.LESSONS}?page=${page}&limit=${limit}`);
      
      console.log('✅ Music lessons fetched successfully');
      console.log('=================== Music Lessons Fetched ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch music lessons:', error);
      throw error;
    }
  }

  /**
   * Get lesson details by ID
   * @param {string} lessonId - Lesson ID
   * @returns {Promise} Lesson details
   */
  async getLessonDetails(lessonId: string) {
    try {
      console.log('=================== Fetching Lesson Details ===================');
      
      const response = await apiClient.get(API_ENDPOINTS.MUSIC.LESSON_DETAILS(lessonId));
      
      console.log('✅ Lesson details fetched successfully');
      console.log('=================== Lesson Details Fetched ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch lesson details:', error);
      throw error;
    }
  }

  /**
   * Submit lesson progress
   * @param {string} lessonId - Lesson ID
   * @param {object} progressData - Progress data
   * @returns {Promise} Progress submission result
   */
  async submitProgress(lessonId: string, progressData: any) {
    try {
      console.log('=================== Submitting Lesson Progress ===================');
      
      const response = await apiClient.post(API_ENDPOINTS.MUSIC.SUBMIT_PROGRESS(lessonId), progressData);
      
      console.log('✅ Lesson progress submitted successfully');
      console.log('=================== Lesson Progress Submitted ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to submit lesson progress:', error);
      throw error;
    }
  }

  /**
   * Get user's music progress
   * @returns {Promise} User's progress data
   */
  async getUserProgress() {
    try {
      console.log('=================== Fetching User Progress ===================');
      
      const response = await apiClient.get(API_ENDPOINTS.MUSIC.USER_PROGRESS);
      
      console.log('✅ User progress fetched successfully');
      console.log('=================== User Progress Fetched ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch user progress:', error);
      throw error;
    }
  }
}

export default new MusicService();