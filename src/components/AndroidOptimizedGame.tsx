import React, { ReactNode, useEffect } from 'react';
import { View, Platform, StyleSheet, InteractionManager } from 'react-native';
import { useAndroidPerformance } from '@/hooks/useAndroidPerformance';

interface AndroidOptimizedGameProps {
  children: ReactNode;
  gameType?: 'audio' | 'visual' | 'mixed';
}

export const AndroidOptimizedGame: React.FC<AndroidOptimizedGameProps> = ({
  children,
  gameType = 'mixed'
}) => {
  const { config, currentFPS } = useAndroidPerformance({
    prioritizeAudio: gameType === 'audio' || gameType === 'mixed',
    reducedAnimations: Platform.OS === 'android',
    optimizeRenderBatching: true,
  });

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    // Set Android-specific render optimizations
    InteractionManager.runAfterInteractions(() => {
      // Defer non-critical updates
      console.log('Android game optimization active - FPS:', currentFPS);
    });

    // Request high performance mode on Android
    if (global.requestAnimationFrame) {
      const originalRAF = global.requestAnimationFrame;

      // Throttle animation frames on low-end devices
      if (currentFPS < 30) {
        let skip = false;
        global.requestAnimationFrame = (callback: FrameRequestCallback) => {
          if (skip) {
            skip = false;
            return originalRAF(() => {
              skip = true;
              callback(performance.now());
            });
          }
          skip = true;
          return originalRAF(callback);
        };

        return () => {
          global.requestAnimationFrame = originalRAF;
        };
      }
    }
  }, [currentFPS]);

  return (
    <View style={[styles.container, Platform.OS === 'android' && styles.androidContainer]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  androidContainer: {
    // Android-specific optimizations
    backgroundColor: 'black', // Reduce overdraw
    renderToHardwareTextureAndroid: true,
    needsOffscreenAlphaCompositing: false,
  },
});