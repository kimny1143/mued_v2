import React from 'react';

const EnvDebug = () => {
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    REACT_APP_API_URL: process.env.REACT_APP_API_URL,
    REACT_APP_SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL,
    REACT_APP_SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY ? '設定済み' : '未設定',
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>環境変数デバッグ</h1>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>変数名</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>値</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(envVars).map(([key, value]) => (
            <tr key={key}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{key}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                {value || <span style={{ color: 'red' }}>未設定</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <h2 style={{ marginTop: '20px' }}>現在の環境</h2>
      <ul>
        <li>ホスト名: {window.location.hostname}</li>
        <li>プロトコル: {window.location.protocol}</li>
        <li>ポート: {window.location.port || 'デフォルト'}</li>
        <li>URL: {window.location.href}</li>
      </ul>
    </div>
  );
};

export default EnvDebug;