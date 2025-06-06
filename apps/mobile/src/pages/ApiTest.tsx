import React, { useState, useEffect } from 'react';
import { BottomNavigation } from '../components/ui/BottomNavigation';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Info } from 'lucide-react';

export const ApiTest: React.FC = () => {
  const [tests, setTests] = useState<Array<{
    name: string;
    status: 'pending' | 'running' | 'success' | 'error';
    result?: any;
    error?: string;
  }>>([]);

  // テストケース定義
  const testCases = [
    {
      name: '環境変数確認',
      test: async () => {
        const apiUrl = process.env.REACT_APP_API_URL || '';
        if (!apiUrl) {
          throw new Error('REACT_APP_API_URL が設定されていません');
        }
        return {
          REACT_APP_API_URL: apiUrl,
          NODE_ENV: process.env.NODE_ENV,
          hostname: window.location.hostname,
        };
      },
    },
    {
      name: 'シンプルなfetchテスト（JSONPlaceholder）',
      test: async () => {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
        const data = await response.json();
        return { status: response.status, data };
      },
    },
    {
      name: 'PC版APIへの直接アクセステスト',
      test: async () => {
        const url = 'https://mued-lms-fgm-git-develop-glasswerks.vercel.app/api/my-reservations';
        console.log('[ApiTest] Testing direct API access:', url);
        
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            mode: 'cors',
          });
          
          // レスポンスヘッダーの詳細を取得
          const headers: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });
          
          return {
            status: response.status,
            statusText: response.statusText,
            headers,
            ok: response.ok,
          };
        } catch (error) {
          // エラーの詳細を記録
          console.error('[ApiTest] Direct API test error:', error);
          throw error;
        }
      },
    },
    {
      name: 'OPTIONSリクエストテスト（プリフライト）',
      test: async () => {
        const url = 'https://mued-lms-fgm-git-develop-glasswerks.vercel.app/api/my-reservations';
        console.log('[ApiTest] Testing OPTIONS request:', url);
        
        const response = await fetch(url, {
          method: 'OPTIONS',
          headers: {
            'Origin': window.location.origin,
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'content-type,authorization',
          },
        });
        
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        
        return {
          status: response.status,
          headers,
          corsHeaders: {
            'access-control-allow-origin': headers['access-control-allow-origin'] || 'Not set',
            'access-control-allow-methods': headers['access-control-allow-methods'] || 'Not set',
            'access-control-allow-headers': headers['access-control-allow-headers'] || 'Not set',
            'access-control-allow-credentials': headers['access-control-allow-credentials'] || 'Not set',
          },
        };
      },
    },
    {
      name: 'credentials付きリクエストテスト',
      test: async () => {
        const url = 'https://mued-lms-fgm-git-develop-glasswerks.vercel.app/api/my-reservations';
        console.log('[ApiTest] Testing with credentials:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          mode: 'cors',
        });
        
        return {
          status: response.status,
          statusText: response.statusText,
          credentialsMode: 'include',
        };
      },
    },
  ];

  const runAllTests = async () => {
    const newTests = testCases.map(tc => ({
      name: tc.name,
      status: 'pending' as const,
    }));
    setTests(newTests);

    for (let i = 0; i < testCases.length; i++) {
      setTests(prev => {
        const updated = [...prev];
        updated[i].status = 'running';
        return updated;
      });

      try {
        const result = await testCases[i].test();
        setTests(prev => {
          const updated = [...prev];
          updated[i].status = 'success';
          updated[i].result = result;
          return updated;
        });
      } catch (error) {
        console.error(`[ApiTest] Test "${testCases[i].name}" failed:`, error);
        setTests(prev => {
          const updated = [...prev];
          updated[i].status = 'error';
          updated[i].error = error instanceof Error ? error.message : String(error);
          updated[i].result = {
            errorType: error instanceof TypeError ? 'TypeError (Network/CORS)' : 'Other',
            errorMessage: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          };
          return updated;
        });
      }

      // 次のテストまで少し待機
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  useEffect(() => {
    // ページロード時に自動実行
    runAllTests();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertCircle size={20} color="#9ca3af" />;
      case 'running':
        return <RefreshCw size={20} color="#3b82f6" className="animate-spin" />;
      case 'success':
        return <CheckCircle size={20} color="#10b981" />;
      case 'error':
        return <XCircle size={20} color="#ef4444" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f3f4f6';
      case 'running':
        return '#dbeafe';
      case 'success':
        return '#d1fae5';
      case 'error':
        return '#fee2e2';
      default:
        return '#f3f4f6';
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
          API接続診断
        </h1>
      </header>

      <div style={{ padding: '16px' }}>
        {/* 現在の環境情報 */}
        <Card style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <Info size={20} color="#3b82f6" style={{ marginRight: '8px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
              現在の環境
            </h2>
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            <p><strong>オリジン:</strong> {window.location.origin}</p>
            <p><strong>ユーザーエージェント:</strong> {navigator.userAgent}</p>
          </div>
        </Card>

        {/* 再実行ボタン */}
        <Button
          onClick={runAllTests}
          style={{ marginBottom: '16px', width: '100%' }}
          disabled={tests.some(t => t.status === 'running')}
        >
          <RefreshCw size={16} style={{ marginRight: '8px' }} />
          すべてのテストを再実行
        </Button>

        {/* テスト結果 */}
        {tests.map((test, index) => (
          <Card key={index} style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: test.result || test.error ? '12px' : 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {getStatusIcon(test.status)}
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: 'bold', 
                  margin: '0 0 0 8px',
                }}>
                  {test.name}
                </h3>
              </div>
              <span style={{
                fontSize: '12px',
                padding: '2px 8px',
                backgroundColor: getStatusColor(test.status),
                borderRadius: '4px',
                fontWeight: 'bold',
              }}>
                {test.status === 'pending' && '待機中'}
                {test.status === 'running' && '実行中'}
                {test.status === 'success' && '成功'}
                {test.status === 'error' && 'エラー'}
              </span>
            </div>

            {(test.result || test.error) && (
              <pre style={{
                fontSize: '12px',
                backgroundColor: '#f9fafb',
                padding: '12px',
                borderRadius: '6px',
                overflow: 'auto',
                maxHeight: '300px',
                margin: 0,
              }}>
                {JSON.stringify(test.result || { error: test.error }, null, 2)}
              </pre>
            )}
          </Card>
        ))}

        {/* 診断結果サマリー */}
        {tests.length > 0 && tests.every(t => t.status !== 'pending' && t.status !== 'running') && (
          <Card>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
              診断結果サマリー
            </h2>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              <p>
                <strong>成功:</strong> {tests.filter(t => t.status === 'success').length} / {tests.length}
              </p>
              {tests.some(t => t.status === 'error' && t.error?.includes('Failed to fetch')) && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#fef3c7',
                  borderRadius: '6px',
                  border: '1px solid #fcd34d',
                }}>
                  <strong>⚠️ CORSまたはネットワークエラーが検出されました</strong>
                  <p style={{ marginTop: '8px' }}>
                    ブラウザの開発者ツールでNetworkタブとConsoleタブを確認してください。
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      <BottomNavigation />
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};