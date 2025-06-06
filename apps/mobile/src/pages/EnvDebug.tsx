import React, { useState } from 'react';
import { BottomNavigation } from '../components/ui/BottomNavigation';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export const EnvDebug: React.FC = () => {
  const [apiTestResult, setApiTestResult] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string;
    details?: any;
  }>({ status: 'idle', message: '' });

  const envVars = {
    'REACT_APP_API_URL': process.env.REACT_APP_API_URL || '(未設定)',
    'REACT_APP_SUPABASE_URL': process.env.REACT_APP_SUPABASE_URL || '(未設定)',
    'REACT_APP_SUPABASE_ANON_KEY': process.env.REACT_APP_SUPABASE_ANON_KEY ? '***設定済み***' : '(未設定)',
    'NODE_ENV': process.env.NODE_ENV || '(未設定)',
  };

  const testApiConnection = async () => {
    setApiTestResult({ status: 'loading', message: 'APIテスト中...' });
    
    const apiUrl = process.env.REACT_APP_API_URL || 'https://mued-lms-fgm-git-develop-glasswerks.vercel.app';
    const testUrl = `${apiUrl}/api/my-reservations`;
    
    try {
      console.log('[EnvDebug] Testing API connection to:', testUrl);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        mode: 'cors',
      });

      console.log('[EnvDebug] Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (response.status === 401) {
        setApiTestResult({
          status: 'success',
          message: 'APIアクセス成功（認証が必要）',
          details: {
            status: response.status,
            message: '401 Unauthorized - 正常な応答です。認証が必要なAPIです。',
          },
        });
      } else if (response.ok) {
        const data = await response.json();
        setApiTestResult({
          status: 'success',
          message: 'APIアクセス成功',
          details: { status: response.status, dataReceived: !!data },
        });
      } else {
        const errorText = await response.text();
        setApiTestResult({
          status: 'error',
          message: `APIエラー: ${response.status}`,
          details: { status: response.status, statusText: response.statusText, error: errorText },
        });
      }
    } catch (error) {
      console.error('[EnvDebug] API test failed:', error);
      setApiTestResult({
        status: 'error',
        message: 'API接続失敗',
        details: {
          error: error instanceof Error ? error.message : String(error),
          type: error instanceof TypeError ? 'Network/CORS Error' : 'Other Error',
          stack: error instanceof Error ? error.stack : undefined,
        },
      });
    }
  };

  const testCorsHeaders = async () => {
    const apiUrl = process.env.REACT_APP_API_URL || 'https://mued-lms-fgm-git-develop-glasswerks.vercel.app';
    const testUrl = `${apiUrl}/api/my-reservations`;
    
    try {
      console.log('[EnvDebug] Testing CORS preflight to:', testUrl);
      
      const response = await fetch(testUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'content-type,authorization',
        },
      });

      console.log('[EnvDebug] Preflight response:', {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
      });

      return response;
    } catch (error) {
      console.error('[EnvDebug] CORS test failed:', error);
      throw error;
    }
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px', backgroundColor: '#f3f4f6' }}>
      <header style={{
        position: 'sticky',
        top: 0,
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px',
        zIndex: 50,
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
          環境変数デバッグ
        </h1>
      </header>

      <div style={{ padding: '16px' }}>
        {/* 環境情報 */}
        <Card style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
            環境情報
          </h2>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            <p><strong>現在のURL:</strong> {window.location.href}</p>
            <p><strong>オリジン:</strong> {window.location.origin}</p>
            <p><strong>ホスト名:</strong> {window.location.hostname}</p>
          </div>
        </Card>

        {/* 環境変数 */}
        <Card style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
            環境変数
          </h2>
          <div style={{ fontSize: '14px' }}>
            {Object.entries(envVars).map(([key, value]) => (
              <div key={key} style={{ 
                marginBottom: '8px',
                padding: '8px',
                backgroundColor: '#f9fafb',
                borderRadius: '4px',
                fontFamily: 'monospace',
              }}>
                <strong>{key}:</strong>{' '}
                <span style={{ color: value === '(未設定)' ? '#ef4444' : '#059669' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* API接続テスト */}
        <Card style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
            API接続テスト
          </h2>
          
          <Button
            onClick={testApiConnection}
            disabled={apiTestResult.status === 'loading'}
            style={{ marginBottom: '12px', width: '100%' }}
          >
            {apiTestResult.status === 'loading' ? (
              <>
                <RefreshCw size={16} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
                テスト中...
              </>
            ) : (
              'APIテストを実行'
            )}
          </Button>

          {apiTestResult.status !== 'idle' && (
            <div style={{
              padding: '12px',
              backgroundColor: apiTestResult.status === 'success' ? '#d1fae5' : 
                             apiTestResult.status === 'error' ? '#fee2e2' : '#e0e7ff',
              borderRadius: '6px',
              marginTop: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                {apiTestResult.status === 'success' && <CheckCircle size={20} color="#059669" style={{ marginRight: '8px' }} />}
                {apiTestResult.status === 'error' && <XCircle size={20} color="#dc2626" style={{ marginRight: '8px' }} />}
                {apiTestResult.status === 'loading' && <AlertCircle size={20} color="#4f46e5" style={{ marginRight: '8px' }} />}
                <strong>{apiTestResult.message}</strong>
              </div>
              
              {apiTestResult.details && (
                <pre style={{
                  fontSize: '12px',
                  backgroundColor: 'white',
                  padding: '8px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '200px',
                }}>
                  {JSON.stringify(apiTestResult.details, null, 2)}
                </pre>
              )}
            </div>
          )}
        </Card>

        {/* 推奨設定 */}
        <Card>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
            推奨設定
          </h2>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            <p style={{ marginBottom: '8px' }}>
              Vercelプロジェクトの環境変数に以下を設定してください：
            </p>
            <pre style={{
              backgroundColor: '#f9fafb',
              padding: '12px',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
            }}>
{`REACT_APP_API_URL=https://mued-lms-fgm-git-develop-glasswerks.vercel.app
REACT_APP_SUPABASE_URL=<Supabase URL>
REACT_APP_SUPABASE_ANON_KEY=<Supabase Anon Key>`}
            </pre>
          </div>
        </Card>
      </div>

      <BottomNavigation />
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};