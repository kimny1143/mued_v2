import { redirect } from 'next/navigation';
import { Metadata, Viewport } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/server/auth';

// PWAメタデータ設定
export const metadata: Metadata = {
  title: 'MUED LMS',
  description: 'MUED Learning Management System',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MUED LMS',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
  },
};

// ビューポート設定
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1e40af',
  viewportFit: 'cover',
};

// モバイル全体を動的レンダリングに設定
export const dynamic = 'force-dynamic';

interface MobileLayoutProps {
  children: React.ReactNode;
}

export default async function MobileLayout({ children }: MobileLayoutProps) {
  // サーバーサイドで認証チェック
  const session = await getServerSession();
  
  if (!session) {
    redirect('/m/auth/login');
  }

  // ユーザー情報を取得
  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role_id: true,
    }
  });

  if (!user) {
    redirect('/m/auth/login');
  }

  return (
    <div className="mobile-app min-h-screen bg-gray-50">
      <main className="pb-16">
        {children}
      </main>
      
      {/* モバイル用ボトムナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex items-center justify-around h-16">
          <a href="/m/dashboard" className="flex flex-col items-center justify-center w-full h-full text-gray-600 hover:text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">ホーム</span>
          </a>
          
          <a href="/m/dashboard/booking-calendar" className="flex flex-col items-center justify-center w-full h-full text-gray-600 hover:text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs mt-1">予約</span>
          </a>
          
          <a href="/m/dashboard/messages" className="flex flex-col items-center justify-center w-full h-full text-gray-600 hover:text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs mt-1">メッセージ</span>
          </a>
          
          <a href="/m/dashboard/profile" className="flex flex-col items-center justify-center w-full h-full text-gray-600 hover:text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs mt-1">プロフィール</span>
          </a>
        </div>
      </nav>
    </div>
  );
}