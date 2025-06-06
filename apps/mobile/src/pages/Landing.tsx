import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePWA } from '../hooks/usePWA';

const Landing: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { isInstallable } = usePWA();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // PWA評価のために少し待つ
    const timer = setTimeout(() => {
      setShowContent(true);
      if (!loading && user) {
        navigate('/home');
      } else if (!loading && !user) {
        navigate('/login');
      }
    }, 100); // 100ms待機

    return () => clearTimeout(timer);
  }, [user, loading, navigate]);

  if (!showContent || loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  return null;
};

export default Landing;