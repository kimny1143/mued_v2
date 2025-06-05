import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, BookOpen, TrendingUp } from 'lucide-react-native';
import { supabase } from '@/services/supabase';

export default function HomeScreen() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="px-4 py-6">
          {/* ヘッダー */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900">
              こんにちは、{user?.user_metadata?.name || 'ユーザー'}さん
            </Text>
            <Text className="text-gray-600 mt-1">
              今日も頑張りましょう！
            </Text>
          </View>

          {/* クイックアクション */}
          <View className="grid grid-cols-2 gap-4 mb-6">
            <TouchableOpacity className="bg-white p-4 rounded-lg shadow-sm">
              <Calendar className="text-primary mb-2" size={24} />
              <Text className="font-medium text-gray-900">レッスン予約</Text>
              <Text className="text-sm text-gray-500">空き時間を確認</Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-white p-4 rounded-lg shadow-sm">
              <Clock className="text-primary mb-2" size={24} />
              <Text className="font-medium text-gray-900">次のレッスン</Text>
              <Text className="text-sm text-gray-500">本日 14:00</Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-white p-4 rounded-lg shadow-sm">
              <BookOpen className="text-primary mb-2" size={24} />
              <Text className="font-medium text-gray-900">教材</Text>
              <Text className="text-sm text-gray-500">学習を続ける</Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-white p-4 rounded-lg shadow-sm">
              <TrendingUp className="text-primary mb-2" size={24} />
              <Text className="font-medium text-gray-900">進捗</Text>
              <Text className="text-sm text-gray-500">成長を確認</Text>
            </TouchableOpacity>
          </View>

          {/* 最近のアクティビティ */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              最近のアクティビティ
            </Text>
            <View className="bg-white rounded-lg shadow-sm p-4">
              <Text className="text-gray-600 text-center py-8">
                まだアクティビティがありません
              </Text>
            </View>
          </View>

          {/* お知らせ */}
          <View>
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              お知らせ
            </Text>
            <View className="bg-white rounded-lg shadow-sm p-4">
              <Text className="text-gray-600 text-center py-8">
                新しいお知らせはありません
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}