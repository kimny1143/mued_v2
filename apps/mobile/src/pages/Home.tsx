import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { SmartInstallButton } from '../components/SmartInstallButton';

const Home: React.FC = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <h1 className="home-title">MUED LMS</h1>
        <button
          onClick={handleSignOut}
          className="sign-out-button"
        >
          ログアウト
        </button>
      </header>

      <main className="home-main">
        <div className="profile-section">
          <h2 className="section-title">プロフィール</h2>
          <div className="profile-card">
            {user?.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                alt="Profile"
                className="profile-avatar"
              />
            )}
            <div className="profile-info">
              <p className="profile-name">
                {user?.user_metadata?.full_name || user?.email || 'ユーザー'}
              </p>
              <p className="profile-email">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="features-section">
          <h2 className="section-title">機能</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📅</div>
              <h3 className="feature-title">レッスン予約</h3>
              <p className="feature-description">
                レッスンの予約・管理ができます
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📚</div>
              <h3 className="feature-title">教材管理</h3>
              <p className="feature-description">
                教材の閲覧・ダウンロードができます
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3 className="feature-title">メッセージ</h3>
              <p className="feature-description">
                講師とのメッセージのやり取りができます
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3 className="feature-title">進捗管理</h3>
              <p className="feature-description">
                学習の進捗を確認できます
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <SmartInstallButton />
    </div>
  );
};

export default Home;