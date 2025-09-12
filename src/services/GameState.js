/**
 * GameState Class - Generic state container for all games
 * This class provides a standard JSON structure that all games should use
 */

import GameScore from './GameScore.ts';

export default class GameState {
  constructor() {
    this.gameId = null;
    this.contentId = null;
    this.numberOfCycles = 0;
    this.startTime = null;
    this.endTime = null;
    this.score = 0;
    this.levelConfig = null;
    this.accuracy = 0;
    this.gameType = null;
    this.gameData = {};
  }

  // Setters
  setGameId(gameId) {
    this.gameId = gameId;
    return this;
  }

  setContentId(contentId) {
    this.contentId = contentId;
    return this;
  }

  setNumberOfCycles(cycles) {
    this.numberOfCycles = cycles;
    return this;
  }

  setStartTime(startTime) {
    this.startTime = startTime;
    return this;
  }

  setEndTime(endTime) {
    this.endTime = endTime;
    return this;
  }

  setScore(score) {
    this.score = score;
    return this;
  }

  setLevelConfig(levelConfig) {
    this.levelConfig = levelConfig;
    return this;
  }

  setAccuracy(accuracy) {
    this.accuracy = accuracy;
    return this;
  }

  setGameType(gameType) {
    this.gameType = gameType;
    return this;
  }

  setGameData(gameData) {
    this.gameData = gameData;
    return this;
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

  getLevelConfig() {
    return this.levelConfig;
  }

  getAccuracy() {
    return this.accuracy;
  }

  getGameType() {
    return this.gameType;
  }

  getGameData() {
    return this.gameData;
  }

  // Convert to standard JSON structure
  toJSON() {
    return {
      gameId: this.gameId,
      contentId: this.contentId,
      numberOfCycles: this.numberOfCycles,
      startTime: this.startTime,
      endTime: this.endTime,
      score: this.score,
      levelConfig: this.levelConfig,
      accuracy: this.accuracy,
      gameType: this.gameType,
      gameData: this.gameData,
      timestamp: new Date().toISOString()
    };
  }

  // Create from JSON object
  static fromJSON(jsonData) {
    const gameState = new GameState();
    gameState.gameId = jsonData.gameId || null;
    gameState.contentId = jsonData.contentId || null;
    gameState.numberOfCycles = jsonData.numberOfCycles || 0;
    gameState.startTime = jsonData.startTime || null;
    gameState.endTime = jsonData.endTime || null;
    gameState.score = jsonData.score || 0;
    gameState.levelConfig = jsonData.levelConfig || null;
    gameState.accuracy = jsonData.accuracy || 0;
    gameState.gameType = jsonData.gameType || null;
    gameState.gameData = jsonData.gameData || {};
    return gameState;
  }

  // Validate required fields
  isValid() {
    return this.gameId !== null && 
           this.contentId !== null && 
           this.gameType !== null;
  }

  // Reset state
  reset() {
    this.gameId = null;
    this.contentId = null;
    this.numberOfCycles = 0;
    this.startTime = null;
    this.endTime = null;
    this.score = 0;
    this.levelConfig = null;
    this.accuracy = 0;
    this.gameType = null;
    this.gameData = {};
    return this;
  }

  // Process and submit game state - called by user at end of game
  async submit() {
    if (!this.isValid()) {
      throw new Error('GameState is not valid. Missing required fields.');
    }

    // Create GameScore instance asynchronously
    const gameScore = await GameScore.create(this);
    
    // Submit to API and return result
    const apiResult = await gameScore.submitToAPI();
    
    // Return both API result and session data
    return {
      apiSubmission: apiResult,
      sessionData: gameScore.exportSessionData()
    };
  }
}