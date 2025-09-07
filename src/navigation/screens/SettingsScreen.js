import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { IconSymbol } from '../../components/ui/IconSymbol';

export default function SettingsScreen({ navigation }) {
  const { theme } = useTheme();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [autoplay, setAutoplay] = useState(true);

  const settingsSections = [
    {
      title: 'Notifications',
      items: [
        {
          id: 'push',
          title: 'Push Notifications',
          subtitle: 'Receive notifications on your device',
          type: 'switch',
          value: pushNotifications,
          onValueChange: setPushNotifications,
          icon: 'bell.fill'
        },
        {
          id: 'email',
          title: 'Email Notifications',
          subtitle: 'Get updates via email',
          type: 'switch',
          value: emailNotifications,
          onValueChange: setEmailNotifications,
          icon: 'envelope.fill'
        }
      ]
    },
    {
      title: 'Appearance',
      items: [
        {
          id: 'theme',
          title: 'Dark Mode',
          subtitle: 'Switch between light and dark themes',
          type: 'switch',
          value: darkMode,
          onValueChange: setDarkMode,
          icon: 'moon.fill'
        }
      ]
    },
    {
      title: 'Playback',
      items: [
        {
          id: 'autoplay',
          title: 'Autoplay',
          subtitle: 'Automatically play next video',
          type: 'switch',
          value: autoplay,
          onValueChange: setAutoplay,
          icon: 'play.circle.fill'
        },
        {
          id: 'quality',
          title: 'Video Quality',
          subtitle: 'Auto',
          type: 'navigation',
          onPress: () => Alert.alert('Video Quality', 'Quality settings coming soon!'),
          icon: 'tv.fill'
        }
      ]
    },
    {
      title: 'Account',
      items: [
        {
          id: 'privacy',
          title: 'Privacy Settings',
          subtitle: 'Manage your privacy preferences',
          type: 'navigation',
          onPress: () => Alert.alert('Privacy', 'Privacy settings coming soon!'),
          icon: 'lock.fill'
        },
        {
          id: 'security',
          title: 'Security',
          subtitle: 'Password and security options',
          type: 'navigation',
          onPress: () => Alert.alert('Security', 'Security settings coming soon!'),
          icon: 'shield.fill'
        },
        {
          id: 'data',
          title: 'Data Usage',
          subtitle: 'Manage data and storage',
          type: 'navigation',
          onPress: () => Alert.alert('Data Usage', 'Data usage settings coming soon!'),
          icon: 'chart.bar.fill'
        }
      ]
    },
    {
      title: 'About',
      items: [
        {
          id: 'about',
          title: 'About',
          subtitle: 'App version and information',
          type: 'navigation',
          onPress: () => Alert.alert('About', 'Music App v1.0.0\nBuilt with ❤️'),
          icon: 'info.circle.fill'
        }
      ]
    }
  ];

  const renderSettingItem = (item) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.settingItem, { borderBottomColor: theme.border }]}
        onPress={item.onPress}
        disabled={item.type === 'switch'}
      >
        <View style={styles.settingItemLeft}>
          <View style={[styles.settingIcon, { backgroundColor: theme.primary + '20' }]}>
            <IconSymbol name={item.icon} size={20} color={theme.primary} />
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>{item.title}</Text>
            <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>{item.subtitle}</Text>
          </View>
        </View>
        
        <View style={styles.settingItemRight}>
          {item.type === 'switch' ? (
            <Switch
              value={item.value}
              onValueChange={item.onValueChange}
              trackColor={{ false: theme.border, true: theme.primary + '40' }}
              thumbColor={item.value ? theme.primary : theme.textSecondary}
            />
          ) : (
            <IconSymbol name="chevron.right" size={16} color={theme.textSecondary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <IconSymbol name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{section.title}</Text>
            <View style={[styles.sectionContent, { backgroundColor: theme.surface }]}>
              {section.items.map((item, itemIndex) => (
                <React.Fragment key={item.id}>
                  {renderSettingItem(item)}
                  {itemIndex < section.items.length - 1 && (
                    <View style={[styles.separator, { backgroundColor: theme.border }]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}
        
        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: theme.textSecondary }]}>
            Music App Version 1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollContainer: {
    flex: 1,
    paddingTop: 8,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  sectionContent: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    minHeight: 68,
  },
  settingItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 3,
  },
  settingSubtitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  settingItemRight: {
    marginLeft: 16,
  },
  separator: {
    height: 1,
    marginLeft: 76,
  },
  versionContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
  },
});