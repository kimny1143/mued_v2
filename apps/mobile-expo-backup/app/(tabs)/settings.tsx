import { View, Text, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import React, { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/services/supabase';
import { SafeAreaView } from '@/components/SafeAreaView';
import { isWeb } from '@/utils/platform';
import { PushNotificationService } from '@/utils/pushNotifications';

// Icon components for settings
const LogOut = ({ size = 20, className = '' }: any) => (
  <Text style={{ fontSize: size }} className={className}>🚪</Text>
);
const Bell = ({ size = 20, className = '' }: any) => (
  <Text style={{ fontSize: size }} className={className}>🔔</Text>
);
const Shield = ({ size = 20, className = '' }: any) => (
  <Text style={{ fontSize: size }} className={className}>🛡️</Text>
);
const HelpCircle = ({ size = 20, className = '' }: any) => (
  <Text style={{ fontSize: size }} className={className}>❓</Text>
);
const Info = ({ size = 20, className = '' }: any) => (
  <Text style={{ fontSize: size }} className={className}>ℹ️</Text>
);

export default function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const pushService = PushNotificationService.getInstance();

  useEffect(() => {
    checkPushStatus();
  }, []);

  const checkPushStatus = async () => {
    if (isWeb) {
      const subscription = await pushService.getSubscription();
      setPushEnabled(!!subscription);
    }
  };

  const togglePushNotifications = async (value: boolean) => {
    setPushLoading(true);
    try {
      if (value) {
        const vapidKey = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          Alert.alert('エラー', 'プッシュ通知の設定が見つかりません');
          setPushEnabled(false);
          return;
        }
        const subscription = await pushService.subscribe(vapidKey);
        if (subscription) {
          setPushEnabled(true);
          // Send subscription to backend
          console.log('Push subscription:', subscription);
          await pushService.sendTestNotification();
        } else {
          Alert.alert('エラー', '通知の許可が必要です');
          setPushEnabled(false);
        }
      } else {
        await pushService.unsubscribe();
        setPushEnabled(false);
      }
    } catch (error) {
      console.error('Push notification toggle error:', error);
      Alert.alert('エラー', '通知設定の変更に失敗しました');
    } finally {
      setPushLoading(false);
    }
  };
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
          <View className="p-4 border-b border-gray-100">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Bell size={20} className="text-gray-600 mr-3" />
                <Text className="text-gray-900">プッシュ通知</Text>
              </View>
              {isWeb ? (
                <Switch
                  value={pushEnabled}
                  onValueChange={togglePushNotifications}
                  disabled={pushLoading}
                />
              ) : (
                <Text className="text-gray-400 text-sm">モバイルアプリで利用可能</Text>
              )}
            </View>
          </View>
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