import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Pressable,
  Text,
} from 'react-native';
import { IconSymbol } from './ui/IconSymbol';
import { useTheme } from '../theme/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

const slides = [
  {
    id: 1,
    title: 'Play games to Learn Music',
    description: 'Discover the joy of music through interactive games designed to make learning fun and engaging.',
    icon: 'gamecontroller.fill',
  },
  {
    id: 2,
    title: 'Learn from top teachers',
    description: 'Get expert guidance from professional musicians and certified music instructors.',
    icon: 'person.3.fill',
  },
  {
    id: 3,
    title: 'Track your progress',
    description: 'Monitor your musical journey with detailed analytics and personalized insights.',
    icon: 'chart.line.uptrend.xyaxis',
  },
];

export default function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const slideColors = [theme.primary, theme.primary, theme.primary];

  const handleScroll = (event: any) => {
    const slideSize = SCREEN_WIDTH;
    const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
    setCurrentIndex(index);
  };

  const scrollToSlide = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });
    setCurrentIndex(index);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.scrollView}
      >
        {slides.map((slide, index) => (
          <View key={slide.id} style={styles.slide}>
            <View style={styles.contentContainer}>
              {/* Infographic Section */}
              <View style={styles.infographicContainer}>
                <View style={[styles.iconBackground, { 
                  backgroundColor: slideColors[index] + '20',
                  borderColor: slideColors[index] + '40'
                }]}>
                  <IconSymbol 
                    name={slide.icon as any} 
                    size={80} 
                    color={slideColors[index]} 
                  />
                </View>
                
                {/* Decorative elements */}
                <View style={styles.decorativeElements}>
                  <View style={[styles.decorativeCircle, { backgroundColor: slideColors[index] + '30' }]} />
                  <View style={[styles.decorativeCircle2, { backgroundColor: slideColors[index] + '20' }]} />
                </View>
              </View>

              {/* Text Content */}
              <View style={styles.textContainer}>
                <Text style={[styles.title, { color: theme.text }]}>{slide.title}</Text>
                <Text style={[styles.description, { color: theme.textSecondary }]}>{slide.description}</Text>
              </View>

              {/* Get Started Button (only on last slide) */}
              {index === slides.length - 1 && (
                <Pressable 
                  style={({ pressed }) => [
                    styles.getStartedButton, 
                    { 
                      backgroundColor: theme.primary,
                      transform: pressed ? [{ translateY: 2 }] : [{ translateY: 0 }],
                      opacity: pressed ? 0.9 : 1
                    }
                  ]} 
                  onPress={onGetStarted}
                >
                  <Text style={styles.getStartedText}>Get Started</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {slides.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.paginationDot,
              {
                backgroundColor: currentIndex === index 
                  ? theme.primary 
                  : theme.textTertiary,
                width: currentIndex === index ? 24 : 8,
              },
            ]}
            onPress={() => scrollToSlide(index)}
          />
        ))}
      </View>

      {/* Skip Button */}
      {currentIndex < slides.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={onGetStarted}>
          <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 350,
  },
  infographicContainer: {
    height: SCREEN_HEIGHT * 0.4,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  iconBackground: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  decorativeElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  decorativeCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    top: 20,
    right: 30,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    bottom: 30,
    left: 20,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  getStartedButton: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
  },
  getStartedText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
    gap: 8,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
});