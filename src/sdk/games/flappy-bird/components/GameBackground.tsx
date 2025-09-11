import React from 'react'
import { View, Image as RNImage, useWindowDimensions } from 'react-native'

interface GameBackgroundProps {
  gameState: 'menu' | 'playing' | 'dying' | 'gameOver'
  backgroundOffset: number
}

export const GameBackground: React.FC<GameBackgroundProps> = ({
  gameState,
  backgroundOffset,
}) => {
  const { width, height } = useWindowDimensions()

  if (gameState !== 'playing' && gameState !== 'dying') {
    return null
  }

  return (
    <>
      {/* First background image */}
      <RNImage
        source={require('../assets/background.jpg')}
        style={{
          position: 'absolute',
          left: -backgroundOffset,
          top: 0,
          width: width,
          height: height,
          zIndex: 1,
        }}
        resizeMode="cover"
      />
      {/* Second background image for seamless scrolling */}
      <RNImage
        source={require('../assets/background.jpg')}
        style={{
          position: 'absolute',
          left: width - backgroundOffset,
          top: 0,
          width: width,
          height: height,
          zIndex: 1,
        }}
        resizeMode="cover"
      />
    </>
  )
}