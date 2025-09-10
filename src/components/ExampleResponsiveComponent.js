import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  responsiveWidth,
  responsiveHeight,
  responsiveFontSize,
  platformResponsiveSize,
  platformValue,
  commonStyles,
  screenData
} from '../utils/responsive';

const ExampleResponsiveComponent = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Responsive Component</Text>
      
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Platform Button</Text>
      </TouchableOpacity>
      
      <View style={styles.card}>
        <Text style={styles.cardText}>
          Screen: {screenData.width} x {screenData.height}
        </Text>
        <Text style={styles.cardText}>
          Platform: {screenData.isAndroid ? 'Android' : 'iOS'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: commonStyles.mediumPadding,
    paddingTop: platformResponsiveSize(50, 70), // iOS: 50, Android: 70
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: commonStyles.titleFont,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: commonStyles.largeMargin,
    color: '#333',
  },
  button: {
    width: responsiveWidth(280), // 280px on iPhone X = responsive on all devices
    height: commonStyles.buttonHeight, // Platform-specific height
    backgroundColor: '#007AFF',
    borderRadius: responsiveWidth(8),
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: commonStyles.mediumMargin,
    // Platform-specific shadow
    ...platformValue(
      // iOS shadow
      {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      // Android shadow
      {
        elevation: 5,
      }
    ),
  },
  buttonText: {
    fontSize: commonStyles.mediumFont,
    color: 'white',
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'white',
    padding: commonStyles.mediumPadding,
    borderRadius: responsiveWidth(12),
    marginTop: commonStyles.largeMargin,
    // Platform-specific styling
    minHeight: platformResponsiveSize(100, 120),
  },
  cardText: {
    fontSize: commonStyles.smallFont,
    color: '#666',
    marginBottom: commonStyles.smallMargin,
  },
});

export default ExampleResponsiveComponent;