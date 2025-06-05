// Platform-agnostic storage utility
import { Platform } from 'react-native';

let SecureStore: any;

if (Platform.OS === 'web') {
  // Use web implementation
  SecureStore = require('./storage.web').SecureStore;
} else {
  // Use native implementation
  SecureStore = require('expo-secure-store');
}

export default SecureStore;