/**
 * Social Service
 * Handles social interactions like follow/unfollow
 */

import apiClient from '../client';
import { API_ENDPOINTS } from '../config';
import followStatusManager from './followStatusManager';

class SocialService {
  /**
   * Follow a user
   * @param {string} userId - User ID to follow
   * @returns {Promise} Follow result
   */
  async followUser(userId: string) {
    try {
      console.log('=================== Following User ===================');
      console.log('👤 User ID to follow:', userId);
      
      const response = await apiClient.post(API_ENDPOINTS.SOCIAL.FOLLOW(userId));
      
      console.log('✅ User followed successfully');
      console.log('📊 Follow response:', JSON.stringify(response.data, null, 2));
      console.log('=================== Follow User Completed ===================');
      
      // Update global follow status
      followStatusManager.updateFollowStatus(userId, true);
      
      return { success: true, isFollowing: true, data: response.data };
    } catch (error: any) {
      console.error('❌ Failed to follow user:', error);
      if (error.response) {
        console.error('❌ API Error Response:', JSON.stringify(error.response.data, null, 2));
        
        // Handle "Already following" as a success case
        if (error.response.status === 400 && 
            error.response.data?.detail === "Already following this user") {
          console.log('ℹ️ User is already being followed - treating as success');
          console.log('=================== Follow User Completed (Already Following) ===================');
          
          // Update global follow status
          followStatusManager.updateFollowStatus(userId, true);
          
          return { success: true, isFollowing: true, alreadyFollowing: true };
        }
      }
      throw error;
    }
  }

  /**
   * Unfollow a user
   * @param {string} userId - User ID to unfollow
   * @returns {Promise} Unfollow result
   */
  async unfollowUser(userId: string) {
    try {
      console.log('=================== Unfollowing User ===================');
      console.log('👤 User ID to unfollow:', userId);
      
      const response = await apiClient.delete(API_ENDPOINTS.SOCIAL.UNFOLLOW(userId));
      
      console.log('✅ User unfollowed successfully');
      console.log('📊 Unfollow response:', JSON.stringify(response.data, null, 2));
      console.log('=================== Unfollow User Completed ===================');
      
      // Update global follow status
      followStatusManager.updateFollowStatus(userId, false);
      
      return { success: true, isFollowing: false, data: response.data };
    } catch (error: any) {
      console.error('❌ Failed to unfollow user:', error);
      if (error.response) {
        console.error('❌ API Error Response:', JSON.stringify(error.response.data, null, 2));
        
        // Handle "Not following" as a success case
        if (error.response.status === 400 && 
            (error.response.data?.detail === "Not following this user" || 
             error.response.data?.detail === "User is not being followed")) {
          console.log('ℹ️ User is not being followed - treating as success');
          console.log('=================== Unfollow User Completed (Not Following) ===================');
          
          // Update global follow status
          followStatusManager.updateFollowStatus(userId, false);
          
          return { success: true, isFollowing: false, notFollowing: true };
        }
      }
      throw error;
    }
  }

  /**
   * Check if currently following a user
   * @param {string} userId - User ID to check follow status for
   * @returns {Promise} Follow status result
   */
  async getFollowStatus(userId: string) {
    try {
      console.log('=================== Checking Follow Status ===================');
      console.log('👤 User ID to check:', userId);
      
      const response = await apiClient.get(API_ENDPOINTS.SOCIAL.IS_FOLLOWING(userId));
      
      console.log('✅ Follow status retrieved successfully');
      console.log('📊 Follow status response:', JSON.stringify(response.data, null, 2));
      console.log('=================== Follow Status Check Completed ===================');
      
      return { success: true, isFollowing: response.data.is_following, data: response.data };
    } catch (error: any) {
      console.error('❌ Failed to get follow status:', error);
      if (error.response) {
        console.error('❌ API Error Response:', JSON.stringify(error.response.data, null, 2));
        
        // If user not found or other errors, assume not following
        if (error.response.status === 404) {
          console.log('ℹ️ User not found - treating as not following');
          console.log('=================== Follow Status Check Completed (Not Found) ===================');
          return { success: true, isFollowing: false, notFound: true };
        }
      }
      throw error;
    }
  }

