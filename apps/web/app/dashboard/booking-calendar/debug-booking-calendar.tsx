'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

interface DebugInfo {
  step: string;
  status: 'pending' | 'success' | 'error';
  details?: any;
  error?: string;
  timestamp: number;
}

export default function BookingCalendarDebug() {
  const [debugLog, setDebugLog] = useState<DebugInfo[]>([]);
  const [isDebugging, setIsDebugging] = useState(false);

  const addDebugInfo = (step: string, status: 'pending' | 'success' | 'error', details?: any, error?: string) => {
    setDebugLog(prev => [...prev, {
      step,
      status,
      details,
      error,
      timestamp: Date.now()
    }]);
  };

  const runDebugTest = async () => {
    setIsDebugging(true);
    setDebugLog([]);

    // Step 1: Check authentication
    addDebugInfo('1. 認証確認', 'pending');
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      if (sessionData.session) {
        addDebugInfo('1. 認証確認', 'success', {
          userId: sessionData.session.user.id,
          email: sessionData.session.user.email
        });
      } else {
        addDebugInfo('1. 認証確認', 'error', undefined, 'セッションが見つかりません');
        setIsDebugging(false);
        return;
      }

      // Step 2: Test lesson-slots API
      addDebugInfo('2. レッスンスロットAPI', 'pending');
      const token = sessionData.session?.access_token;
      const slotsResponse = await fetch('/api/lesson-slots?viewMode=all', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
        cache: 'no-store',
      });

      if (slotsResponse.ok) {
        const slotsData = await slotsResponse.json();
        addDebugInfo('2. レッスンスロットAPI', 'success', {
          status: slotsResponse.status,
          slotsCount: slotsData.length,
          firstSlot: slotsData[0] || null
        });
      } else {
        const errorData = await slotsResponse.text();
        addDebugInfo('2. レッスンスロットAPI', 'error', { status: slotsResponse.status }, errorData);
      }

      // Step 3: Test reservations API
      addDebugInfo('3. 予約API', 'pending');
      const reservationsResponse = await fetch('/api/reservations', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
        cache: 'no-store',
      });

      if (reservationsResponse.ok) {
        const reservationsData = await reservationsResponse.json();
        addDebugInfo('3. 予約API', 'success', {
          status: reservationsResponse.status,
          reservationsCount: reservationsData.length
        });
      } else {
        const errorData = await reservationsResponse.text();
        addDebugInfo('3. 予約API', 'error', { status: reservationsResponse.status }, errorData);
      }

      // Step 4: Test data conversion
      addDebugInfo('4. データ変換テスト', 'pending');
      try {
        const testSlot = {
          id: 'test-id',
          teacherId: 'test-teacher',
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          isAvailable: true,
          teacher: { id: 'test-teacher', name: 'テスト講師', image: null },
          reservations: []
        };
        
        addDebugInfo('4. データ変換テスト', 'success', { testSlot });
      } catch (error) {
        addDebugInfo('4. データ変換テスト', 'error', undefined, String(error));
      }

    } catch (error) {
      addDebugInfo('デバッグテスト', 'error', undefined, String(error));
    }

    setIsDebugging(false);
  };

  const clearLog = () => {
    setDebugLog([]);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">予約カレンダー デバッグツール</h2>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={runDebugTest}
          disabled={isDebugging}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isDebugging ? 'デバッグ実行中...' : 'デバッグテスト実行'}
        </button>
        <button
          onClick={clearLog}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          ログクリア
        </button>
      </div>

      <div className="space-y-3">
        {debugLog.map((log, index) => (
          <div
            key={index}
            className={`p-3 rounded border-l-4 ${
              log.status === 'success' ? 'bg-green-50 border-green-400' :
              log.status === 'error' ? 'bg-red-50 border-red-400' :
              'bg-yellow-50 border-yellow-400'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${
                log.status === 'success' ? 'bg-green-500' :
                log.status === 'error' ? 'bg-red-500' :
                'bg-yellow-500'
              }`} />
              <span className="font-medium">{log.step}</span>
              <span className="text-sm text-gray-500">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
            
            {log.error && (
              <div className="text-red-600 text-sm mb-2">
                <strong>エラー:</strong> {log.error}
              </div>
            )}
            
            {log.details && (
              <div className="text-sm bg-gray-100 p-2 rounded overflow-auto">
                <pre>{JSON.stringify(log.details, null, 2)}</pre>
              </div>
            )}
          </div>
        ))}
      </div>

      {debugLog.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          デバッグテストを実行してください
        </div>
      )}
    </div>
  );
}