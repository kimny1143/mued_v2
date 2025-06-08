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
        
        // まず既存のセッションを確認
        const { data: existingSession } = await supabase.auth.getSession();
        if (existingSession?.session) {
          console.log('Already have session, redirecting to home');
          navigate('/');
          return;
        }
        
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
        console.log('Attempting to exchange code for session...');
        
        let data, error;
        try {
          // タイムアウトを設定（10秒）
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Exchange code timeout')), 10000);
          });
          
          const exchangePromise = supabase.auth.exchangeCodeForSession(code);
          
          const result = await Promise.race([
            exchangePromise,
            timeoutPromise.then(() => ({ data: null, error: new Error('Timeout') }))
          ]).catch(err => ({ data: null, error: err }));
          
          data = result.data;
          error = result.error;
        } catch (err) {
          console.error('Exchange code error:', err);
          error = err;
        }
        
        console.log('Exchange result:', { data: !!data, error: !!error });
        
        if (error) {
          console.error('Auth exchange error:', error);
          console.error('Error details:', {
            message: error.message,
            status: error.status,
            name: error.name
          });
          
          // PKCEフローの場合は、getSessionで既存のセッションを確認
          console.log('Checking for existing session...');
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionData?.session) {
            console.log('Found existing session, redirecting to home');
            navigate('/');
            return;
          }
          
          console.error('No existing session found');
          navigate('/login');
          return;
        }
        
        console.log('Auth exchange successful:', data);
        
        if (data?.session) {
          console.log('Session obtained, redirecting to home immediately');
          // すぐにリダイレクト（AuthProviderが後で状態を更新する）
          navigate('/');
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