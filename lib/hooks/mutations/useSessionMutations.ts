import { useState } from 'react';
import { mutate } from 'swr';

interface StartSessionResponse {
  success: boolean;
  message: string;
  session: {
    id: string;
    status: string;
    scheduled_start: string;
    actual_start: string;
  };
}

interface EndSessionData {
  lesson_notes: string;
  homework?: string;
  materials_used?: {
    type: 'note_article' | 'youtube' | 'custom';
    id?: string;
    url?: string;
    title?: string;
  }[];
}

interface EndSessionResponse {
  success: boolean;
  message: string;
  session: {
    id: string;
    status: string;
    actual_start: string;
    actual_end: string;
    lesson_notes: string;
    homework?: string;
    materials_used?: any;
  };
}

interface FeedbackData {
  feedback: string;
  rating?: number;
  role: 'student' | 'mentor';
}

interface FeedbackResponse {
  success: boolean;
  message: string;
  feedback: {
    id: string;
    student_feedback?: string;
    mentor_feedback?: string;
    rating?: number;
    updated_at: string;
  };
}

export function useStartSession() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSession = async (sessionId: string): Promise<StartSessionResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/start`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'レッスンの開始に失敗しました');
      }

      const result = await response.json();
      
      // キャッシュを更新
      await mutate(`/api/sessions/${sessionId}`);
      await mutate('/api/sessions');
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'エラーが発生しました';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { startSession, isLoading, error };
}

export function useEndSession() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endSession = async (sessionId: string, data: EndSessionData): Promise<EndSessionResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/end`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.error || 'レッスンの終了に失敗しました');
      }

      const result = await response.json();
      
      // キャッシュを更新
      await mutate(`/api/sessions/${sessionId}`);
      await mutate('/api/sessions');
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'エラーが発生しました';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { endSession, isLoading, error };
}

export function useSubmitFeedback() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitFeedback = async (sessionId: string, data: FeedbackData): Promise<FeedbackResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/feedback`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.error || 'フィードバックの投稿に失敗しました');
      }

      const result = await response.json();
      
      // キャッシュを更新
      await mutate(`/api/sessions/${sessionId}`);
      await mutate('/api/sessions');
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'エラーが発生しました';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { submitFeedback, isLoading, error };
}