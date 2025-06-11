'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';

export default function TestV2ApiPage() {
  const [v1Data, setV1Data] = useState<any>(null);
  const [v2Data, setV2Data] = useState<any>(null);
  const [v1Time, setV1Time] = useState<number>(0);
  const [v2Time, setV2Time] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testApis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // v1 API テスト
      const v1Start = performance.now();
      const v1Response = await fetch('/api/lesson-slots');
      const v1Json = await v1Response.json();
      const v1End = performance.now();
      setV1Time(v1End - v1Start);
      setV1Data(v1Json);
      
      // v2 API テスト
      const v2Start = performance.now();
      const v2Response = await fetch('/api/lesson-slots-v2');
      const v2Json = await v2Response.json();
      const v2End = performance.now();
      setV2Time(v2End - v2Start);
      setV2Data(v2Json);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const performanceImprovement = v1Time > 0 ? ((v1Time - v2Time) / v1Time * 100).toFixed(1) : 0;
  const isFaster = v2Time < v1Time;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">v2 API テストページ</h1>
      
      <div className="mb-6">
        <Button onClick={testApis} disabled={loading}>
          {loading ? 'テスト中...' : 'APIテスト実行'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          エラー: {error}
        </div>
      )}

      {(v1Data || v2Data) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">v1 API (現在の実装)</h3>
            <p className="text-sm text-gray-600">レスポンス時間: {v1Time.toFixed(2)}ms</p>
            <p className="mb-2 mt-4">件数: {Array.isArray(v1Data) ? v1Data.length : 0}件</p>
            {Array.isArray(v1Data) && v1Data.length > 0 && (
              <div className="mt-4">
                <p className="font-semibold mb-2">最初のアイテム:</p>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                  {JSON.stringify(v1Data[0], null, 2)}
                </pre>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">v2 API (ビュー使用)</h3>
            <p className="text-sm text-gray-600">
              レスポンス時間: {v2Time.toFixed(2)}ms
              {isFaster && (
                <span className="text-green-600 ml-2">
                  ({performanceImprovement}% 高速化)
                </span>
              )}
            </p>
            <p className="mb-2 mt-4">件数: {Array.isArray(v2Data) ? v2Data.length : 0}件</p>
            {Array.isArray(v2Data) && v2Data.length > 0 && (
              <div className="mt-4">
                <p className="font-semibold mb-2">最初のアイテム:</p>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                  {JSON.stringify(v2Data[0], null, 2)}
                </pre>
              </div>
            )}
          </Card>
        </div>
      )}

      {v1Data && v2Data && (
        <Card className="p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">比較結果</h3>
          <div className="space-y-2">
            <p>✅ 件数の一致: {Array.isArray(v1Data) && Array.isArray(v2Data) && v1Data.length === v2Data.length ? '○' : '×'}</p>
            <p>✅ パフォーマンス: {isFaster ? `v2が${performanceImprovement}%高速` : 'v1の方が高速'}</p>
            <p>✅ データ構造: {JSON.stringify(Object.keys(v1Data[0] || {})) === JSON.stringify(Object.keys(v2Data[0] || {})) ? '同一' : '差異あり'}</p>
          </div>
        </Card>
      )}
    </div>
  );
}