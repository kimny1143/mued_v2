import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export const maybeCompleteAuthSession = () => {
  if (Platform.OS !== 'web') {
    WebBrowser.maybeCompleteAuthSession();
  }
};

export const openAuthSessionAsync = async (url: string, redirectUrl: string) => {
  if (Platform.OS === 'web') {
    // Web環境では新しいウィンドウでOAuth認証を行う
    window.location.href = url;
    return { type: 'cancel' as const };
  }
  
  return WebBrowser.openAuthSessionAsync(url, redirectUrl);
};