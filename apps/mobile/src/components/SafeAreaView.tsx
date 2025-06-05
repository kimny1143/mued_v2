import React from 'react';
import { View, ViewProps } from 'react-native';
import { SafeAreaView as NativeSafeAreaView } from 'react-native-safe-area-context';
import { isWeb } from '@/utils/platform';

interface SafeAreaViewProps extends ViewProps {
  children: React.ReactNode;
}

export function SafeAreaView({ children, style, ...props }: SafeAreaViewProps) {
  if (isWeb) {
    return (
      <View style={[{ flex: 1, paddingTop: 20 }, style]} {...props}>
        {children}
      </View>
    );
  }
  
  return (
    <NativeSafeAreaView style={style} {...props}>
      {children}
    </NativeSafeAreaView>
  );
}