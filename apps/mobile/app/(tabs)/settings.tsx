import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LogOut, Bell, Shield, HelpCircle, Info } from 'lucide-react-native';
import { supabase } from '@/services/supabase';

export default function SettingsScreen() {
  const handleLogout = async () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしてもよろしいですか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const MenuItem = ({ icon: Icon, title, onPress, danger = false }: any) => (
    <TouchableOpacity
      className={`flex-row items-center p-4 border-b border-gray-100`}
      onPress={onPress}
    >
      <Icon size={20} className={danger ? 'text-red-500 mr-3' : 'text-gray-600 mr-3'} />
      <Text className={`flex-1 ${danger ? 'text-red-500' : 'text-gray-900'}`}>
        {title}
      </Text>
      <Text className="text-gray-400">></Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="px-4 py-6">
          <Text className="text-2xl font-bold text-gray-900 mb-6">設定</Text>
        </View>

        {/* アカウント設定 */}
        <View className="bg-white mb-4">
          <Text className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">
            アカウント設定
          </Text>
          <MenuItem icon={Bell} title="通知設定" onPress={() => {}} />
          <MenuItem icon={Shield} title="プライバシー設定" onPress={() => {}} />
        </View>

        {/* サポート */}
        <View className="bg-white mb-4">
          <Text className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">
            サポート
          </Text>
          <MenuItem icon={HelpCircle} title="ヘルプセンター" onPress={() => {}} />
          <MenuItem icon={Info} title="アプリについて" onPress={() => {}} />
        </View>

        {/* その他 */}
        <View className="bg-white">
          <MenuItem 
            icon={LogOut} 
            title="ログアウト" 
            onPress={handleLogout}
            danger
          />
        </View>

        {/* バージョン情報 */}
        <View className="px-4 py-6">
          <Text className="text-center text-sm text-gray-500">
            MUED LMS v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}