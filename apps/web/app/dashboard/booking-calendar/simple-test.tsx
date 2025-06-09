'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function SimpleTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testAPI = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🔵 Starting API test...');
      
      // Test authentication
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      console.log('🔵 Session:', !!sessionData.session);
      
      if (!sessionData.session) {
        throw new Error('No session found');
      }

      const token = sessionData.session.access_token;
      console.log('🔵 Token:', !!token);

      // Test lesson-slots API
      console.log('🔵 Testing lesson-slots API...');
      const slotsResponse = await fetch('/api/lesson-slots?viewMode=all', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
        cache: 'no-store',
      });

      console.log('🔵 Slots response status:', slotsResponse.status);
      
      if (!slotsResponse.ok) {
        const errorText = await slotsResponse.text();
        throw new Error(`Slots API error: ${slotsResponse.status} - ${errorText}`);
      }

      const slotsData = await slotsResponse.json();
      console.log('🔵 Slots data received:', slotsData.length, 'items');

      // Test reservations API
      console.log('🔵 Testing reservations API...');
      const reservationsResponse = await fetch('/api/reservations', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
        cache: 'no-store',
      });

      console.log('🔵 Reservations response status:', reservationsResponse.status);
      
      let reservationsData = [];
      if (reservationsResponse.ok) {
        reservationsData = await reservationsResponse.json();
        console.log('🔵 Reservations data received:', reservationsData.length, 'items');
      }

      setResult({
        session: {
          userId: sessionData.session.user.id,
          email: sessionData.session.user.email
        },
        slots: {
          count: slotsData.length,
          sample: slotsData.slice(0, 2)
        },
        reservations: {
          count: reservationsData.length,
          sample: reservationsData.slice(0, 2)
        }
      });

    } catch (err) {
      console.error('🔴 API test error:', err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">API接続テスト</h2>
      
      <button
        onClick={testAPI}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 mb-4"
      >
        {loading ? 'テスト実行中...' : 'APIテスト実行'}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
          <h3 className="font-bold">エラー:</h3>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
          <h3 className="font-bold mb-2">テスト成功:</h3>
          <pre className="text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}