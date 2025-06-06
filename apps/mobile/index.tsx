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
  const viewStyle = { 
    flex: 1, 
    justifyContent: 'center' as const, 
    alignItems: 'center' as const, 
    backgroundColor: '#f0f0f0' 
  };
  
  const titleStyle = { 
    fontSize: 24, 
    fontWeight: 'bold' as const, 
    marginBottom: 20,
    color: '#000'
  };
  
  const textStyle = {
    fontSize: 16,
    color: '#333'
  };
  
  return (
    <View style={viewStyle}>
      <Text style={titleStyle}>MUED PWA Debug</Text>
      <Text style={textStyle}>If you see this, React is working!</Text>
      <Text style={textStyle}>SUPABASE_URL: {process.env.EXPO_PUBLIC_SUPABASE_URL || 'not set'}</Text>
      <Text style={textStyle}>API_URL: {process.env.EXPO_PUBLIC_API_URL || 'not set'}</Text>
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
