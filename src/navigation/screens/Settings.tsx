import React, { useState, useEffect, useMemo } from 'react';
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
import Colors from "@/Colors"
import { FormPicker } from "@/components/FormPicker"
import { useSettingsOptions, useTranslation } from "@/configHooks"
import { GraphicsMode, LanguageType, ThemeType, useConfigStore } from "@/stores/configStore"
import { useNavigation } from "@react-navigation/native"
import { IconSymbol } from '../../components/ui/IconSymbol';
import { useTheme } from '../../theme/ThemeContext';

export function Settings() {
  const config = useConfigStore()
  const options = useSettingsOptions()
  const languages = useMemo(() => options.getLanguages(), [options])
  const themes = useMemo(() => options.getThemes(), [options])
  const graphics = useMemo(() => options.getGraphics(), [options])
  const navigation = useNavigation()
  const t = useTranslation()
  const { theme } = useTheme();
  
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    navigation.setOptions({ title: t("settings") })
  }, [navigation, t])

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
      title: 'App Settings',
      items: [
        {
          id: 'language',
          title: 'Language',
          subtitle: config.language || 'English',
          type: 'navigation',
          onPress: () => showLanguagePicker(),
          icon: 'globe'
        },
        {
          id: 'theme',
          title: 'Theme',
          subtitle: config.theme || 'Auto',
          type: 'navigation',
          onPress: () => showThemePicker(),
          icon: 'moon.fill'
        },
        {
          id: 'graphics',
          title: 'Graphics Quality',
          subtitle: config.graphics || 'Auto',
          type: 'navigation',
          onPress: () => showGraphicsPicker(),
          icon: 'tv.fill'
        }
      ]
    },
    {
      title: 'Playback',
      items: [
        {
          id: 'autoplay',
          title: 'Autoplay',
          subtitle: 'Automatically play next content',
          type: 'switch',
          value: autoplay,
          onValueChange: setAutoplay,
          icon: 'play.circle.fill'
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
          onPress: () => Alert.alert('About', 'Music Training App v1.0.0\nBuilt with ❤️'),
          icon: 'info.circle.fill'
        },
        {
          id: 'help',
          title: 'Help & Support',
          subtitle: 'Get help and contact support',
          type: 'navigation',
          onPress: () => Alert.alert('Help & Support', 'Visit our support page or contact us at support@musicapp.com'),
          icon: 'lightbulb.fill'
        }
      ]
    }
  ];

  const showLanguagePicker = () => {
    const languageOptions = languages.map(lang => ({
      text: lang.title,
      onPress: () => config.setLanguage(lang.id as LanguageType)
    }));
    
    Alert.alert(
      'Select Language',
      'Choose your preferred language',
      [
        ...languageOptions,
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const showThemePicker = () => {
    const themeOptions = themes.map(thm => ({
      text: thm.title,
      onPress: () => config.setTheme(thm.id as ThemeType)
    }));
    
    Alert.alert(
      'Select Theme',
      'Choose your preferred theme',
      [
        ...themeOptions,
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const showGraphicsPicker = () => {
    const graphicsOptions = graphics.map(gfx => ({
      text: gfx.title,
      onPress: () => config.setGraphics(gfx.id as GraphicsMode)
    }));
    
    Alert.alert(
      'Select Graphics Quality',
      'Choose your preferred graphics quality',
      [
        ...graphicsOptions,
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

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
            Music Training App Version 1.0.0
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
})
