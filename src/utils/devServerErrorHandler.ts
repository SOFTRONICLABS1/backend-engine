import { Alert } from 'react-native';

interface DevSettings {
  reload: () => void;
}

class DevServerErrorHandler {
  static handleConnectionError(): void {
    if (__DEV__) {
      Alert.alert(
        'Development Server Connection Failed',
        'The React Native Metro bundler is not running or not accessible.\n\n' +
        'Solutions:\n' +
        '1. Run "npm run ios" to automatically start the server\n' +
        '2. Ensure metro server is running on port 8081\n' +
        '3. Check that your device/simulator is on the same network\n' +
        '4. Try restarting the Metro bundler',
        [
          {
            text: 'Reload',
            onPress: () => {
              const { DevSettings }: { DevSettings: DevSettings } = require('react-native');
              DevSettings.reload();
            }
          },
          { text: 'OK', style: 'cancel' }
        ]
      );
    }
  }

  static init(): void {
    if (__DEV__) {
      const originalErrorHandler = global.ErrorUtils.getGlobalHandler();
      
      global.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        if (error.message && error.message.includes('Could not connect to development server')) {
          DevServerErrorHandler.handleConnectionError();
          return;
        }
        
        originalErrorHandler(error, isFatal);
      });
    }
  }
}

export default DevServerErrorHandler;