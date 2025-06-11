import { getServerSession } from '@/lib/server/auth';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';

export default async function MobileDashboardPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/m/login');
  }

  try {
    const supabase = createServiceClient();
    
    // ユーザー情報は既にsessionに含まれているので、そこから取得
    const user = session.user;
    const isMentor = session.role === 'mentor';
    const userName = user.name || user.email?.split('@')[0] || 'ユーザー';

    // 今後の予約を取得（Supabaseクライアントを使用）
    let upcomingReservations: any[] = [];
    let pendingApprovalCount = 0;

    if (isMentor) {
      // メンターの場合
      const { data: reservations, error: reservationsError } = await supabase
        .from('reservations')
        .select(`
          *,
          lesson_slots!inner(
            id,
            teacher_id,
            users!teacher_id(id, name, email)
          ),
          users!student_id(id, name, email)
        `)
        .eq('lesson_slots.teacher_id', user.id)
        .in('status', ['PENDING_APPROVAL', 'APPROVED'])
        .order('booked_start_time', { ascending: true })
        .limit(5);

      if (!reservationsError && reservations) {
        upcomingReservations = reservations;
      }

      // 承認待ち予約数を取得
      const { count, error: countError } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('lesson_slots.teacher_id', user.id)
        .eq('status', 'PENDING_APPROVAL');

      if (!countError && count !== null) {
        pendingApprovalCount = count;
      }
    } else {
      // 生徒の場合
      const { data: reservations, error: reservationsError } = await supabase
        .from('reservations')
        .select(`
          *,
          lesson_slots!inner(
            id,
            teacher_id,
            users!teacher_id(id, name, email)
          ),
          users!student_id(id, name, email)
        `)
        .eq('student_id', user.id)
        .in('status', ['PENDING_APPROVAL', 'APPROVED'])
        .order('booked_start_time', { ascending: true })
        .limit(5);

      if (!reservationsError && reservations) {
        upcomingReservations = reservations;
      }
    }

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  こんにちは、{userName}さん
                </h1>
                <div className="mt-1">
                  <span className={`
                    inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                    ${session.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                      session.role === 'mentor' ? 'bg-blue-100 text-blue-800' : 
                      'bg-green-100 text-green-800'}
                  `}>
                    {session.role === 'admin' ? '管理者' : 
                     session.role === 'mentor' ? 'メンター' : 
                     '生徒'}
                  </span>
                </div>
              </div>
              <a
                href="/api/auth/logout"
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                ログアウト
              </a>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 py-6 space-y-6">
          {/* Quick Actions */}
          <section>
            <h2 className="text-lg font-medium text-gray-900 mb-3">メニュー</h2>
            <div className="grid grid-cols-3 gap-3">
              <a
                href="/m/dashboard/booking-calendar"
                className="flex flex-col items-center justify-center p-3 bg-blue-500 text-white rounded-lg shadow-sm"
              >
                <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-medium text-center">
                  {isMentor ? 'スロット管理' : '予約する'}
                </span>
              </a>

              <a
                href="/m/dashboard/reservations"
                className="flex flex-col items-center justify-center p-3 bg-green-500 text-white rounded-lg shadow-sm relative"
              >
                {isMentor && pendingApprovalCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingApprovalCount}
                  </span>
                )}
                <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-xs font-medium text-center">
                  {isMentor ? '予約管理' : '予約一覧'}
                </span>
              </a>

              <a
                href="/m/dashboard/my-lessons"
                className="flex flex-col items-center justify-center p-3 bg-indigo-500 text-white rounded-lg shadow-sm"
              >
                <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="text-xs font-medium text-center">マイレッスン</span>
              </a>

              <a
                href="/m/dashboard/messages"
                className="flex flex-col items-center justify-center p-3 bg-purple-500 text-white rounded-lg shadow-sm"
              >
                <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-xs font-medium text-center">メッセージ</span>
              </a>

              <a
                href="/m/dashboard/materials"
                className="flex flex-col items-center justify-center p-3 bg-orange-500 text-white rounded-lg shadow-sm"
              >
                <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="text-xs font-medium text-center">教材</span>
              </a>

              <a
                href="/m/dashboard/exercises"
                className="flex flex-col items-center justify-center p-3 bg-teal-500 text-white rounded-lg shadow-sm"
              >
                <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l6-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                </svg>
                <span className="text-xs font-medium text-center">練習記録</span>
              </a>

              {isMentor && (
                <a
                  href="/m/dashboard/mentor-approvals"
                  className="flex flex-col items-center justify-center p-3 bg-red-500 text-white rounded-lg shadow-sm relative"
                >
                  {pendingApprovalCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {pendingApprovalCount}
                    </span>
                  )}
                  <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-medium text-center">承認管理</span>
                </a>
              )}

              <a
                href="/m/dashboard/plans"
                className="flex flex-col items-center justify-center p-3 bg-pink-500 text-white rounded-lg shadow-sm"
              >
                <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span className="text-xs font-medium text-center">プラン</span>
              </a>

              <a
                href="/m/dashboard/settings"
                className="flex flex-col items-center justify-center p-3 bg-gray-500 text-white rounded-lg shadow-sm"
              >
                <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs font-medium text-center">設定</span>
              </a>
            </div>
          </section>

          {/* Upcoming Reservations */}
          <section>
            <h2 className="text-lg font-medium text-gray-900 mb-3">今後の予約</h2>
            {upcomingReservations.length > 0 ? (
              <div className="space-y-3">
                {upcomingReservations.map((reservation) => {
                  const mentorData = reservation.lesson_slots?.users;
                  const studentData = reservation.users;
                  const mentorName = mentorData?.name || mentorData?.email || 'メンター情報なし';
                  const studentName = studentData?.name || studentData?.email || '生徒情報なし';
                  const startTime = new Date(reservation.booked_start_time);
                  const endTime = new Date(reservation.booked_end_time);
                  
                  return (
                    <div key={reservation.id} className="bg-white rounded-lg shadow-sm p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {isMentor ? studentName : mentorName}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {startTime.toLocaleDateString('ja-JP', {
                              month: 'numeric',
                              day: 'numeric',
                              weekday: 'short'
                            })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {startTime.toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })} - {endTime.toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          reservation.status === 'APPROVED' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {reservation.status === 'APPROVED' ? '承認済み' : '承認待ち'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-500">予約はありません</p>
                <a 
                  href="/m/dashboard/booking-calendar"
                  className="inline-block mt-4 px-4 py-2 bg-blue-500 text-white rounded-md text-sm"
                >
                  {isMentor ? 'スロットを作成' : '予約する'}
                </a>
              </div>
            )}
          </section>
        </main>
      </div>
    );
  } catch (error) {
    console.error('ダッシュボードエラー:', error);
    
    // 開発環境ではエラーの詳細を表示
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-bold mb-2">ダッシュボードエラー</h2>
            <p className="text-red-600 mb-4">データの読み込み中にエラーが発生しました。</p>
            <details className="text-sm text-gray-600">
              <summary className="cursor-pointer text-red-600">エラー詳細</summary>
              <pre className="mt-2 overflow-auto">{String(error)}</pre>
            </details>
            <div className="mt-4 space-x-2">
              <a href="/m/login" className="text-blue-600 hover:underline">ログインページへ</a>
              <span>|</span>
              <a href="/" className="text-blue-600 hover:underline">ホームへ</a>
            </div>
          </div>
        </div>
      );
    }
    
    // 本番環境ではログインページにリダイレクト
    redirect('/m/login');
  }
}