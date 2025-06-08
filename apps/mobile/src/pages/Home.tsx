import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { SmartInstallButton } from '../components/SmartInstallButton';
import { BottomNavigation } from '../components/ui/BottomNavigation';
import { Card } from '../components/ui/Card';
import { Calendar, MessageCircle, BookOpen, TrendingUp, LogOut, Settings } from 'lucide-react';

const Home: React.FC = () => {
  const { user, signOut, loading, isStudent, isMentor, isAdmin } = useAuth();
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

  // 学生用機能
  const studentFeatures = [
    { 
      icon: <Calendar size={24} />, 
      title: 'レッスン予約', 
      description: 'レッスンの予約・管理',
      path: '/reservations',
      color: '#1e40af',
    },
    { 
      icon: <MessageCircle size={24} />, 
      title: 'メッセージ', 
      description: 'メンターとの連絡',
      path: '/messages',
      color: '#10b981',
    },
    { 
      icon: <BookOpen size={24} />, 
      title: '教材', 
      description: '教材の閲覧',
      path: '/materials',
      color: '#f59e0b',
    },
    { 
      icon: <TrendingUp size={24} />, 
      title: '進捗', 
      description: '学習の記録',
      path: '/progress',
      color: '#ef4444',
    },
  ];

  // メンター用機能
  const mentorFeatures = [
    { 
      icon: <Calendar size={24} />, 
      title: 'スロット管理', 
      description: 'レッスンスロットの設定',
      path: '/slots',
      color: '#1e40af',
    },
    { 
      icon: <MessageCircle size={24} />, 
      title: '予約承認', 
      description: '生徒からの予約を承認',
      path: '/approvals',
      color: '#10b981',
    },
    { 
      icon: <BookOpen size={24} />, 
      title: '教材管理', 
      description: '教材の作成・編集',
      path: '/materials',
      color: '#f59e0b',
    },
    { 
      icon: <TrendingUp size={24} />, 
      title: '生徒管理', 
      description: '生徒の進捗確認',
      path: '/students',
      color: '#ef4444',
    },
  ];

  const features = isMentor ? mentorFeatures : studentFeatures;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px', backgroundColor: '#f3f4f6' }}>
      {/* ヘッダー */}
      <header style={{
        backgroundColor: '#1e40af',
        color: 'white',
        padding: '20px 16px',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '16px',
          display: 'flex',
          gap: '8px',
        }}>
          <button
            onClick={() => navigate('/settings')}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <Settings size={20} />
          </button>
          <button
            onClick={handleSignOut}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <LogOut size={20} />
          </button>
        </div>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 'bold' }}>
          こんにちは、{user?.user_metadata?.full_name || 'ユーザー'}さん
        </h1>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
          {isMentor ? '今日のレッスンの準備はいかがですか？' : '今日も練習を頑張りましょう！'}
        </p>
        {user?.roleName && (
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.8 }}>
            ロール: {user.roleName === 'mentor' || user.roleName === 'teacher' ? 'メンター' : 
                    user.roleName === 'admin' ? '管理者' : '学生'}
          </p>
        )}
      </header>

      {/* クイックアクセス */}
      <div style={{ padding: '16px' }}>
        <h2 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '18px', 
          fontWeight: 'bold',
          color: '#374151',
        }}>
          クイックアクセス
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
        }}>
          {features.map((feature) => (
            <Card
              key={feature.path}
              onClick={() => navigate(feature.path)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '8px',
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: `${feature.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: feature.color,
                }}>
                  {feature.icon}
                </div>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '14px', 
                  fontWeight: 'bold',
                  color: '#111827',
                }}>
                  {feature.title}
                </h3>
                <p style={{ 
                  margin: 0, 
                  fontSize: '12px', 
                  color: '#6b7280',
                }}>
                  {feature.description}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* 今後の予定 */}
        <Card style={{ marginTop: '24px' }}>
          <h3 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '16px', 
            fontWeight: 'bold',
            color: '#374151',
          }}>
            今後の予定
          </h3>
          <div style={{
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#6b7280',
          }}>
            <p style={{ margin: 0, fontSize: '14px' }}>
              予定されているレッスンはありません
            </p>
            <button
              onClick={() => navigate('/reservations')}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                backgroundColor: '#1e40af',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              レッスンを予約
            </button>
          </div>
        </Card>
      </div>
      
      <SmartInstallButton />
      <BottomNavigation />
    </div>
  );
};

export default Home;