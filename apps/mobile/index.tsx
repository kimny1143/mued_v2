import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import React from 'react';
import { View, Text } from 'react-native';

console.log('=== MUED PWA Starting ===');
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
});

// デバッグ用のシンプルなコンポーネント
function DebugApp() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>MUED PWA Debug</Text>
      <Text>If you see this, React is working!</Text>
    </View>
  );
}

export function App() {
  try {
    console.log('App component rendering');
    
    // 一時的にデバッグコンポーネントを返す
    return <DebugApp />;
    
    // 元のコード（コメントアウト）
    // const ctx = require.context('./app');
    // return <ExpoRoot context={ctx} />;
  } catch (error) {
    console.error('App render error:', error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Error: {(error as any)?.message || 'Unknown error'}</Text>
      </View>
    );
  }
}

registerRootComponent(App);
