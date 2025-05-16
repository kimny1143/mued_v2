import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// API結果の型定義
interface ApiResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

interface ApiTestResults {
  health: ApiResult<any>;
  musicAnalysis: ApiResult<any>;
}

// テスト用APIクライアント
// 実際のAPI呼び出しをラップして、テスト時にモック化しやすくする
const apiTestClient = {
  // ヘルスチェック
  getHealth: async () => {
    const response = await fetch(`${API_BASE_URL}/`);
    return response.json();
  },

  // 音楽分析
  analyzeMusicData: async (data: any) => {
    const response = await axios.post(`${API_BASE_URL}/music/analyze`, data);
    return response.data;
  },

  // テスト用：すべてのAPIエンドポイント（api.tsで定義）への接続を確認
  testAllEndpoints: async (): Promise<ApiTestResults> => {
    const results: ApiTestResults = {
      health: { success: false, data: null, error: null },
      musicAnalysis: { success: false, data: null, error: null },
    };

    try {
      results.health.data = await apiTestClient.getHealth();
      results.health.success = true;
    } catch (error) {
      results.health.error = error instanceof Error ? error.message : String(error);
    }

    try {
      const mockData = { notes: "C4 D4 E4", tempo: 120, instrument: "piano" };
      results.musicAnalysis.data = await apiTestClient.analyzeMusicData(mockData);
      results.musicAnalysis.success = true;
    } catch (error) {
      results.musicAnalysis.error = error instanceof Error ? error.message : String(error);
    }

    return results;
  }
};

export default apiTestClient; 