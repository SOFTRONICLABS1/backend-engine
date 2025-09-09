/**
 * Game Registry
 * Central registry for all available games and their configurations
 */

export interface GameConfig {
  id: string;
  name: string;
  description: string;
  component: string;
  thumbnail?: string;
  category: string;
  settings?: {
    [key: string]: any;
  };
}

export interface GamePayload {
  userId: string;
  gameId: string;
  notes: {
    title: string;
    measures: Array<{
      notes: Array<{
        beat: number;
        pitch: string;
        duration: number;
      }>;
      measure_number: number;
    }>;
    key_signature: string;
    time_signature: string;
  };
}

class GameRegistry {
  private games: Map<string, GameConfig> = new Map();

  constructor() {
    this.initializeGames();
  }

  private initializeGames() {
    // Flappy Bird Game Configuration
    this.registerGame({
      id: '2d6263d7-d4a4-4074-8be3-430120ac1cc5',
      name: 'Flappy Bird',
      description: 'Navigate through pipes with musical rhythm',
      component: 'FlappyBirdGame',
      thumbnail: 'flappy-bird-thumbnail.png',
      category: 'rhythm',
      settings: {
        defaultPipeWidth: 100,
        pipeGap: 200,
        gravity: 0.5,
        jumpStrength: -8,
        gameSpeed: 2
      }
    });

    // Add more games here as needed
    // this.registerGame({
    //   id: 'another-game-id',
    //   name: 'Another Game',
    //   description: 'Another musical game',
    //   component: 'AnotherGame',
    //   category: 'puzzle'
    // });
  }

  /**
   * Register a new game in the registry
   */
  registerGame(config: GameConfig): void {
    this.games.set(config.id, config);
    console.log(`🎮 Registered game: ${config.name} (${config.id})`);
  }

  /**
   * Get game configuration by ID
   */
  getGame(gameId: string): GameConfig | undefined {
    return this.games.get(gameId);
  }

  /**
   * Get all registered games
   */
  getAllGames(): GameConfig[] {
    return Array.from(this.games.values());
  }

  /**
   * Get games by category
   */
  getGamesByCategory(category: string): GameConfig[] {
    return Array.from(this.games.values()).filter(game => game.category === category);
  }

  /**
   * Check if a game exists
   */
  hasGame(gameId: string): boolean {
    return this.games.has(gameId);
  }

  /**
   * Remove a game from registry
   */
  unregisterGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (game) {
      this.games.delete(gameId);
      console.log(`🗑️ Unregistered game: ${game.name} (${gameId})`);
      return true;
    }
    return false;
  }

  /**
   * Get game categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    this.games.forEach(game => categories.add(game.category));
    return Array.from(categories);
  }

  /**
   * Search games by name or description
   */
  searchGames(query: string): GameConfig[] {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.games.values()).filter(game =>
      game.name.toLowerCase().includes(lowercaseQuery) ||
      game.description.toLowerCase().includes(lowercaseQuery)
    );
  }
}

// Export singleton instance
export default new GameRegistry();