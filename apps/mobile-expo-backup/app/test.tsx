import { View, Text } from 'react-native';

export default function TestScreen() {
  console.log('Test screen rendering');
  console.log('Environment variables:', {
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing',
    API_URL: process.env.EXPO_PUBLIC_API_URL,
    NODE_ENV: process.env.NODE_ENV,
  });

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>PWA Test Screen</Text>
      <Text>SUPABASE_URL: {process.env.EXPO_PUBLIC_SUPABASE_URL || 'not set'}</Text>
      <Text>API_URL: {process.env.EXPO_PUBLIC_API_URL || 'not set'}</Text>
      <Text>Environment: {process.env.NODE_ENV || 'not set'}</Text>
    </View>
  );
}