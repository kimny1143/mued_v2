// Web-compatible storage utility to replace expo-secure-store
export const SecureStore = {
  async getItemAsync(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem(key);
      }
      return null;
    } catch (error) {
      console.error('SecureStore.getItemAsync error:', error);
      return null;
    }
  },

  async setItemAsync(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('SecureStore.setItemAsync error:', error);
    }
  },

  async deleteItemAsync(key: string): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('SecureStore.deleteItemAsync error:', error);
    }
  }
};