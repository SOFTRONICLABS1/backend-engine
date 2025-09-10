import { Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Base dimensions (iPhone X as reference)
const baseWidth = 375;
const baseHeight = 812;

// Responsive width function
export const responsiveWidth = (size) => {
  return (size / baseWidth) * width;
};

// Responsive height function
export const responsiveHeight = (size) => {
  return (size / baseHeight) * height;
};

// Responsive font size
export const responsiveFontSize = (size) => {
  return (size / baseWidth) * width;
};

// Platform-specific responsive size
export const platformResponsiveSize = (iosSize, androidSize) => {
  const baseSize = Platform.OS === 'android' ? androidSize : iosSize;
  return (baseSize / baseWidth) * width;
};

// Platform-specific responsive height
export const platformResponsiveHeight = (iosHeight, androidHeight) => {
  const baseSize = Platform.OS === 'android' ? androidHeight : iosHeight;
  return (baseSize / baseHeight) * height;
};

// Responsive for both platforms (replaces platformValue for responsive design)
export const responsivePlatformValue = (iosSize, androidSize) => {
  const baseSize = Platform.OS === 'android' ? androidSize : iosSize;
  const referenceWidth = Platform.OS === 'android' ? baseWidth : baseWidth; // Using iPhone X as reference for both
  return (baseSize / referenceWidth) * width;
};

// Get platform-specific value
export const platformValue = (iosValue, androidValue) => {
  return Platform.OS === 'android' ? androidValue : iosValue;
};

// Screen dimensions
export const screenData = {
  width,
  height,
  isSmallDevice: width < 375,
  isLargeDevice: width > 414,
  isAndroid: Platform.OS === 'android',
  isIOS: Platform.OS === 'ios',
};

// Common responsive styles
export const commonStyles = {
  // Padding
  smallPadding: responsiveWidth(8),
  mediumPadding: responsiveWidth(16),
  largePadding: responsiveWidth(24),
  
  // Margins
  smallMargin: responsiveWidth(8),
  mediumMargin: responsiveWidth(16),
  largeMargin: responsiveWidth(24),
  
  // Font sizes
  smallFont: responsiveFontSize(12),
  mediumFont: responsiveFontSize(16),
  largeFont: responsiveFontSize(20),
  titleFont: responsiveFontSize(24),
  
  // Common heights
  buttonHeight: platformResponsiveHeight(44, 50),
  inputHeight: platformResponsiveHeight(40, 46),
  headerHeight: platformResponsiveHeight(60, 70),
};