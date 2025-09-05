import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { GameRegistry } from './GameRegistry'

// Game Payload Interface
export interface GamePayload {
  userId: string
  gameId: string
  notes?: {
    title: string
    measures: {
      notes: {
        beat: number
        pitch: string
        duration: number
      }[]
      measure_number: number
    }[]
    key_signature: string
    time_signature: string
  }
  [key: string]: any // Allow additional payload properties
}

// Game Launcher Props
export interface GameLauncherProps {
  payload: GamePayload
  onGameEnd?: (score: number) => void
  onError?: (error: string) => void
}

// Game Launcher Component
export const GameLauncher: React.FC<GameLauncherProps> = ({
  payload,
  onGameEnd,
  onError
}) => {
  // Validate payload
  if (!payload || !payload.gameId || !payload.userId) {
    const errorMsg = 'Invalid payload: missing gameId or userId'
    console.error(errorMsg, payload)
    onError?.(errorMsg)
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Invalid Game Payload</Text>
        <Text style={styles.errorText}>Missing required fields: gameId or userId</Text>
      </View>
    )
  }

  // Get game definition from registry
  const gameDefinition = GameRegistry.getGameById(payload.gameId)
  
  if (!gameDefinition) {
    const errorMsg = `Game not found for ID: ${payload.gameId}`
    console.error(errorMsg)
    onError?.(errorMsg)
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Game Not Found</Text>
        <Text style={styles.errorText}>Game ID: {payload.gameId}</Text>
        <Text style={styles.errorSubtext}>
          Available games: {GameRegistry.getGameNames().join(', ')}
        </Text>
      </View>
    )
  }

  // Extract game-specific props from payload
  const gameProps: any = {
    userId: payload.userId
  }

  // Pass notes data if available
  if (payload.notes) {
    gameProps.notes = payload.notes
  }

  // Pass onGameEnd callback
  if (onGameEnd) {
    gameProps.onGameEnd = onGameEnd
  }

  // Get game component
  const GameComponent = gameDefinition.component

  try {
    return <GameComponent {...gameProps} />
  } catch (error) {
    const errorMsg = `Failed to launch game: ${error}`
    console.error(errorMsg, error)
    onError?.(errorMsg)
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Game Launch Error</Text>
        <Text style={styles.errorText}>Failed to start {gameDefinition.displayName}</Text>
        <Text style={styles.errorSubtext}>{String(error)}</Text>
      </View>
    )
  }
}

// Game Launcher Class - For programmatic usage
export class GameLauncherService {
  static launch(payload: GamePayload): {
    success: boolean
    gameDefinition?: typeof GameRegistry extends { getGameById: (id: string) => infer T } ? T : never
    error?: string
  } {
    // Validate payload
    if (!payload || !payload.gameId || !payload.userId) {
      return {
        success: false,
        error: 'Invalid payload: missing gameId or userId'
      }
    }

    // Get game definition
    const gameDefinition = GameRegistry.getGameById(payload.gameId)
    
    if (!gameDefinition) {
      return {
        success: false,
        error: `Game not found for ID: ${payload.gameId}`
      }
    }

    return {
      success: true,
      gameDefinition
    }
  }

  static validatePayload(payload: any): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!payload) {
      errors.push('Payload is required')
      return { isValid: false, errors }
    }

    if (!payload.userId || typeof payload.userId !== 'string') {
      errors.push('userId is required and must be a string')
    }

    if (!payload.gameId || typeof payload.gameId !== 'string') {
      errors.push('gameId is required and must be a string')
    }

    if (payload.gameId && !GameRegistry.isGameIdValid(payload.gameId)) {
      errors.push(`Invalid gameId: ${payload.gameId}. Valid IDs: ${GameRegistry.getGameIds().join(', ')}`)
    }

    // Validate notes structure if provided
    if (payload.notes) {
      if (!payload.notes.title || typeof payload.notes.title !== 'string') {
        errors.push('notes.title must be a string')
      }
      
      if (!Array.isArray(payload.notes.measures)) {
        errors.push('notes.measures must be an array')
      } else {
        payload.notes.measures.forEach((measure: any, index: number) => {
          if (!Array.isArray(measure.notes)) {
            errors.push(`notes.measures[${index}].notes must be an array`)
          }
          if (typeof measure.measure_number !== 'number') {
            errors.push(`notes.measures[${index}].measure_number must be a number`)
          }
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  static extractNoteDurations(payload: GamePayload): number[] {
    if (!payload.notes || !Array.isArray(payload.notes.measures)) {
      return []
    }

    const durations: number[] = []
    payload.notes.measures.forEach(measure => {
      if (Array.isArray(measure.notes)) {
        measure.notes.forEach(note => {
          if (typeof note.duration === 'number') {
            durations.push(note.duration)
          }
        })
      }
    })

    return durations
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    marginTop: 10,
  },
})