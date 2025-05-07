import { describe, expect, it, beforeEach } from 'vitest';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// モックアダプターを使用するかどうかをテストモードで切り替える
const USE_MOCK = process.env.NODE_ENV === 'test' && process.env.USE_REAL_API !== 'true';

describe('AI APIとの統合テスト', () => {
  beforeEach(() => {
    // テスト間でのリクエストのリセット
    if (USE_MOCK) {
      // モックの設定（必要に応じて）
    }
  });

  it('ルートエンドポイントが正常に応答する', async () => {
    if (USE_MOCK) {
      // モック応答
      return;
    }
    
    const response = await fetch(`${API_BASE_URL}/`);
    const data = await response.json();
    expect(data.status).toBe('running');
    expect(data.message).toBeDefined();
  });
  
  it('音楽分析エンドポイントが正常に応答する', async () => {
    if (USE_MOCK) {
      // モック応答
      return;
    }
    
    // テスト用のモックデータを準備
    const mockMusicData = { 
      notes: "C4 D4 E4 F4 G4",
      tempo: 120,
      instrument: "piano" 
    };
    
    try {
      const response = await axios.post(`${API_BASE_URL}/music/analyze`, mockMusicData);
      expect(response.data).toHaveProperty('analysis');
    } catch (error) {
      console.error('API呼び出しエラー:', error);
      throw error;
    }
  });

  // テスト環境ではスキップするが、CIで実行される
  it.skipIf(USE_MOCK)('実際のAPIに対するエンドツーエンドテスト', async () => {
    // 実際のAPIへの連携テスト
    const response = await fetch(`${API_BASE_URL}/`);
    const data = await response.json();
    expect(data.version).toBeDefined();
  });
}); 