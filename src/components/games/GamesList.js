import React, { useState, useRef } from 'react';
import { FlatList, Dimensions, View, StatusBar, Platform } from 'react-native';
import { GamePreview } from './GamePreview';

const mockMusicVideoReels = [
  {
    id: '1',
    title: 'Voice Flappy Bird Challenge',
    description: 'Control the bird with your voice! Make sounds to jump and avoid obstacles! 🎤🐦',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: 'https://picsum.photos/400/800?random=1',
    audioUrl: 'https://www.soundjay.com/misc/sounds-human/piano-melody-1.mp3',
    musicNotes: [
      { id: '1', note: 'C4', timing: 1000, duration: 500, pitch: 261.63 },
      { id: '2', note: 'D4', timing: 1500, duration: 500, pitch: 293.66 },
      { id: '3', note: 'E4', timing: 2000, duration: 500, pitch: 329.63 },
      { id: '4', note: 'F4', timing: 2500, duration: 500, pitch: 349.23 },
      { id: '5', note: 'G4', timing: 3000, duration: 500, pitch: 392.00 }
    ],
    difficulty: 'Medium',
    genre: 'Pop',
    likes: 1250,
    comments: 89,
    shares: 45,
    plays: 15000,
    isGameEnabled: true,
    contentId: '123e4567-e89b-12d3-a456-426614174001',
    gameId: 'flappy-bird',
    user: {
      name: 'vocalgamer_pro',
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
  },
  {
    id: '2',
    title: 'Classical Aria Training',
    description: 'Master classical vocal techniques through interactive gaming! Perfect your pitch and control.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnailUrl: 'https://picsum.photos/400/800?random=2',
    audioUrl: 'https://www.soundjay.com/misc/sounds-human/guitar-melody-2.mp3',
    musicNotes: [
      { id: '6', note: 'A4', timing: 800, duration: 1000, pitch: 440.00 },
      { id: '7', note: 'B4', timing: 1800, duration: 800, pitch: 493.88 },
      { id: '8', note: 'C5', timing: 2600, duration: 600, pitch: 523.25 }
    ],
    difficulty: 'Expert',
    genre: 'Classical',
    likes: 980,
    comments: 67,
    shares: 32,
    plays: 8500,
    isGameEnabled: true,
    contentId: '123e4567-e89b-12d3-a456-426614174002',
    gameId: 'vocal-training',
    user: {
      name: 'classical_master',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
  },
  {
    id: '3',
    title: 'Voice Flappy Bird - Rock Mode',
    description: 'Use your powerful rock vocals to control the bird through challenging obstacles! 🤘🐦',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://picsum.photos/400/800?random=3',
    musicNotes: [
      { id: '9', note: 'E4', timing: 500, duration: 400, pitch: 329.63 },
      { id: '10', note: 'G4', timing: 900, duration: 600, pitch: 392.00 },
      { id: '11', note: 'B4', timing: 1500, duration: 700, pitch: 493.88 },
      { id: '12', note: 'D5', timing: 2200, duration: 500, pitch: 587.33 }
    ],
    difficulty: 'Hard',
    genre: 'Rock',
    likes: 2100,
    comments: 156,
    shares: 78,
    plays: 25000,
    isGameEnabled: true,
    contentId: '123e4567-e89b-12d3-a456-426614174003',
    gameId: 'flappy-bird',
    user: {
      name: 'rockstar_vocals',
      avatar: 'https://i.pravatar.cc/150?img=2',
    },
  },
];

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const statusBarHeight = Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0;
const actualHeight = screenHeight;

export const GamesList = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const renderMusicVideoReel = ({ item }) => (
    <GamePreview musicVideoReel={item} navigation={navigation} />
  );

  const itemHeight = actualHeight - (Platform.OS === 'ios' ? 100 : 80);
  
  const getItemLayout = (_, index) => ({
    length: itemHeight,
    offset: itemHeight * index,
    index,
  });

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent={true} 
      />
      <FlatList
        ref={flatListRef}
        data={mockMusicVideoReels}
        renderItem={({ item }) => (
          <View style={{ height: itemHeight }}>
            <GamePreview 
              musicVideoReel={item} 
              navigation={navigation}
              itemHeight={itemHeight}
            />
          </View>
        )}
        keyExtractor={(item) => item.id}
        pagingEnabled={true}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        maxToRenderPerBatch={1}
        windowSize={2}
        initialNumToRender={1}
        bounces={false}
      />
    </View>
  );
};