import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, MessageCircle, User } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: '/', label: 'ホーム', icon: <Home size={24} /> },
  { path: '/calendar', label: 'カレンダー', icon: <Calendar size={24} /> },
  { path: '/messages', label: 'メッセージ', icon: <MessageCircle size={24} /> },
  { path: '/profile', label: 'プロフィール', icon: <User size={24} /> },
];

export const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'white',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-around',
      padding: '8px 0',
      zIndex: 100,
    }}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              color: isActive ? '#1e40af' : '#6b7280',
              cursor: 'pointer',
              transition: 'color 0.2s',
            }}
          >
            {item.icon}
            <span style={{ fontSize: '12px', fontWeight: isActive ? 'bold' : 'normal' }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};