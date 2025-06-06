import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BottomNavigation } from '../components/ui/BottomNavigation';
import { Card } from '../components/ui/Card';
import { 
  User, 
  CreditCard, 
  Calendar, 
  Settings, 
  HelpCircle, 
  LogOut,
  ChevronRight 
} from 'lucide-react';

const menuItems = [
  { id: 'reservations', label: '予約履歴', icon: Calendar, path: '/reservations' },
  { id: 'payment', label: '支払い情報', icon: CreditCard, path: '/payment' },
  { id: 'settings', label: '設定', icon: Settings, path: '/settings' },
  { id: 'help', label: 'ヘルプ', icon: HelpCircle, path: '/help' },
];

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    if (window.confirm('ログアウトしますか？')) {
      try {
        await signOut();
        navigate('/login');
      } catch (error) {
        console.error('Sign out error:', error);
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px', backgroundColor: '#f3f4f6' }}>
      {/* ヘッダー */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px',
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
          プロフィール
        </h1>
      </header>

      {/* プロフィール情報 */}
      <div style={{ padding: '16px' }}>
        <Card style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Profile"
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <User size={32} color="#6b7280" />
              </div>
            )}
            
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 'bold',
              }}>
                {user?.user_metadata?.full_name || 'ユーザー'}
              </h2>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '14px',
                color: '#6b7280',
              }}>
                {user?.email}
              </p>
            </div>
          </div>
        </Card>

        {/* メニュー */}
        <Card>
          {menuItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                borderBottom: index < menuItems.length - 1 ? '1px solid #e5e7eb' : 'none',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <item.icon size={20} color="#6b7280" />
                <span style={{
                  fontSize: '16px',
                  color: '#374151',
                }}>
                  {item.label}
                </span>
              </div>
              <ChevronRight size={20} color="#9ca3af" />
            </button>
          ))}
        </Card>

        {/* ログアウトボタン */}
        <button
          onClick={handleSignOut}
          style={{
            width: '100%',
            marginTop: '24px',
            padding: '16px',
            backgroundColor: 'white',
            color: '#dc2626',
            border: '1px solid #fee2e2',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <LogOut size={20} />
          ログアウト
        </button>
      </div>

      <BottomNavigation />
    </div>
  );
};