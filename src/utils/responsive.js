import { Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Base dimensions (iPhone X as reference)
const baseWidth = 375;
const baseHeight = 812;

// Device size categories
export const deviceCategories = {
  SMALL: 'small',   // <= 5.5" (iPhone SE, small Android)
  MEDIUM: 'medium', // 5.5" - 6.1" (iPhone 12, standard phones)
  LARGE: 'large',   // 6.1" - 6.7" (iPhone Pro Max, large Android)
  EXTRA_LARGE: 'xl' // > 6.7" (tablets, foldables)
};

// Screen size breakpoints
const breakpoints = {
  smallWidth: 320,   // iPhone SE
  mediumWidth: 375,  // iPhone 12
  largeWidth: 414,   // iPhone Pro Max
  xlWidth: 480,      // Large phones/small tablets
  
  smallHeight: 568,  // iPhone SE
  mediumHeight: 812, // iPhone X/12
  largeHeight: 896,  // iPhone Pro Max
  xlHeight: 1024     // Tablets
};

// Get current device category
export const getDeviceCategory = () => {
  if (width <= breakpoints.smallWidth) return deviceCategories.SMALL;
  if (width <= breakpoints.mediumWidth) return deviceCategories.MEDIUM;
  if (width <= breakpoints.largeWidth) return deviceCategories.LARGE;
  return deviceCategories.EXTRA_LARGE;
};

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

// Safe area aware positioning functions
export const responsivePosition = {
  // Bottom positioning that accounts for safe areas and device size
  bottom: (baseValue, safeAreaInsets = { bottom: 0 }) => {
    const deviceCategory = getDeviceCategory();
    const safeBottom = safeAreaInsets.bottom || 0;
    
    // Scale base value by screen size
    const scaledValue = responsiveHeight(baseValue);
    
    // Add device-specific adjustments
    let adjustment = 0;
    switch (deviceCategory) {
      case deviceCategories.SMALL:
        adjustment = responsiveHeight(10); // Less space on small devices
        break;
      case deviceCategories.MEDIUM:
        adjustment = 0; // Base case
        break;
      case deviceCategories.LARGE:
        adjustment = responsiveHeight(5); // Slightly more space
        break;
      case deviceCategories.EXTRA_LARGE:
        adjustment = responsiveHeight(15); // More space on large devices
        break;
    }
    
    return scaledValue + safeBottom + adjustment;
  },
  
  // Top positioning that accounts for safe areas and device size
  top: (baseValue, safeAreaInsets = { top: 0 }) => {
    const deviceCategory = getDeviceCategory();
    const safeTop = safeAreaInsets.top || 0;
    
    // Scale base value by screen size
    const scaledValue = responsiveHeight(baseValue);
    
    // Add device-specific adjustments
    let adjustment = 0;
    switch (deviceCategory) {
      case deviceCategories.SMALL:
        adjustment = responsiveHeight(-5); // Less space on small devices
        break;
      case deviceCategories.MEDIUM:
        adjustment = 0; // Base case
        break;
      case deviceCategories.LARGE:
        adjustment = responsiveHeight(10); // More space on large devices
        break;
      case deviceCategories.EXTRA_LARGE:
        adjustment = responsiveHeight(20); // More space on tablets
        break;
    }
    
    return scaledValue + safeTop + adjustment;
  },
  
  // Left/right positioning
  horizontal: (baseValue) => {
    return responsiveWidth(baseValue);
  }
};

// Screen dimensions with device info
export const screenData = {
  width,
  height,
  category: getDeviceCategory(),
  isSmallDevice: width <= breakpoints.smallWidth,
  isMediumDevice: width > breakpoints.smallWidth && width <= breakpoints.mediumWidth,
  isLargeDevice: width > breakpoints.mediumWidth && width <= breakpoints.largeWidth,
  isExtraLargeDevice: width > breakpoints.largeWidth,
  isAndroid: Platform.OS === 'android',
  isIOS: Platform.OS === 'ios',
  breakpoints,
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

// Debug utility to log responsive info
export const debugResponsive = (componentName = 'Unknown') => {
  const deviceInfo = {
    component: componentName,
    screenWidth: width,
    screenHeight: height,
    deviceCategory: getDeviceCategory(),
    platform: Platform.OS,
    timestamp: new Date().toISOString()
  };
  
  console.log(`📱 [${componentName}] Responsive Debug:`, JSON.stringify(deviceInfo, null, 2));
  return deviceInfo;
};

// Hook for safe area aware responsive values (to be used in components)
export const useResponsiveValues = (safeAreaInsets) => {
  return {
    screenData,
    responsiveBottom: (value) => responsivePosition.bottom(value, safeAreaInsets),
    responsiveTop: (value) => responsivePosition.top(value, safeAreaInsets),
    responsiveWidth,
    responsiveHeight,
    debugInfo: () => debugResponsive('useResponsiveValues')
  };
};