import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function ResponseScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { userInfo } = route.params || {};

  const handleGoBack = () => {
    navigation.goBack();
  };

  const formatJSON = (data) => {
    return JSON.stringify(data, null, 2);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: theme.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Google Sign-In Response</Text>
      </View>

      {/* Response Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.responseContainer, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Raw Response Data</Text>
          
          <ScrollView 
            style={[styles.codeContainer, { backgroundColor: theme.background }]}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <Text style={[styles.codeText, { color: theme.textSecondary }]}>
              {formatJSON(userInfo)}
            </Text>
          </ScrollView>
        </View>

        {/* User Info Summary */}
        {userInfo?.user && (
          <View style={[styles.summaryContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>User Information Summary</Text>
            
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Name:</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {userInfo.user.name || 'N/A'}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Email:</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {userInfo.user.email || 'N/A'}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>ID:</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {userInfo.user.id || 'N/A'}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Photo URL:</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]} numberOfLines={3}>
                {userInfo.user.photo || 'N/A'}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Family Name:</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {userInfo.user.familyName || 'N/A'}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Given Name:</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {userInfo.user.givenName || 'N/A'}
              </Text>
            </View>
          </View>
        )}

        {/* ID Token Info */}
        {userInfo?.idToken && (
          <View style={[styles.tokenContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>ID Token</Text>
            <ScrollView 
              style={[styles.codeContainer, { backgroundColor: theme.background }]}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              <Text style={[styles.codeText, { color: theme.textSecondary }]}>
                {userInfo.idToken}
              </Text>
            </ScrollView>
          </View>
        )}

        {/* Server Auth Code */}
        {userInfo?.serverAuthCode && (
          <View style={[styles.tokenContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Server Auth Code</Text>
            <ScrollView 
              style={[styles.codeContainer, { backgroundColor: theme.background }]}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              <Text style={[styles.codeText, { color: theme.textSecondary }]}>
                {userInfo.serverAuthCode}
              </Text>
            </ScrollView>
          </View>
        )}

        {/* Continue Button */}
        <View style={styles.continueContainer}>
          <TouchableOpacity 
            style={[styles.continueButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('WelcomeUser')}
          >
            <Text style={[styles.continueButtonText, { color: '#FFFFFF' }]}>Continue</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  responseContainer: {
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
  },
  summaryContainer: {
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
  },
  tokenContainer: {
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  codeContainer: {
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  summaryItem: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E7',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  continueContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  continueButton: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 200,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});