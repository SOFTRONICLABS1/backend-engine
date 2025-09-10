import React from 'react';
import { View, StyleSheet } from 'react-native';
import { UserGamesList } from '../../components/games/UserGamesList';
import { useTheme } from '../../theme/ThemeContext';

export default function UserHomeScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { userId, userName, userDisplayName, userAvatar, contentId } = route.params || {};
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <UserGamesList 
        navigation={navigation} 
        userId={userId} 
        userName={userName}
        userDisplayName={userDisplayName}
        userAvatar={userAvatar}
        contentId={contentId} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});