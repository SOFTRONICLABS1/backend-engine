/**
 * Game Score Types
 * Defines the structure for game score submissions
 */

export interface GameScorePayload {
  game_id: string
  content_id: string
  score: number
  accuracy: number
  attempts: number // Always 1 as per specification
  start_time: string // ISO timestamp
  end_time: string // ISO timestamp
  cycles: number
  level_config: Record<string, any>
}

export interface GameScoreResponse {
  success: boolean
  data?: any
  error?: string
}

export interface GameStats {
  score: number
  noteAccuracies?: number[]
  cycleAccuracies?: number[]
  completedCycles?: number
  overallAccuracy?: number
  customStats?: Record<string, any>
}