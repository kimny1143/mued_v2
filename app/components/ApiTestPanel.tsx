"use client";

import React, { useState } from 'react';
import apiTestClient from '../../lib/apiTestClient';
import { API_BASE_URL } from '../config/api';

const ApiTestPanel = () => {
  type ApiResult = Record<string, unknown>;
  
  const [result, setResult] = useState<ApiResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTest, setActiveTest] = useState<string>('health'); // 'health', 'music', 'all'

  const testConnection = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/`);
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(`エラー発生: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testAllEndpoints = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await apiTestClient.testAllEndpoints();
      // @ts-expect-error: apiTestClientの戻り値型と互換性の問題を一時的に回避
      setResult(results);
    } catch (err) {
      setError(`エラー発生: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runTest = () => {
    if (activeTest === 'health') {
      testConnection();
    } else if (activeTest === 'all') {
      testAllEndpoints();
    }
  };

  return (
    <div className="p-4 border rounded">
      <h2 className="text-lg font-bold mb-2">AI APIテスト</h2>
      
      <div className="flex mb-4">
        <select 
          value={activeTest}
          onChange={(e) => setActiveTest(e.target.value)}
          className="mr-2 p-2 border rounded"
        >
          <option value="health">ヘルスチェック</option>
          <option value="all">全エンドポイント</option>
        </select>
        
        <button 
          onClick={runTest}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {isLoading ? 'テスト中...' : '接続テスト実行'}
        </button>
      </div>
      
      <div className="text-sm text-gray-500 mb-2">
        API URL: {API_BASE_URL}
      </div>
      
      {error && <div className="mt-2 text-red-500">{error}</div>}
      
      {result && (
        <div className="mt-2">
          <h3 className="font-semibold">結果:</h3>
          <pre className="bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-80">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ApiTestPanel;