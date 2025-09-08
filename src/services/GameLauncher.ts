/**
 * Game Launcher
 * Handles game launching, configuration, and lifecycle management
 */

import GameRegistry, { GameConfig, GamePayload } from './GameRegistry';

export interface GameLaunchConfig {
  gameId: string;
  userId: string;
  musicData: GamePayload['notes'];
  customSettings?: {
    [key: string]: any;
  };
}

export interface GameInstance {
  id: string;
  gameId: string;
  userId: string;
  config: GameConfig;
  musicData: GamePayload['notes'];
  settings: {
    [key: string]: any;
  };
  startTime: Date;
  status: 'initializing' | 'running' | 'paused' | 'completed' | 'failed';
}

class GameLauncher {
  private activeGames: Map<string, GameInstance> = new Map();

  /**
   * Launch a game with the provided payload
   */
  async launchGame(payload: GamePayload, customSettings?: { [key: string]: any }): Promise<GameInstance> {
    console.log('🚀 Launching game with payload:', payload);

    // Get game configuration from registry
    const gameConfig = GameRegistry.getGame(payload.gameId);
    if (!gameConfig) {
      throw new Error(`Game not found: ${payload.gameId}`);
    }

    // Generate unique instance ID
    const instanceId = this.generateInstanceId();

    // Process music data for game-specific configurations
    const processedSettings = this.processMusicData(gameConfig, payload.notes, customSettings);

    // Create game instance
    const gameInstance: GameInstance = {
      id: instanceId,
      gameId: payload.gameId,
      userId: payload.userId,
      config: gameConfig,
      musicData: payload.notes,
      settings: {
        ...gameConfig.settings,
        ...processedSettings,
        ...customSettings
      },
      startTime: new Date(),
      status: 'initializing'
    };

    // Store active game instance
    this.activeGames.set(instanceId, gameInstance);

    console.log(`🎮 Game instance created: ${gameConfig.name} (${instanceId})`);
    console.log('🎵 Music data:', payload.notes);
    console.log('⚙️ Game settings:', gameInstance.settings);

    // Update status to running
    gameInstance.status = 'running';

    return gameInstance;
  }

  /**
   * Process music data to extract game-specific configurations
   */
  private processMusicData(gameConfig: GameConfig, musicData: GamePayload['notes'], customSettings?: { [key: string]: any }): { [key: string]: any } {
    const settings: { [key: string]: any } = {};

    // Game-specific processing
    switch (gameConfig.id) {
      case '2d6263d7-d4a4-4074-8be3-430120ac1cc5': // Flappy Bird
        settings.pipeConfigs = this.processFlappyBirdMusic(musicData);
        break;
      
      // Add more games here
      default:
        console.warn(`No specific music processing for game: ${gameConfig.id}`);
    }

    return settings;
  }

  /**
   * Process music data specifically for Flappy Bird game
   */
  private processFlappyBirdMusic(musicData: GamePayload['notes']): Array<{ position: number; width: number; gap: number }> {
    const pipeConfigs: Array<{ position: number; width: number; gap: number }> = [];
    let currentPosition = 300; // Starting position for first pipe

    // Process each measure
    musicData.measures.forEach((measure, measureIndex) => {
      measure.notes.forEach((note, noteIndex) => {
        // Use note duration to determine pipe width
        const pipeWidth = Math.max(50, Math.min(150, note.duration)); // Clamp between 50-150px
        
        // Use pitch to determine pipe gap (higher pitch = larger gap)
        const pitchNumber = this.pitchToNumber(note.pitch);
        const pipeGap = Math.max(120, Math.min(250, 120 + (pitchNumber * 10))); // Clamp between 120-250px

        pipeConfigs.push({
          position: currentPosition,
          width: pipeWidth,
          gap: pipeGap
        });

        // Space pipes based on note beat and duration
        currentPosition += 200 + (note.duration * 2); // Base spacing + duration-based spacing
      });
    });

    console.log('🎵 Generated pipe configurations:', pipeConfigs);
    return pipeConfigs;
  }

  /**
   * Convert musical pitch to numeric value for calculations
   */
  private pitchToNumber(pitch: string): number {
    const noteMap: { [key: string]: number } = {
      'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6
    };
    
    const note = pitch.charAt(0);
    const octave = parseInt(pitch.substring(1)) || 4;
    
    return (octave * 7) + (noteMap[note] || 0);
  }

  /**
   * Get active game instance
   */
  getGameInstance(instanceId: string): GameInstance | undefined {
    return this.activeGames.get(instanceId);
  }

  /**
   * Get all active games for a user
   */
  getUserGames(userId: string): GameInstance[] {
    return Array.from(this.activeGames.values()).filter(game => game.userId === userId);
  }

  /**
   * Update game instance status
   */
  updateGameStatus(instanceId: string, status: GameInstance['status']): boolean {
    const game = this.activeGames.get(instanceId);
    if (game) {
      game.status = status;
      console.log(`🎮 Game ${instanceId} status updated to: ${status}`);
      return true;
    }
    return false;
  }

  /**
   * Pause a game
   */
  pauseGame(instanceId: string): boolean {
    return this.updateGameStatus(instanceId, 'paused');
  }

  /**
   * Resume a game
   */
  resumeGame(instanceId: string): boolean {
    return this.updateGameStatus(instanceId, 'running');
  }

  /**
   * End a game and clean up resources
   */
  endGame(instanceId: string, status: 'completed' | 'failed' = 'completed'): boolean {
    const game = this.activeGames.get(instanceId);
    if (game) {
      game.status = status;
      
      // Log game session info
      const duration = Date.now() - game.startTime.getTime();
      console.log(`🏁 Game ended: ${game.config.name} (${instanceId})`);
      console.log(`⏱️ Duration: ${Math.round(duration / 1000)}s`);
      console.log(`📊 Status: ${status}`);

      // Remove from active games after a delay to allow for cleanup
      setTimeout(() => {
        this.activeGames.delete(instanceId);
        console.log(`🗑️ Cleaned up game instance: ${instanceId}`);
      }, 5000); // 5 second delay

      return true;
    }
    return false;
  }

  /**
   * Get all active game instances
   */
  getActiveGames(): GameInstance[] {
    return Array.from(this.activeGames.values());
  }

  /**
   * Generate unique instance ID
   */
  private generateInstanceId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup inactive games (called periodically)
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    this.activeGames.forEach((game, instanceId) => {
      const age = now - game.startTime.getTime();
      if (age > maxAge && (game.status === 'completed' || game.status === 'failed')) {
        this.activeGames.delete(instanceId);
        console.log(`🧹 Cleaned up old game instance: ${instanceId}`);
      }
    });
  }
}

// Export singleton instance
export default new GameLauncher();