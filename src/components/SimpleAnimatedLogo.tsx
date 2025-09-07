import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { IconSymbol } from './ui/IconSymbol';
import { useTheme } from '../theme/ThemeContext';

interface SimpleAnimatedLogoProps {
  onAnimationComplete?: () => void;
}

export default function SimpleAnimatedLogo({ onAnimationComplete }: SimpleAnimatedLogoProps) {
  const { theme } = useTheme();

  useEffect(() => {
    console.log('🎬 SimpleAnimatedLogo: Starting animation timer...');
    // Simple timeout instead of complex animations
    const timer = setTimeout(() => {
      console.log('🎬 SimpleAnimatedLogo: Animation complete, calling onAnimationComplete');
      onAnimationComplete?.();
    }, 2500);

    return () => {
      console.log('🎬 SimpleAnimatedLogo: Cleanup timer');
      clearTimeout(timer);
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.logoContainer}>
        <View style={[styles.logoBackground, { 
          backgroundColor: theme.surface,
          shadowColor: theme.primary
        }]}>
          <IconSymbol name="music.note" size={80} color={theme.primary} />
        </View>
      </View>
      
      <View style={styles.textContainer}>
        <Text style={[styles.quoteText, { color: theme.primary }]}>Your Musical Journey Begins</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  textContainer: {
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  quoteText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});