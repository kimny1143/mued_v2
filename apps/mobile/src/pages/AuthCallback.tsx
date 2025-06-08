import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase認証のコールバック処理
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback started');
        console.log('Current URL:', window.location.href);
        
        // URLのクエリパラメータから認証コードを取得
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        console.log('Auth code:', code);
        
        if (!code) {
          console.error('No auth code found in URL');
          navigate('/login');
          return;
        }
        
        // Supabaseの認証コードをセッションに交換
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          console.error('Auth exchange error:', error);
          navigate('/login');
          return;
        }
        
        console.log('Auth exchange successful:', data);
        
        if (data.session) {
          console.log('Session obtained, redirecting to home');
          // 少し遅延を入れて、認証状態が確実に更新されるようにする
          setTimeout(() => {
            navigate('/');
          }, 100);
        } else {
          console.error('No session in auth response');
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>認証処理中...</p>
    </div>
  );
};

export default AuthCallback;