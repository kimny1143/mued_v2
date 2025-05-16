"use client";
import React, { useState, useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExerciseLogFormData, ExerciseLogSchema } from '../../lib/validationSchemas';
import { exerciseLogsApi } from '../../lib/apiClient';
import { offlineExerciseLogs, useNetworkStatus, syncExerciseLogs } from '../../lib/offlineStorage';
import { v4 as uuidv4 } from 'uuid';

// UI コンポーネント
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { ClockIcon, AlertTriangleIcon, CheckCircleIcon, CalendarIcon, SmileIcon } from 'lucide-react';

const MOOD_OPTIONS = [
  { value: 'good', label: 'Good', icon: '😊' },
  { value: 'normal', label: 'Normal', icon: '😐' },
  { value: 'bad', label: 'Bad', icon: '😟' },
];

// props型を追加
interface ExerciseLogFormProps {
  onSuccess?: () => void;
  // TODO: ExerciseLogFormDataとの型互換性問題を解決する
  // 現在、ExerciseLogSchemaの定義とuseFormの使用方法に不整合があり
  // TypeScriptエラーが発生している。根本的な解決には以下の対応が必要:
  // 1. validationSchemasの型定義を見直す
  // 2. フォームの入力値とスキーマの型を一致させる
  initialData?: Partial<ExerciseLogFormData>;
}

// 型定義を明示的に行う
type FormValues = {
  user_id: string;
  duration_minutes: number;
  notes?: string;
  mood?: 'good' | 'normal' | 'bad';
  difficulty: 'easy' | 'medium' | 'hard';
  date: string;
  time: string;
  [key: string]: unknown;
};

