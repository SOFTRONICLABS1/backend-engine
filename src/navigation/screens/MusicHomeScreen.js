import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { PublicContentFeed } from '../../components/games/PublicContentFeed';
import { useTheme } from '../../theme/ThemeContext';

export default function MusicHomeScreen({ navigation }) {
  const { theme } = useTheme();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <PublicContentFeed navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});