import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/server/auth';
import { createServiceClient } from '@/lib/supabase/service';
import MobileReservationsClient from './MobileReservationsClient';

export default async function MobileReservationsPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/m/login');
  }

  try {
    const supabase = createServiceClient();
    const user = session.user;
    const isMentor = session.role === 'mentor';

    // 予約データを取得（Supabaseクライアントを使用）
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select(`
        *,
        lesson_slots!inner(
          id,
          teacher_id,
          users!teacher_id(id, name, email)
        ),
        users!student_id(id, name, email),
        payments(
          id,
          status,
          stripe_payment_id,
          metadata
        )
      `)
      .eq(isMentor ? 'lesson_slots.teacher_id' : 'student_id', user.id)
      .order('booked_start_time', { ascending: false });

    if (error) {
      console.error('予約データ取得エラー:', error);
      
      // 開発環境ではエラー詳細を表示
      if (process.env.NODE_ENV === 'development') {
        return (
          <div className="min-h-screen bg-gray-50 p-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-red-800 font-bold mb-2">予約データ取得エラー</h2>
              <p className="text-red-600 mb-4">データの読み込み中にエラーが発生しました。</p>
              <details className="text-sm text-gray-600">
                <summary className="cursor-pointer text-red-600">エラー詳細</summary>
                <pre className="mt-2 overflow-auto">{JSON.stringify(error, null, 2)}</pre>
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

    return (
      <div className="min-h-screen bg-gray-50">
        <MobileReservationsClient 
          reservations={reservations || []}
          isMentor={isMentor}
          userId={user.id}
        />
      </div>
    );
  } catch (error) {
    console.error('予約ページエラー:', error);
    
    // 開発環境ではエラー詳細を表示
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-bold mb-2">予約ページエラー</h2>
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