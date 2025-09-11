import React, { useEffect, useCallback, useMemo } from 'react'
import { View, TouchableOpacity, useWindowDimensions, StyleSheet, Image as RNImage } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { handleGameExit } from '@/utils/gameNavigation'

// Import modular components
import { GameUI, GameOverScreen, BackButton, GameBackground } from './components'

// Import custom hooks
import { useGameState, useGamePhysics, useGameAudio } from './hooks'

// Import existing hooks and utilities
import { useGlobalPitchDetection } from '@/hooks/useGlobalPitchDetection'
import { useGameScreenMicrophone } from '@/hooks/useGameScreenMicrophone'
import { useUiStore } from '@/stores/uiStore'
import RequireMicAccess from '@/components/RequireMicAccess'

interface Note {
  name: string
  frequency: number
  duration: number
  key_signature: string
  time_signature: string
}

interface FlappyBirdGameProps {
  notes: Note[]
  onGameEnd?: (score: number) => void
}

export const FlappyBirdGame: React.FC<FlappyBirdGameProps> = ({ notes, onGameEnd }) => {
  const navigation = useNavigation()
  const { width, height } = useWindowDimensions()
  const { micAccess } = useGameScreenMicrophone()
  const { gameStarted } = useUiStore()

  // Main game state management
  const gameStateHook = useGameState()
  const {
    gameState,
    bird,
    pipes,
    score,
    cycle,
    backgroundOffset,
    noteAccuracies,
    screenShake,
    startGame,
    resetGame,
    getOverallAccuracy,
    triggerDeathAnimation,
    setCurrentNoteIndex,
    setCurrentNoteAccuracy,
    setNoteAccuracies,
    setCycleAccuracies,
    setCycle,
  } = gameStateHook

  // Game physics
  const physicsHook = useGamePhysics({
    bird,
    pipes,
    setBird: gameStateHook.setBird,
    setPipes: gameStateHook.setPipes,
    setScore: gameStateHook.setScore,
    setBackgroundOffset: gameStateHook.setBackgroundOffset,
    triggerDeathAnimation,
  })

  // Game audio and pitch detection
  const audioHook = useGameAudio({
    notes,
    currentNoteIndex: 0, // You might want to track this in gameState
    setCurrentNoteIndex,
    setCurrentNoteAccuracy,
    setNoteAccuracies,
    setCycleAccuracies,
    setCycle,
    jump: physicsHook.actions.jump,
  })

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return

    const gameLoop = setInterval(() => {
      physicsHook.actions.updateBird()
      physicsHook.actions.updatePipes()
      physicsHook.actions.updateBackground()
      physicsHook.actions.checkCollision()
    }, 16) // ~60 FPS

    return () => clearInterval(gameLoop)
  }, [gameState, physicsHook.actions])

  // Pipe generation
  useEffect(() => {
    if (gameState !== 'playing') return

    const pipeGenerator = setInterval(() => {
      physicsHook.actions.generatePipe()
    }, 2000) // Generate pipe every 2 seconds

    return () => clearInterval(pipeGenerator)
  }, [gameState, physicsHook.actions])

  // Auto-start game when component mounts
  useEffect(() => {
    if (gameStarted && gameState === 'menu' && micAccess === 'granted') {
      startGame()
    }
  }, [gameStarted, gameState, micAccess, startGame])

  // Handle game end
  useEffect(() => {
    if (gameState === 'gameOver' && onGameEnd) {
      onGameEnd(score)
    }
  }, [gameState, score, onGameEnd])

  // Handle touch/tap input
  const handleScreenTouch = useCallback(() => {
    if (gameState === 'playing') {
      physicsHook.actions.jump()
    } else if (gameState === 'menu') {
      startGame()
    }
  }, [gameState, physicsHook.actions, startGame])

  // Handle back navigation
  const handleBackPress = useCallback(() => {
    handleGameExit(navigation as any)
  }, [navigation])

  // Render game canvas with pipes and bird
  const renderGameCanvas = useMemo(() => {
    if (gameState === 'menu' || gameState === 'gameOver') return null

    return (
      <>
        {/* Pipe Images */}
        {pipes.map(pipe => (
          <React.Fragment key={`pipe-${pipe.id}`}>
            {/* Top pipe */}
            <RNImage
              source={require('./assets/top-pole.png')}
              style={{
                position: 'absolute',
                left: pipe.x,
                top: 0,
                width: pipe.width,
                height: pipe.topHeight,
                zIndex: 3,
              }}
              resizeMode="stretch"
            />
            {/* Bottom pipe */}
            <RNImage
              source={require('./assets/bottom-pole.png')}
              style={{
                position: 'absolute',
                left: pipe.x,
                top: pipe.bottomY,
                width: pipe.width,
                height: height - pipe.bottomY,
                zIndex: 3,
              }}
              resizeMode="stretch"
            />
          </React.Fragment>
        ))}

        {/* Bird */}
        <RNImage
          source={require('./assets/bird.png')}
          style={{
            position: 'absolute',
            left: bird.x,
            top: bird.y,
            width: physicsHook.constants.BIRD_SIZE * 1.2,
            height: physicsHook.constants.BIRD_SIZE * 1.2,
            zIndex: 5,
          }}
          resizeMode="contain"
        />
      </>
    )
  }, [gameState, pipes, bird, height, physicsHook.constants.BIRD_SIZE])

  // Microphone access check
  if (micAccess === 'denied') return <RequireMicAccess />
  if (micAccess === 'pending' || micAccess === 'requesting') return null

  // Game Over Screen
  if (gameState === 'gameOver') {
    return (
      <GameOverScreen
        score={score}
        cycle={cycle}
        noteAccuracies={noteAccuracies}
        onPlayAgain={startGame}
        onMenu={resetGame}
        getOverallAccuracy={getOverallAccuracy}
      />
    )
  }

  // Main Game Render
  return (
    <TouchableOpacity
      style={[styles.container, {
        transform: [
          { translateX: screenShake.x },
          { translateY: screenShake.y }
        ]
      }]}
      onPress={handleScreenTouch}
      activeOpacity={1}
    >
      <BackButton onPress={handleBackPress} />
      
      <GameBackground 
        gameState={gameState}
        backgroundOffset={backgroundOffset}
      />
      
      {renderGameCanvas}
      
      <GameUI
        score={score}
        cycle={cycle}
        gameState={gameState}
        onPause={resetGame}
        getOverallAccuracy={getOverallAccuracy}
      />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
})

export default FlappyBirdGame