  /**
   * Toggle follow status for a user
   * @param {string} userId - User ID to toggle follow
   * @param {boolean} isCurrentlyFollowing - Current follow status
   * @returns {Promise} Follow/unfollow result with new status
   */
  async toggleFollow(userId: string, isCurrentlyFollowing: boolean) {
    try {
      console.log('=================== Toggling Follow Status ===================');
      console.log('👤 User ID:', userId);
      console.log('📊 Currently following:', isCurrentlyFollowing);
      console.log('🔄 Action:', isCurrentlyFollowing ? 'Unfollow' : 'Follow');
      
      let result;
      if (isCurrentlyFollowing) {
        result = await this.unfollowUser(userId);
      } else {
        result = await this.followUser(userId);
      }
      
      console.log('✅ Follow status toggled successfully');
      console.log('📊 New follow status:', result.isFollowing);
      console.log('=================== Toggle Follow Completed ===================');
      
      return result;
    } catch (error: any) {
      console.error('❌ Failed to toggle follow status:', error);
      throw error;
    }
  }

  /**
   * Get current user's followers
   * @param {number} page - Page number (default: 1)
   * @param {number} perPage - Items per page (default: 20)
   * @returns {Promise} Followers list result
   */
  async getMyFollowers(page = 1, perPage = 20) {
    try {
      console.log('=================== Getting My Followers ===================');
      console.log('📄 Page:', page, 'Per page:', perPage);
      
      const response = await apiClient.get(API_ENDPOINTS.SOCIAL.MY_FOLLOWERS, {
        params: { page, per_page: perPage }
      });
      
      console.log('✅ My followers retrieved successfully');
      console.log('📊 Followers response:', JSON.stringify(response.data, null, 2));
      console.log('=================== Get My Followers Completed ===================');
      
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('❌ Failed to get my followers:', error);
      if (error.response) {
        console.error('❌ API Error Response:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Get current user's following
   * @param {number} page - Page number (default: 1)
   * @param {number} perPage - Items per page (default: 20)
   * @returns {Promise} Following list result
   */
  async getMyFollowing(page = 1, perPage = 20) {
    try {
      console.log('=================== Getting My Following ===================');
      console.log('📄 Page:', page, 'Per page:', perPage);
      
      const response = await apiClient.get(API_ENDPOINTS.SOCIAL.MY_FOLLOWING, {
        params: { page, per_page: perPage }
      });
      
      console.log('✅ My following retrieved successfully');
      console.log('📊 Following response:', JSON.stringify(response.data, null, 2));
      console.log('=================== Get My Following Completed ===================');
      
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('❌ Failed to get my following:', error);
      if (error.response) {
        console.error('❌ API Error Response:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Get a specific user's followers
   * @param {string} userId - User ID to get followers for
   * @param {number} page - Page number (default: 1)
   * @param {number} perPage - Items per page (default: 20)
   * @returns {Promise} User's followers list result
   */
  async getUserFollowers(userId: string, page = 1, perPage = 20) {
    try {
      console.log('=================== Getting User Followers ===================');
      console.log('👤 User ID:', userId);
      console.log('📄 Page:', page, 'Per page:', perPage);
      
      const response = await apiClient.get(API_ENDPOINTS.SOCIAL.USER_FOLLOWERS(userId), {
        params: { page, per_page: perPage }
      });
      
      console.log('✅ User followers retrieved successfully');
      console.log('📊 Followers response:', JSON.stringify(response.data, null, 2));
      console.log('=================== Get User Followers Completed ===================');
      
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('❌ Failed to get user followers:', error);
      if (error.response) {
        console.error('❌ API Error Response:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Get a specific user's following
   * @param {string} userId - User ID to get following for
   * @param {number} page - Page number (default: 1)
   * @param {number} perPage - Items per page (default: 20)
   * @returns {Promise} User's following list result
   */
  async getUserFollowing(userId: string, page = 1, perPage = 20) {
    try {
      console.log('=================== Getting User Following ===================');
      console.log('👤 User ID:', userId);
      console.log('📄 Page:', page, 'Per page:', perPage);
      
      const response = await apiClient.get(API_ENDPOINTS.SOCIAL.USER_FOLLOWING(userId), {
        params: { page, per_page: perPage }
      });
      
      console.log('✅ User following retrieved successfully');
      console.log('📊 Following response:', JSON.stringify(response.data, null, 2));
      console.log('=================== Get User Following Completed ===================');
      
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('❌ Failed to get user following:', error);
      if (error.response) {
        console.error('❌ API Error Response:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Like a content item
   * @param {string} contentId - Content ID to like
   * @returns {Promise} Like result
   */
  async likeContent(contentId: string) {
    try {
      console.log('=================== Liking Content ===================');
      console.log('📝 Content ID to like:', contentId);
      
      const response = await apiClient.post(API_ENDPOINTS.SOCIAL.LIKE_CONTENT(contentId));
      
      console.log('✅ Content liked successfully');
      console.log('📊 Like response:', JSON.stringify(response.data, null, 2));
      console.log('=================== Like Content Completed ===================');
      
      return { success: true, isLiked: true, data: response.data };
    } catch (error: any) {
      console.error('❌ Failed to like content:', error);
      if (error.response) {
        console.error('❌ API Error Response:', JSON.stringify(error.response.data, null, 2));
        
        // Handle "Already liked" as a success case
        if (error.response.status === 400 && 
            error.response.data?.detail === "Content already liked") {
          console.log('ℹ️ Content is already liked - treating as success');
          console.log('=================== Like Content Completed (Already Liked) ===================');
          return { success: true, isLiked: true, alreadyLiked: true };
        }
      }
      throw error;
    }
  }

  /**
   * Unlike a content item
   * @param {string} contentId - Content ID to unlike
   * @returns {Promise} Unlike result
   */
  async unlikeContent(contentId: string) {
    try {
      console.log('=================== Unliking Content ===================');
      console.log('📝 Content ID to unlike:', contentId);
      
      const response = await apiClient.delete(API_ENDPOINTS.SOCIAL.UNLIKE_CONTENT(contentId));
      
      console.log('✅ Content unliked successfully');
      console.log('📊 Unlike response:', JSON.stringify(response.data, null, 2));
      console.log('=================== Unlike Content Completed ===================');
      
      return { success: true, isLiked: false, data: response.data };
    } catch (error: any) {
      console.error('❌ Failed to unlike content:', error);
      if (error.response) {
        console.error('❌ API Error Response:', JSON.stringify(error.response.data, null, 2));
        
        // Handle "Not liked" as a success case
        if (error.response.status === 400 && 
            (error.response.data?.detail?.includes("not liked") || 
             error.response.data?.detail?.includes("not found") ||
             error.response.data?.detail?.includes("Content not liked"))) {
          console.log('ℹ️ Content is not liked - treating as success');
          console.log('=================== Unlike Content Completed (Not Liked) ===================');
          return { success: true, isLiked: false, notLiked: true };
        }
      }
      throw error;
    }
  }

  /**
   * Get likes count for a content item
   * @param {string} contentId - Content ID to get likes for
   * @returns {Promise} Likes result
   */
  async getContentLikes(contentId: string) {
    try {
      console.log('=================== Getting Content Likes ===================');
      console.log('📝 Content ID:', contentId);
      
      const response = await apiClient.get(API_ENDPOINTS.SOCIAL.CONTENT_LIKES(contentId));
      
      console.log('✅ Content likes retrieved successfully');
      console.log('📊 Likes response:', JSON.stringify(response.data, null, 2));
      console.log('=================== Get Content Likes Completed ===================');
      
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('❌ Failed to get content likes:', error);
      if (error.response) {
        console.error('❌ API Error Response:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Toggle like status for a content item
   * @param {string} contentId - Content ID to toggle like
   * @param {boolean} isCurrentlyLiked - Current like status
   * @returns {Promise} Like/unlike result with new status
   */
  async toggleContentLike(contentId: string, isCurrentlyLiked: boolean) {
    try {
      console.log('=================== Toggling Content Like Status ===================');
      console.log('📝 Content ID:', contentId);
      console.log('📊 Currently liked:', isCurrentlyLiked);
      console.log('🔄 Action:', isCurrentlyLiked ? 'Unlike' : 'Like');
      
      let result;
      if (isCurrentlyLiked) {
        result = await this.unlikeContent(contentId);
      } else {
        result = await this.likeContent(contentId);
      }
      
      console.log('✅ Like status toggled successfully');
      console.log('📊 New like status:', result.isLiked);
      console.log('=================== Toggle Like Completed ===================');
      
      return result;
    } catch (error: any) {
      console.error('❌ Failed to toggle like status:', error);
      throw error;
    }
  }
}

export default new SocialService();