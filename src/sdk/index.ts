// Main SDK Exports
export { GameLauncher, GameLauncherService } from './GameLauncher'
export type { GamePayload, GameLauncherProps } from './GameLauncher'

export { GameRegistry, GAME_REGISTRY, GAME_ID_MAP } from './GameRegistry'
export type { GameDefinition } from './GameRegistry'

// Import for internal use
import { GameLauncherService } from './GameLauncher'
import { GameRegistry } from './GameRegistry'
import type { GamePayload } from './GameLauncher'

// Game Exports
export { FlappyBirdGame } from './games/flappy-bird'
export type { FlappyBirdGameProps } from './games/flappy-bird'

// SDK Utility Functions
export class MobileSdk {
  /**
   * Launch a game with the provided payload
   */
  static launch(payload: GamePayload) {
    return GameLauncherService.launch(payload)
  }

  /**
   * Validate a game payload
   */
  static validatePayload(payload: any) {
    return GameLauncherService.validatePayload(payload)
  }

  /**
   * Extract note durations from payload
   */
  static extractNoteDurations(payload: GamePayload) {
    return GameLauncherService.extractNoteDurations(payload)
  }

  /**
   * Get all available games
   */
  static getAvailableGames() {
    return GameRegistry.getAllGames()
  }

  /**
   * Check if a game ID is valid
   */
  static isValidGameId(gameId: string) {
    return GameRegistry.isGameIdValid(gameId)
  }

  /**
   * Get game by ID
   */
  static getGameById(gameId: string) {
    return GameRegistry.getGameById(gameId)
  }

  /**
   * Get game by name
   */
  static getGameByName(gameName: string) {
    return GameRegistry.getGameByName(gameName)
  }
}