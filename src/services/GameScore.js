/**
 * GameScore Class - Processes game state and creates score records
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export default class GameScore {
  static async create(gameState) {
    if (!gameState || !gameState.isValid()) {
      throw new Error('GameScore requires a valid GameState object');
    }

    const instance = new GameScore();
    
    instance.gameId = gameState.getGameId();
    instance.contentId = gameState.getContentId();
    instance.numberOfCycles = gameState.getNumberOfCycles();
    instance.startTime = gameState.getStartTime();
    instance.endTime = gameState.getEndTime();
    instance.score = gameState.getScore();
    instance.level = gameState.getLevelConfig();
    instance.overallAccuracy = gameState.getAccuracy();
    instance.gameType = gameState.getGameType();
    instance.gameData = gameState.getGameData();
    
    // Calculated properties
    instance.sessionDuration = instance.endTime && instance.startTime ? new Date(instance.endTime) - new Date(instance.startTime) : 0;
    instance.sessionId = instance.generateSessionId();
    
    // Store reference to GameState for later reset
    instance.gameStateRef = gameState;
    
    return instance;
  }

  constructor() {
    // Private constructor - use static create method
  }

  generateSessionId() {
    return `game_${this.gameId}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // Setters
  setGameId(gameId) {
    this.gameId = gameId;
  }

  setContentId(contentId) {
    this.contentId = contentId;
  }

  setNumberOfCycles(cycles) {
    this.numberOfCycles = cycles;
  }

  setStartTime(startTime) {
    this.startTime = startTime;
    this.updateSessionDuration();
  }

  setEndTime(endTime) {
    this.endTime = endTime;
    this.updateSessionDuration();
  }

  setScore(score) {
    this.score = score;
  }

  setLevel(levelConfig) {
    this.level = levelConfig;
  }

  setOverallAccuracy(accuracy) {
    this.overallAccuracy = accuracy;
  }

  updateSessionDuration() {
    if (this.endTime && this.startTime) {
      this.sessionDuration = new Date(this.endTime) - new Date(this.startTime);
    }
  }

  // Getters
  getGameId() {
    return this.gameId;
  }

  getContentId() {
    return this.contentId;
  }

  getNumberOfCycles() {
    return this.numberOfCycles;
  }

  getStartTime() {
    return this.startTime;
  }

  getEndTime() {
    return this.endTime;
  }

  getScore() {
    return this.score;
  }

  getLevel() {
    return this.level;
  }

  getOverallAccuracy() {
    return this.overallAccuracy;
  }

  getSessionDuration() {
    return this.sessionDuration;
  }

  getSessionId() {
    return this.sessionId;
  }

  // Export session data
  exportSessionData() {
    return {
      sessionId: this.sessionId,
      gameId: this.gameId,
      contentId: this.contentId,
      numberOfCycles: this.numberOfCycles,
      startTime: this.startTime,
      endTime: this.endTime,
      sessionDuration: this.sessionDuration,
      score: this.score,
      level: this.level,
      overallAccuracy: this.overallAccuracy,
      gameType: this.gameType,
      gameData: this.gameData,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
  }

  // Format data for API submission
  formatForAPI() {
    return {
      game_id: this.gameId,
      content_id: this.contentId,
      score: this.score,
      accuracy: this.overallAccuracy || 0,
      attempts: 1, // Always set to 1 as specified
      start_time: this.startTime,
      end_time: this.endTime,
      cycles: this.numberOfCycles || 0,
      level_config: this.level || {}
    };
  }

  // Submit score to API
  async submitToAPI() {
    const apiPayload = this.formatForAPI();
    const apiUrl = 'https://24pw8gqd0i.execute-api.us-east-1.amazonaws.com/api/v1/games/scores';
    
    // Get token from AsyncStorage
    const token = await AsyncStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token found in AsyncStorage');
    }
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(apiPayload)
      });

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ GameScore: Successfully submitted to API:', result);
      
      // Reset GameState only after successful API submission
      this.gameStateRef.reset();
      
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ GameScore: Failed to submit to API:', error);
      return { success: false, error: error.message };
    }
  }

  // Static method to create from GameState (deprecated - use create)
  static async fromGameState(gameState) {
    return await GameScore.create(gameState);
  }
}