import React from 'react';
import { Ionicons, MaterialIcons, FontAwesome5, Entypo } from '@expo/vector-icons';

interface IconSymbolProps {
  name: string;
  size: number;
  color: string;
}

export const IconSymbol: React.FC<IconSymbolProps> = ({ name, size, color }) => {
  // Map icon names to appropriate icon libraries
  const getIconComponent = (iconName: string) => {
    // Ionicons mapping
    const ioniconsMap: { [key: string]: string } = {
      'music.note': 'musical-notes',
      'house.fill': 'home',
      'magnifyingglass': 'search',
      'person.fill': 'person',
      'globe': 'globe-outline',
      'arrow.right': 'arrow-forward',
      'apple.logo': 'logo-apple',
      'gamecontroller.fill': 'game-controller',
      'person.3.fill': 'people',
      'chart.line.uptrend.xyaxis': 'trending-up',
      'cog': 'settings',
      'settings': 'settings-outline',
      'create': 'create-outline',
      'add': 'add',
      'camera': 'camera',
      'image': 'image',
      'videocam': 'videocam',
      'mic': 'mic',
      'play': 'play',
      'pause': 'pause',
      'stop': 'stop',
      'heart': 'heart',
      'heart.fill': 'heart',
      'chatbubble': 'chatbubble',
      'share': 'share',
      'bookmark': 'bookmark',
      'bookmark.fill': 'bookmark',
      'more.horizontal': 'ellipsis-horizontal',
      'chevron.back': 'chevron-back',
      'chevron.forward': 'chevron-forward',
      'close': 'close',
      'checkmark': 'checkmark',
      'alert': 'alert-circle',
      'info': 'information-circle',
      'warning': 'warning',
      'star': 'star',
      'star.fill': 'star',
      'volume-high': 'volume-high',
      'volume-mute': 'volume-mute',
      'gearshape.fill': 'settings',
      'lightbulb.fill': 'bulb',
      'xmark.circle.fill': 'close-circle',
      'message': 'chatbubble-outline',
      'menu': 'menu',
      'xmark': 'close',
      'arrow-back': 'arrow-back',
      'checkmark.seal.fill': 'checkmark-circle',
      'bell.fill': 'notifications',
      'envelope.fill': 'mail',
      'chevron.right': 'chevron-forward',
      'play.circle.fill': 'play-circle',
      'party.popper': 'balloon',
      'sparkles': 'star',
      'person.badge.plus': 'person-add',
      'at': 'at',
      'phone.fill': 'call',
      'chevron.down': 'chevron-down',
      'play.fill': 'play',
      'exclamationmark.triangle': 'warning',
      'chevron.left': 'chevron-back',
    };

    // Material Icons mapping
    const materialIconsMap: { [key: string]: string } = {
      'music_note': 'music-note',
      'home': 'home',
      'search': 'search',
      'account_circle': 'account-circle',
      'favorite': 'favorite',
      'favorite_border': 'favorite-border',
    };

    if (ioniconsMap[iconName]) {
      return <Ionicons name={ioniconsMap[iconName] as any} size={size} color={color} />;
    }

    if (materialIconsMap[iconName]) {
      return <MaterialIcons name={materialIconsMap[iconName] as any} size={size} color={color} />;
    }

    // Default to Ionicons with the original name
    return <Ionicons name={iconName as any} size={size} color={color} />;
  };

  return getIconComponent(name);
};