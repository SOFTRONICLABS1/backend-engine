import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { useAndroidPerformance } from '@/hooks/useAndroidPerformance';

interface GameLoopConfig {
  targetFPS?: number;
  adaptiveFPS?: boolean;
  prioritizeAudio?: boolean;
}

export const useOptimizedGameLoop = (
  updateCallback: () => void,
  isRunning: boolean,
  config: GameLoopConfig = {}
) => {
  const {
    targetFPS = Platform.OS === 'android' ? 30 : 60,
    adaptiveFPS = Platform.OS === 'android',
    prioritizeAudio = true,
  } = config;

  const { throttledUpdate, currentFPS, shouldReduceQuality } = useAndroidPerformance({
    enableThrottling: Platform.OS === 'android',
    throttleMs: 1000 / targetFPS,
    prioritizeAudio,
  });

  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const animationIdRef = useRef<number | null>(null);
  const accumulatorRef = useRef<number>(0);

  // Adaptive frame rate based on performance
  const getAdaptiveInterval = useCallback(() => {
    if (!adaptiveFPS) return 1000 / targetFPS;

    // Reduce frame rate if performance is poor
    if (currentFPS < 25) return 1000 / 20; // Drop to 20 FPS
    if (currentFPS < 40) return 1000 / 30; // Drop to 30 FPS
    return 1000 / targetFPS;
  }, [targetFPS, currentFPS, adaptiveFPS]);

  // Fixed timestep game loop for Android
  const androidGameLoop = useCallback(() => {
    if (!isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;

    const fixedTimeStep = getAdaptiveInterval();
    accumulatorRef.current += deltaTime;

    // Process updates with fixed timestep
    while (accumulatorRef.current >= fixedTimeStep) {
      throttledUpdate(updateCallback);
      accumulatorRef.current -= fixedTimeStep;
    }

    animationIdRef.current = requestAnimationFrame(androidGameLoop);
  }, [isRunning, updateCallback, throttledUpdate, getAdaptiveInterval]);

  // Standard game loop for iOS
  const standardGameLoop = useCallback(() => {
    if (!isRunning) return;

    updateCallback();
    animationIdRef.current = requestAnimationFrame(standardGameLoop);
  }, [isRunning, updateCallback]);

  useEffect(() => {
    if (!isRunning) {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      return;
    }

    lastTimeRef.current = performance.now();
    accumulatorRef.current = 0;

    // Use optimized loop for Android
    if (Platform.OS === 'android') {
      androidGameLoop();
    } else {
      standardGameLoop();
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [isRunning, androidGameLoop, standardGameLoop]);

  return {
    currentFPS,
    shouldReduceQuality: shouldReduceQuality(),
    isOptimized: Platform.OS === 'android',
  };
};