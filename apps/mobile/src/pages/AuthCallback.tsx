import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase認証のコールバック処理
    const handleAuthCallback = async () => {
      try {
        // URLからセッション情報を取得
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          navigate('/login');
          return;
        }

        if (session) {
          // ログイン成功 - ホームページへリダイレクト
          navigate('/');
        } else {
          // セッションがない場合はログインページへ
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