export function ExerciseLogForm({ onSuccess, initialData }: ExerciseLogFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { addOnlineListener, addOfflineListener } = useNetworkStatus();

  // 現在の日時をデフォルト値として設定
  const now = new Date();
  const dateString = now.toISOString().split('T')[0];
  const timeString = now.toTimeString().split(' ')[0].substring(0, 5);

  // フォームの定義
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(ExerciseLogSchema),
    defaultValues: {
      user_id: '1', // 実際には認証済みユーザーIDを使用
      duration_minutes: initialData?.duration_minutes || 30,
      notes: initialData?.notes || '',
      mood: initialData?.mood || 'normal',
      difficulty: 'medium',
      date: initialData?.date || dateString,
      time: initialData?.time || timeString
    },
  });

  // initialDataが変更されたときにフォームの値を更新
  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
        user_id: '1', // デフォルト値を維持
        difficulty: 'medium', // デフォルト値を維持
        mood: initialData.mood || 'normal',
      });
    }
  }, [initialData, reset]);

  // ネットワーク状態の監視
  useEffect(() => {
    const removeOnlineListener = addOnlineListener(() => {
      setIsOffline(false);
      // オンラインに戻ったら未同期データを同期
      syncExerciseLogs(exerciseLogsApi);
    });
    
    const removeOfflineListener = addOfflineListener(() => {
      setIsOffline(true);
    });
    
    return () => {
      removeOnlineListener();
      removeOfflineListener();
    };
  }, []);

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      
      const now = new Date().toISOString();
      const logId = uuidv4();
      
      if (isOffline) {
        // オフラインモードでの保存
        await offlineExerciseLogs.saveExerciseLog({
          id: logId,
          user_id: data.user_id,
          instrument: 'default', // 楽器フィールドは削除されたため、デフォルト値を設定
          duration_minutes: data.duration_minutes,
          difficulty: 'medium', // 難易度フィールドは削除されたため、デフォルト値を設定
          notes: data.notes,
          mood: data.mood,
          date: data.date ? `${data.date}T${data.time || '00:00'}:00Z` : now,
          created_at: now,
          synced: false
        });
      } else {
        // オンラインモードでの保存
        await exerciseLogsApi.createLog({
          ...data,
          instrument: 'default', // 楽器フィールドは削除されたため、デフォルト値を設定
          difficulty: 'medium', // 難易度フィールドは削除されたため、デフォルト値を設定
        });
      }
      
      // 成功時の処理
      setSubmitSuccess(true);
      reset(); // フォームをリセット
      
      // onSuccessコールバックがあれば呼び出す
      if (onSuccess) {
        onSuccess();
      }
      
      // 3秒後に成功メッセージを非表示
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to save exercise record', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {isOffline && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
          <AlertTriangleIcon className="w-5 h-5" />
          <p className="text-sm font-medium">Offline Mode: Data will be synchronized later</p>
        </div>
      )}
      
      {submitSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg border border-green-200">
          <CheckCircleIcon className="w-5 h-5" />
          <p className="text-sm font-medium">Exercise record saved successfully!</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 非表示のユーザーID */}
        <input type="hidden" {...register('user_id')} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 日付 */}
          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-2 text-gray-700">
              <CalendarIcon className="w-4 h-4" />
              <span>練習日</span>
            </Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
              className="h-11 rounded-lg border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          
          {/* 時刻 */}
          <div className="space-y-2">
            <Label htmlFor="time" className="flex items-center gap-2 text-gray-700">
              <ClockIcon className="w-4 h-4" />
              <span>練習時刻</span>
            </Label>
            <Input
              id="time"
              type="time"
              {...register('time')}
              className="h-11 rounded-lg border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          
          {/* 練習時間 */}
          <div className="space-y-2">
            <Label htmlFor="duration_minutes" className="flex items-center gap-2 text-gray-700">
              <ClockIcon className="w-4 h-4" />
              <span>練習時間（分）</span>
            </Label>
            <Input
              id="duration_minutes"
              type="number"
              {...register('duration_minutes', { valueAsNumber: true })}
              className={`h-11 rounded-lg border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${errors.duration_minutes ? 'border-red-500 focus:ring-red-100' : ''}`}
            />
            {errors.duration_minutes && (
              <p className="text-red-500 text-sm mt-1">{errors.duration_minutes.message?.toString()}</p>
            )}
          </div>
          
          {/* 気分（ラジオボタン） */}
          <div className="space-y-2 col-span-1 md:col-span-2">
            <Label className="flex items-center gap-2 text-gray-700 text-base mb-2">
              <SmileIcon className="w-4 h-4" />
              <span>今日の気分はどうでしたか？</span>
            </Label>
            <div className="flex gap-6 items-center justify-center p-3 bg-gray-50 rounded-lg">
              {MOOD_OPTIONS.map(option => (
                <label key={option.value} className="flex flex-col items-center cursor-pointer">
                  <input
                    type="radio"
                    value={option.value}
                    {...register('mood')}
                    className="sr-only"
                  />
                  <div className={`text-3xl transition-transform ${
                    option.value === 'good' ? 'hover:scale-125' : 
                    option.value === 'normal' ? 'hover:scale-110' : 
                    'hover:scale-105'
                  }`}>
                    {option.icon}
                  </div>
                  <span className={`text-sm mt-2 font-medium transition-colors ${
                    option.value === 'good' ? 'text-green-600' : 
                    option.value === 'normal' ? 'text-blue-600' : 
                    'text-amber-600'
                  }`}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
        
        {/* メモ */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-gray-700">練習メモ</Label>
          <Textarea
            id="notes"
            {...register('notes')}
            placeholder="今日の練習内容や気づきなどを記録しましょう"
            className="h-32 rounded-lg border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
          />
        </div>
        
        {/* 送信ボタン */}
        <Button 
          type="submit" 
          disabled={isSubmitting}
          variant="default"
          className="bg-green-600 hover:bg-green-700 text-white w-full md:w-auto"
        >
          {isSubmitting ? '保存中...' : '練習記録を保存'}
        </Button>
      </form>
    </div>
  );
} 