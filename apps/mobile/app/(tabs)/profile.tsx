import { View, Text, TouchableOpacity, Image } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Edit, Mail, Award, Calendar } from 'lucide-react-native';
import { supabase } from '@/services/supabase';

export default function ProfileScreen() {
  const { data: user } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1">
        {/* ヘッダー */}
        <View className="bg-white px-4 py-6 items-center">
          <View className="w-24 h-24 bg-gray-300 rounded-full mb-4" />
          <Text className="text-xl font-bold text-gray-900">
            {user?.user_metadata?.name || 'ユーザー名'}
          </Text>
          <View className="flex-row items-center mt-1">
            <Mail size={16} className="text-gray-500 mr-1" />
            <Text className="text-gray-500">{user?.email}</Text>
          </View>
          <TouchableOpacity className="mt-4 px-4 py-2 bg-primary rounded-lg">
            <Text className="text-white font-medium">プロフィール編集</Text>
          </TouchableOpacity>
        </View>

        {/* 統計 */}
        <View className="bg-white mt-2 p-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            学習統計
          </Text>
          <View className="flex-row justify-around">
            <View className="items-center">
              <Calendar size={24} className="text-primary mb-2" />
              <Text className="text-2xl font-bold text-gray-900">0</Text>
              <Text className="text-sm text-gray-500">レッスン数</Text>
            </View>
            <View className="items-center">
              <Award size={24} className="text-primary mb-2" />
              <Text className="text-2xl font-bold text-gray-900">0</Text>
              <Text className="text-sm text-gray-500">修了コース</Text>
            </View>
          </View>
        </View>

        {/* メニュー */}
        <View className="bg-white mt-2">
          <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-gray-100">
            <Text className="text-gray-900">学習履歴</Text>
            <Text className="text-gray-400">></Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-gray-100">
            <Text className="text-gray-900">お気に入り</Text>
            <Text className="text-gray-400">></Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center justify-between p-4">
            <Text className="text-gray-900">実績</Text>
            <Text className="text-gray-400">></Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}