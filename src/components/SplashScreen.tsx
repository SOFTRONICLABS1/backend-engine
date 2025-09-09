import React from 'react';
import { View, StyleSheet } from 'react-native';
import SimpleAnimatedLogo from './SimpleAnimatedLogo';
import { useTheme } from '../theme/ThemeContext';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SimpleAnimatedLogo onAnimationComplete={onComplete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});