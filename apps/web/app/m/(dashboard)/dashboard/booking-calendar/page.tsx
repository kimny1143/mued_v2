import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/server/auth';
import MobileBookingCalendarClient from './MobileBookingCalendarClient';

export const dynamic = 'force-dynamic';

export default async function MobileBookingCalendarPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/m/login');
  }

  try {
    const user = session.user;
    const isMentor = session.role === 'mentor';

    return (
      <div className="min-h-screen bg-gray-50">
        <MobileBookingCalendarClient 
          userId={user.id}
          isMentor={isMentor}
        />
      </div>
    );
  } catch (error) {
    console.error('モバイルブッキングカレンダーページエラー:', error);
    
    // 開発環境ではエラー詳細を表示
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-bold mb-2">ブッキングカレンダーエラー</h2>
            <p className="text-red-600 mb-4">ページの読み込み中にエラーが発生しました。</p>
            <details className="text-sm text-gray-600">
              <summary className="cursor-pointer text-red-600">エラー詳細</summary>
              <pre className="mt-2 overflow-auto">{String(error)}</pre>
            </details>
            <div className="mt-4 space-x-2">
              <a href="/m/dashboard" className="text-blue-600 hover:underline">ダッシュボードへ</a>
              <span>|</span>
              <a href="/m/login" className="text-blue-600 hover:underline">ログインページへ</a>
            </div>
          </div>
        </div>
      );
    }
    
    redirect('/m/dashboard');
  }
}