import React from 'react';
import { usePWA } from '../hooks/usePWA';

export const InstallPWA: React.FC = () => {
  const { isInstalled, isInstallable, installPWA } = usePWA();

  // PWAが既にインストールされている場合は何も表示しない
  if (isInstalled || !isInstallable) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#1e40af',
      color: 'white',
      padding: '12px 24px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 1000,
    }}>
      <span>アプリをインストール</span>
      <button
        onClick={installPWA}
        style={{
          backgroundColor: 'white',
          color: '#1e40af',
          border: 'none',
          padding: '6px 16px',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
      >
        インストール
      </button>
    </div>
  );
};