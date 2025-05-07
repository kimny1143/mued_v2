import axios from 'axios';
import type { ChatMessage, GetMessagesResponse, SendMessageRequest } from './types';

// APIクライアントの設定
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 練習ログデータ型
export interface ExerciseLogData {
  user_id: string;
  instrument: string;
  duration_minutes: number;
  difficulty: string;
  notes?: string;
  mood?: string;
  date?: string;
}

// 練習ログレスポンス型
export interface ExerciseLog {
  id: string;
  user_id: string;
  instrument: string;
  duration_minutes: number;
  difficulty: string;
  notes?: string;
  mood?: string;
  date: string;
  created_at: string;
}

// 練習ログAPIクライアント
export const exerciseLogsApi = {
  // 練習ログを保存する
  createLog: async (logData: ExerciseLogData): Promise<ExerciseLog> => {
    const response = await apiClient.post<ExerciseLog>('/exercise/logs', logData);
    return response.data;
  },
};

// チャットメッセージAPIクライアント
export const chatMessagesApi = {
  // メッセージ一覧を取得する
  getMessages: async (roomId: string, cursor?: string, limit = 20): Promise<GetMessagesResponse> => {
    const params = { room_id: roomId, limit };
    if (cursor) {
      Object.assign(params, { cursor });
    }
    const response = await apiClient.get<GetMessagesResponse>('/chat/messages', { params });
    return response.data;
  },
  
  // メッセージを送信する
  sendMessage: async (messageData: SendMessageRequest): Promise<ChatMessage> => {
    const response = await apiClient.post<ChatMessage>('/chat/messages', messageData);
    return response.data;
  },
  
  // ファイル付きメッセージを送信する
  sendMessageWithFiles: async (messageData: SendMessageRequest): Promise<ChatMessage> => {
    const formData = new FormData();
    formData.append('content', messageData.content);
    formData.append('room_id', messageData.room_id);
    
    if (messageData.files && messageData.files.length > 0) {
      messageData.files.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });
    }
    
    const response = await apiClient.post<ChatMessage>('/chat/messages/with-files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },
};

export default apiClient; 