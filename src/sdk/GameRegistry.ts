import React from 'react'
import { FlappyBirdGame } from './games/flappy-bird'
import { GraphModeGame } from './games/graph-mode'

/**
 * Game Registry - Maps game names to IDs and components
 * 
 * For all games, use the navigation helpers from '@/utils/gameNavigation':
 * - handleGameExit(navigation) - for back buttons
 * - handleGameEnd(navigation, score) - when game completes
 * - handleGameError(navigation, error) - when game errors
 */

// Game Registry - Maps game names to IDs and components
export interface GameDefinition {
  id: string
  name: string
  displayName: string
  component: React.ComponentType<any>
  supportedPayloadTypes: string[]
}

export const GAME_REGISTRY: Record<string, GameDefinition> = {
  'flappy-bird': {
    id: '2d6263d7-d4a4-4074-8be3-430120ac1cc5',
    name: 'flappy-bird',
    displayName: 'Flappy Bird',
    component: FlappyBirdGame,
    supportedPayloadTypes: ['notes']
  },
  'graph-mode': {
    id: 'b3910265-9a5f-4ffc-86d8-a0449267b7ad',
    name: 'graph-mode',
    displayName: 'Graph Mode',
    component: GraphModeGame,
    supportedPayloadTypes: ['notes']
  }
}

export const GAME_ID_MAP: Record<string, string> = {
  '2d6263d7-d4a4-4074-8be3-430120ac1cc5': 'flappy-bird',
  'b3910265-9a5f-4ffc-86d8-a0449267b7ad': 'graph-mode'
}

export class GameRegistry {
  static getGameById(gameId: string): GameDefinition | null {
    const gameName = GAME_ID_MAP[gameId]
    return gameName ? GAME_REGISTRY[gameName] : null
  }

  static getGameByName(gameName: string): GameDefinition | null {
    return GAME_REGISTRY[gameName] || null
  }

  static getAllGames(): GameDefinition[] {
    return Object.values(GAME_REGISTRY)
  }

  static isGameIdValid(gameId: string): boolean {
    return gameId in GAME_ID_MAP
  }

  static getGameIds(): string[] {
    return Object.keys(GAME_ID_MAP)
  }

  static getGameNames(): string[] {
    return Object.keys(GAME_REGISTRY)
  }
}