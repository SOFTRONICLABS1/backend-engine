/**
 * GameScore Class - Processes game state and creates score records
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameScorePayload, GameScoreResponse } from '../types/GameScore';

interface GameStateInterface {
  isValid(): boolean;
  getGameId(): string;
  getContentId(): string;
  getNumberOfCycles(): number;
  getStartTime(): string;
  getEndTime(): string;
  getScore(): number;
  getLevelConfig(): Record<string, any>;
  getAccuracy(): number;
  getGameType(): string;
  getGameData(): any;
  reset(): void;
}

export default class GameScore {
  private gameId: string = '';
  private contentId: string = '';
  private numberOfCycles: number = 0;
  private startTime: string = '';
  private endTime: string = '';
  private score: number = 0;
  private level: Record<string, any> = {};
  private overallAccuracy: number = 0;
  private gameType: string = '';
  private gameData: any = null;
  private sessionDuration: number = 0;
  private sessionId: string = '';
  private gameStateRef?: GameStateInterface;

  static async create(gameState: GameStateInterface): Promise<GameScore> {
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
    instance.sessionDuration = instance.endTime && instance.startTime ? new Date(instance.endTime).getTime() - new Date(instance.startTime).getTime() : 0;
    instance.sessionId = instance.generateSessionId();
    
    // Store reference to GameState for later reset
    instance.gameStateRef = gameState;
    
    return instance;
  }

  private constructor() {
    // Private constructor - use static create method
  }

  private generateSessionId(): string {
    return `game_${this.gameId}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // Setters
  setGameId(gameId: string): void {
    this.gameId = gameId;
  }

  setContentId(contentId: string): void {
    this.contentId = contentId;
  }

  setNumberOfCycles(cycles: number): void {
    this.numberOfCycles = cycles;
  }

  setStartTime(startTime: string): void {
    this.startTime = startTime;
    this.updateSessionDuration();
  }

  setEndTime(endTime: string): void {
    this.endTime = endTime;
    this.updateSessionDuration();
  }

  setScore(score: number): void {
    this.score = score;
  }

  setLevel(levelConfig: Record<string, any>): void {
    this.level = levelConfig;
  }

  setOverallAccuracy(accuracy: number): void {
    this.overallAccuracy = accuracy;
  }

  private updateSessionDuration(): void {
    if (this.endTime && this.startTime) {
      this.sessionDuration = new Date(this.endTime).getTime() - new Date(this.startTime).getTime();
    }
  }

  // Getters
  getGameId(): string {
    return this.gameId;
  }

  getContentId(): string {
    return this.contentId;
  }

  getNumberOfCycles(): number {
    return this.numberOfCycles;
  }

  getStartTime(): string {
    return this.startTime;
  }

  getEndTime(): string {
    return this.endTime;
  }

  getScore(): number {
    return this.score;
  }

  getLevel(): Record<string, any> {
    return this.level;
  }

  getOverallAccuracy(): number {
    return this.overallAccuracy;
  }

  getSessionDuration(): number {
    return this.sessionDuration;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  // Export session data
  exportSessionData(): Record<string, any> {
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

  // Format data for API submission - Updated to match new payload format
  formatForAPI(): GameScorePayload {
    return {
      game_id: this.gameId,
      content_id: this.contentId,
      score: this.score,
      accuracy: (this.overallAccuracy !== null && this.overallAccuracy !== undefined) ? this.overallAccuracy : 0,
      attempts: 1, // Always set to 1 as specified
      start_time: this.startTime,
      end_time: this.endTime,
      cycles: this.numberOfCycles || 0,
      level_config: this.level || {}
    };
  }

  // Submit score to API (fire-and-forget)
  async submitToAPI(): Promise<GameScoreResponse> {
    const apiPayload = this.formatForAPI();
    const apiUrl = 'https://24pw8gqd0i.execute-api.us-east-1.amazonaws.com/api/v1/games/score-logs';

    // Log the complete API payload
    console.log('🎯 GameScore: Complete API Payload:', JSON.stringify(apiPayload, null, 2));

    // Get token from AsyncStorage
    const token = await AsyncStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token found in AsyncStorage');
    }

    // Fire-and-forget: send payload without waiting for response
    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(apiPayload)
    }).then(response => {
      if (response.ok) {
        console.log('✅ GameScore: Successfully submitted to API');
      } else {
        console.error('❌ GameScore: Failed to submit to API:', response.status);
      }
    }).catch(error => {
      console.error('❌ GameScore: Failed to submit to API:', error);
    });

    // Reset GameState immediately since we're not waiting for response
    if (this.gameStateRef) {
      this.gameStateRef.reset();
    }

    // Return success immediately
    return { success: true, data: null };
  }

  // Static method to create from GameState (deprecated - use create)
  static async fromGameState(gameState: GameStateInterface): Promise<GameScore> {
    return await GameScore.create(gameState);
  }
}