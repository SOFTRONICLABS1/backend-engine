import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PublicContentFeed } from '../../components/games/PublicContentFeed';
import { useTheme } from '../../theme/ThemeContext';

export default function HomeScreen({ navigation }) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PublicContentFeed navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});