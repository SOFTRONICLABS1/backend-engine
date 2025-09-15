import { useEffect, useRef, useCallback } from 'react';
import { Platform, InteractionManager } from 'react-native';

interface PerformanceConfig {
  enableThrottling?: boolean;
  throttleMs?: number;
  prioritizeAudio?: boolean;
  reducedAnimations?: boolean;
  optimizeRenderBatching?: boolean;
}

const DEFAULT_CONFIG: PerformanceConfig = {
  enableThrottling: Platform.OS === 'android',
  throttleMs: 16, // ~60fps
  prioritizeAudio: true,
  reducedAnimations: Platform.OS === 'android',
  optimizeRenderBatching: Platform.OS === 'android',
};

export const useAndroidPerformance = (config: PerformanceConfig = {}) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const lastUpdateRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsRef = useRef<number>(60);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let lastTime = performance.now();
    let frames = 0;

    const measureFPS = () => {
      frames++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        fpsRef.current = Math.round((frames * 1000) / (currentTime - lastTime));
        frames = 0;
        lastTime = currentTime;
      }

      animationFrameRef.current = requestAnimationFrame(measureFPS);
    };

    if (mergedConfig.optimizeRenderBatching) {
      measureFPS();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mergedConfig.optimizeRenderBatching]);

  const throttledUpdate = useCallback((callback: () => void) => {
    if (!mergedConfig.enableThrottling) {
      callback();
      return;
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    if (timeSinceLastUpdate >= mergedConfig.throttleMs!) {
      lastUpdateRef.current = now;

      if (Platform.OS === 'android' && mergedConfig.prioritizeAudio) {
        // Defer UI updates to next frame to prioritize audio processing
        InteractionManager.runAfterInteractions(() => {
          callback();
        });
      } else {
        callback();
      }
    }
  }, [mergedConfig]);

  const shouldReduceQuality = useCallback(() => {
    if (Platform.OS !== 'android') return false;

    // Reduce quality if FPS drops below 30
    return fpsRef.current < 30;
  }, []);

  const getOptimizedValue = useCallback(<T,>(highQuality: T, lowQuality: T): T => {
    return shouldReduceQuality() ? lowQuality : highQuality;
  }, [shouldReduceQuality]);

  return {
    throttledUpdate,
    shouldReduceQuality,
    getOptimizedValue,
    currentFPS: fpsRef.current,
    isAndroid: Platform.OS === 'android',
    config: mergedConfig,
  };
};

// Performance optimizations for animations
export const getAndroidAnimationConfig = () => {
  if (Platform.OS !== 'android') {
    return {
      useNativeDriver: true,
      duration: 300,
      friction: 8,
      tension: 40,
    };
  }

  return {
    useNativeDriver: true,
    duration: 200, // Faster animations on Android
    friction: 12, // Higher friction for quicker stops
    tension: 60, // Higher tension for snappier feel
  };
};

// Optimize list rendering for Android
export const getAndroidListConfig = () => {
  const baseConfig = {
    initialNumToRender: 10,
    maxToRenderPerBatch: 5,
    updateCellsBatchingPeriod: 50,
    windowSize: 10,
    removeClippedSubviews: true,
  };

  if (Platform.OS === 'android') {
    return {
      ...baseConfig,
      initialNumToRender: 5, // Render fewer items initially
      maxToRenderPerBatch: 3, // Smaller batches
      updateCellsBatchingPeriod: 100, // Longer batching period
      windowSize: 5, // Smaller window
      removeClippedSubviews: true,
      getItemLayout: undefined, // Let Android optimize
    };
  }

  return baseConfig;
};