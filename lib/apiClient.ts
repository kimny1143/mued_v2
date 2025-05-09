import axios from 'axios';
import type { ChatMessage, GetMessagesResponse, SendMessageRequest } from './types';
import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

// APIクライアントの設定
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

// チャットメッセージAPIクライアント (Supabase利用)
export const chatMessagesApi = {
  // メッセージ一覧を取得する
  getMessages: async (roomId: string, cursor?: string, limit = 20): Promise<GetMessagesResponse> => {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('timestamp', cursor);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }

    // データが取得されなかった場合は空配列を返す
    const messages = data ? data.reverse() : [];
    
    // limit+1件取得して次のページがあるか確認する方法もあるが、
    // 簡易的にlimit件取得できたら次のページがあると仮定
    const has_more = messages.length === limit;

    return {
      messages,
      has_more,
      next_cursor: messages.length > 0 ? messages[0].timestamp : null,
    };
  },
  
  // メッセージを送信する
  sendMessage: async (messageData: SendMessageRequest): Promise<ChatMessage> => {
    const newMessage = {
      id: uuidv4(),
      content: messageData.content,
      room_id: messageData.room_id,
      sender_id: 'current-user-id', // 実際にはログインユーザーIDを使用
      sender_type: 'student',
      timestamp: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('messages')
      .insert(newMessage)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }

    return data;
  },
  
  // ファイル付きメッセージを送信する
  sendMessageWithFiles: async (messageData: SendMessageRequest): Promise<ChatMessage> => {
    // ファイルをストレージにアップロード
    const fileUrls: string[] = [];
    
    if (messageData.files && messageData.files.length > 0) {
      for (const file of messageData.files) {
        const filePath = `messages/${messageData.room_id}/${uuidv4()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat_files')
          .upload(filePath, file);

        if (uploadError) {
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }

        // 公開URLを取得
        const { data: urlData } = supabase.storage
          .from('chat_files')
          .getPublicUrl(filePath);

        fileUrls.push(urlData.publicUrl);
      }
    }

    // ファイルURLをコンテンツに追加
    let contentWithFiles = messageData.content;
    if (fileUrls.length > 0) {
      const fileLinks = fileUrls.map(url => {
        if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return `<img src="${url}" alt="Uploaded image" class="max-w-full h-auto" />`;
        } else {
          return `<a href="${url}" target="_blank" class="text-blue-500 underline">添付ファイル</a>`;
        }
      }).join('<br/>');
      
      contentWithFiles += '<div class="mt-3">' + fileLinks + '</div>';
    }

    // メッセージを保存
    const newMessage = {
      id: uuidv4(),
      content: contentWithFiles,
      room_id: messageData.room_id,
      sender_id: 'current-user-id', // 実際にはログインユーザーIDを使用
      sender_type: 'student',
      timestamp: new Date().toISOString(),
      file_urls: fileUrls
    };

    const { data, error } = await supabase
      .from('messages')
      .insert(newMessage)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }

    return data;
  },
};

export default apiClient; 