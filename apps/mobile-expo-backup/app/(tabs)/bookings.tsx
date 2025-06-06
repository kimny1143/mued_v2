import { View, Text } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BookingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 justify-center items-center px-4">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          予約管理
        </Text>
        <Text className="text-gray-600 text-center">
          レッスンの予約・管理機能は開発中です
        </Text>
      </View>
    </SafeAreaView>
  );
}