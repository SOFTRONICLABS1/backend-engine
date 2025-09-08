/**
 * Content Service
 * Handles content upload, retrieval, and management
 */

import apiClient from '../client';
import { API_ENDPOINTS } from '../config';

class ContentService {
  /**
   * Get S3 upload URL for content
   * @param {string} fileName - Name of the file
   * @param {string} contentType - MIME type of the file
   * @returns {Promise} Upload URL and key
   */
  async getUploadUrl(fileName: string, contentType: string) {
    try {
      console.log('=================== Getting Upload URL ===================');
      
      const response = await apiClient.post(API_ENDPOINTS.CONTENT.GET_UPLOAD_URL, {
        file_name: fileName,
        content_type: contentType,
      });
      
      console.log('✅ Upload URL retrieved successfully');
      console.log('=================== Upload URL Retrieved ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to get upload URL:', error);
      throw error;
    }
  }

  /**
   * Create content record with S3 key after upload
   * @param {object} contentData - Content metadata
   * @returns {Promise} Created content record
   */
  async createContentWithS3Key(contentData: any) {
    try {
      console.log('=================== Creating Content Record ===================');
      
      const response = await apiClient.post(API_ENDPOINTS.CONTENT.CREATE_WITH_S3_KEY, contentData);
      
      console.log('✅ Content record created successfully');
      console.log('=================== Content Record Created ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to create content record:', error);
      throw error;
    }
  }


  /**
   * Get content details by ID
   * @param {string} contentId - Content ID
   * @returns {Promise} Content details
   */
  async getContentDetails(contentId: string) {
    try {
      console.log('=================== Fetching Content Details ===================');
      
      const response = await apiClient.get(API_ENDPOINTS.CONTENT.DETAILS(contentId));
      
      console.log('✅ Content details fetched successfully');
      console.log('=================== Content Details Fetched ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch content details:', error);
      throw error;
    }
  }

  /**
   * Upload file to S3 using pre-signed URL
   * @param {string} uploadUrl - Pre-signed upload URL
   * @param {any} file - File to upload
   * @param {string} contentType - MIME type
   * @returns {Promise} Upload result
   */
  async uploadFileToS3(uploadUrl: string, file: any, contentType: string) {
    try {
      console.log('=================== Uploading File to S3 ===================');
      
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': contentType,
        },
      });

      if (!response.ok) {
        throw new Error(`S3 upload failed: ${response.statusText}`);
      }
      
      console.log('✅ File uploaded to S3 successfully');
      console.log('=================== S3 Upload Completed ===================');
      
      return { success: true };
    } catch (error: any) {
      console.error('Failed to upload file to S3:', error);
      throw error;
    }
  }

  /**
   * Get user's content
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 20)
   * @returns {Promise} User's content list
   */
  async getUserContent(page = 1, limit = 20) {
    try {
      console.log('=================== Fetching User Content ===================');
      
      // Use the public endpoint with per_page parameter
      const response = await apiClient.get(`${API_ENDPOINTS.CONTENT.PUBLIC}?page=${page}&per_page=${limit}`);
      
      console.log('✅ User content fetched successfully');
      console.log('=================== User Content Fetched ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch user content:', error);
      throw error;
    }
  }

  /**
   * Get user's content (posts)
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} User's content
   */
  async getMyContent(page: number = 1, limit: number = 20) {
    try {
      console.log('=================== Fetching My Content ===================');
      
      // Use the public endpoint with per_page parameter
      const response = await apiClient.get(`${API_ENDPOINTS.CONTENT.PUBLIC}?page=${page}&per_page=${limit}`);
      
      console.log('✅ My content fetched successfully');
      console.log('=================== My Content Fetched ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch my content:', error);
      throw error;
    }
  }

  /**
   * Get public content feed
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} Public content
   */
  async getPublicContent(page: number = 1, limit: number = 20) {
    try {
      console.log('=================== Fetching Public Content ===================');
      
      // Use the public endpoint with per_page parameter
      const response = await apiClient.get(`${API_ENDPOINTS.CONTENT.PUBLIC}?page=${page}&per_page=${limit}`);
      
      console.log('✅ Public content fetched successfully');
      console.log('=================== Public Content Fetched ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch public content:', error);
      console.log('===== Error fetching public content:', error, '=====');
      throw error;
    }
  }
}

export default new ContentService();