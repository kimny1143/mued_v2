import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/services/supabase';
import GoogleIcon from '@/components/GoogleIcon';
import { SafeAreaView } from '@/components/SafeAreaView';
import { maybeCompleteAuthSession, openAuthSessionAsync } from '@/utils/webBrowser';
import { isWeb } from '@/utils/platform';

maybeCompleteAuthSession();

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const redirectUrl = makeRedirectUri();

  useEffect(() => {
    // URLリスナーの設定
    const subscription = Linking.addEventListener('url', handleRedirect);
    return () => subscription.remove();
  }, []);

  const handleRedirect = async (event: { url: string }) => {
    if (event.url.includes('#access_token')) {
      const url = event.url;
      const { data, error } = await supabase.auth.getSession();
      
      if (data.session) {
        router.replace('/(tabs)');
      }
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      const res = await openAuthSessionAsync(
        data.url!,
        redirectUrl
      );

      if (res.type === 'success') {
        const { url } = res;
        await handleRedirect({ url });
      }
    } catch (error: any) {
      Alert.alert('ログインエラー', error.message || 'ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 px-6 justify-center">
        <View className="bg-white rounded-2xl p-8 shadow-sm">
          <View className="mb-8">
            <Text className="text-3xl font-bold text-gray-900 text-center mb-2">
              MUED LMS
            </Text>
            <Text className="text-gray-600 text-center">
              音楽制作のための学習管理システム
            </Text>
          </View>

          <TouchableOpacity
            className={`bg-white border border-gray-300 rounded-lg py-3 px-4 flex-row items-center justify-center ${
              isLoading ? 'opacity-50' : ''
            }`}
            onPress={handleGoogleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#4285F4" />
            ) : (
              <>
                <View className="mr-3">
                  <GoogleIcon />
                </View>
                <Text className="text-gray-700 font-medium">
                  Googleでログイン
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}