import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { IconSymbol } from '../components/ui/IconSymbol';
import MusicHomeScreen from './screens/MusicHomeScreen';
import ExploreScreen from './screens/ExploreScreen';
import ProfileScreen from './screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopWidth: 1,
          borderTopColor: theme.tabBarBorder,
          height: Platform.OS === 'ios' ? 80 : 60,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarShowLabel: false, // Remove text labels
      }}>
      <Tab.Screen
        name="Home"
        component={MusicHomeScreen}
        options={{
          tabBarIcon: ({ color }) => <IconSymbol name="house.fill" size={45} color={color} />,
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarIcon: ({ color }) => <IconSymbol name="magnifyingglass" size={28} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => <IconSymbol name="person.fill" size={28} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}