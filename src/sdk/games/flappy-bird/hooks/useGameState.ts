import { useState, useRef, useCallback } from 'react'
import { useWindowDimensions } from 'react-native'

export interface Bird {
  x: number
  y: number
  velocity: number
}

export interface Pipe {
  id: number
  x: number
  topHeight: number
  bottomY: number
  width: number
  passed: boolean
}

export const useGameState = () => {
  const { width, height } = useWindowDimensions()
  
  // Game state
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'dying' | 'gameOver'>('menu')
  const [bird, setBird] = useState<Bird>({ x: width * 0.2, y: height / 2, velocity: 0 })
  const [pipes, setPipes] = useState<Pipe[]>([])
  const [score, setScore] = useState(0)
  const [cycle, setCycle] = useState(0)
  const [isInitializing, setIsInitializing] = useState(true)
  const [backgroundOffset, setBackgroundOffset] = useState(0)
  
  // Pitch accuracy tracking
  const [noteAccuracies, setNoteAccuracies] = useState<number[]>([])
  const [cycleAccuracies, setCycleAccuracies] = useState<number[]>([])
  const [currentNoteAccuracy, setCurrentNoteAccuracy] = useState<number>(0)
  
  // Screen shake effect
  const [screenShake, setScreenShake] = useState({ x: 0, y: 0 })
  const shakeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Death animation
  const deathAnimationTimer = useRef<NodeJS.Timeout | null>(null)

  const startGame = useCallback(() => {
    setGameState('playing')
    setBird({ x: width * 0.2, y: height / 2, velocity: 0 })
    setPipes([])
    setScore(0)
    setBackgroundOffset(0)
    setScreenShake({ x: 0, y: 0 })
    if (shakeTimeoutRef.current) {
      clearTimeout(shakeTimeoutRef.current)
      shakeTimeoutRef.current = null
    }
  }, [width, height])

  const resetGame = useCallback(() => {
    setGameState('menu')
    setBird({ x: width * 0.2, y: height / 2, velocity: 0 })
    setPipes([])
    setScore(0)
    setCycle(0)
    setBackgroundOffset(0)
    setNoteAccuracies([])
    setCycleAccuracies([])
    setCurrentNoteAccuracy(0)
    setScreenShake({ x: 0, y: 0 })
    
    // Clear any existing timers
    if (shakeTimeoutRef.current) {
      clearTimeout(shakeTimeoutRef.current)
      shakeTimeoutRef.current = null
    }
    if (deathAnimationTimer.current) {
      clearTimeout(deathAnimationTimer.current)
      deathAnimationTimer.current = null
    }
  }, [width, height])

  const triggerScreenShake = useCallback(() => {
    const shakeIntensity = 8
    const shakeDuration = 300
    
    setScreenShake({
      x: (Math.random() - 0.5) * shakeIntensity,
      y: (Math.random() - 0.5) * shakeIntensity
    })
    
    if (shakeTimeoutRef.current) {
      clearTimeout(shakeTimeoutRef.current)
    }
    
    shakeTimeoutRef.current = setTimeout(() => {
      setScreenShake({ x: 0, y: 0 })
      shakeTimeoutRef.current = null
    }, shakeDuration)
  }, [])

  const triggerDeathAnimation = useCallback(() => {
    setGameState('dying')
    triggerScreenShake()
    
    deathAnimationTimer.current = setTimeout(() => {
      setGameState('gameOver')
      deathAnimationTimer.current = null
    }, 1000)
  }, [triggerScreenShake])

  const getOverallAccuracy = useCallback(() => {
    if (cycleAccuracies.length > 0) {
      const average = cycleAccuracies.reduce((sum, acc) => sum + acc, 0) / cycleAccuracies.length
      return { cycleAccuracy: average, noteAccuracy: null }
    } else if (noteAccuracies.length > 0) {
      const average = noteAccuracies.reduce((sum, acc) => sum + acc, 0) / noteAccuracies.length
      return { cycleAccuracy: null, noteAccuracy: average }
    }
    return { cycleAccuracy: null, noteAccuracy: null }
  }, [cycleAccuracies, noteAccuracies])

  return {
    // State
    gameState,
    bird,
    pipes,
    score,
    cycle,
    isInitializing,
    backgroundOffset,
    noteAccuracies,
    cycleAccuracies,
    currentNoteAccuracy,
    screenShake,
    
    // Setters
    setGameState,
    setBird,
    setPipes,
    setScore,
    setCycle,
    setIsInitializing,
    setBackgroundOffset,
    setNoteAccuracies,
    setCycleAccuracies,
    setCurrentNoteAccuracy,
    
    // Actions
    startGame,
    resetGame,
    triggerScreenShake,
    triggerDeathAnimation,
    getOverallAccuracy,
    
    // Refs
    shakeTimeoutRef,
    deathAnimationTimer,
  }
}