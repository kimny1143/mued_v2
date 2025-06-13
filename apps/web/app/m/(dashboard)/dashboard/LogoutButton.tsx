'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@ui/button';

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!window?.location) {
      console.error('window.location is not available');
      return;
    }

    try {
      setIsLoggingOut(true);
      window.location.href = '/api/auth/logout';
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
      // エラーが発生した場合でも、ログアウトを試みる
      try {
        router.push('/m/login');
      } catch (routerError) {
        console.error('Router navigation error:', routerError);
      }
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-red-600 hover:text-red-700 font-medium"
      onClick={handleLogout}
      disabled={isLoggingOut}
    >
      {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
    </Button>
  );
}