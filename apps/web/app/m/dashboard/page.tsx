import { getServerSession } from '@/lib/server/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function MobileDashboardPage() {
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

  const isMentor = user.role_id === 'mentor';
  const userName = user.name || user.email?.split('@')[0] || 'ユーザー';

  // 今後の予約を取得
  const upcomingReservations = await prisma.reservations.findMany({
    where: isMentor ? {
      lesson_slot: {
        mentor_id: user.id
      },
      status: { in: ['pending', 'approved'] }
    } : {
      student_id: user.id,
      status: { in: ['pending', 'approved'] }
    },
    include: {
      lesson_slot: {
        include: {
          mentor: {
            select: { name: true, email: true }
          }
        }
      },
      student: {
        select: { name: true, email: true }
      }
    },
    orderBy: {
      lesson_slot: {
        start_time: 'asc'
      }
    },
    take: 5
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-900">
            こんにちは、{userName}さん
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {isMentor ? 'メンターダッシュボード' : '生徒ダッシュボード'}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-medium text-gray-900 mb-3">クイックアクション</h2>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="/m/dashboard/booking-calendar"
              className="flex flex-col items-center justify-center p-4 bg-blue-500 text-white rounded-lg shadow-sm"
            >
              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium">
                {isMentor ? 'スロット管理' : '予約する'}
              </span>
            </a>

            <a
              href="/m/dashboard/reservations"
              className="flex flex-col items-center justify-center p-4 bg-green-500 text-white rounded-lg shadow-sm"
            >
              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-sm font-medium">予約一覧</span>
            </a>

            <a
              href="/m/dashboard/messages"
              className="flex flex-col items-center justify-center p-4 bg-purple-500 text-white rounded-lg shadow-sm"
            >
              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-sm font-medium">メッセージ</span>
            </a>

            <a
              href="/m/dashboard/materials"
              className="flex flex-col items-center justify-center p-4 bg-orange-500 text-white rounded-lg shadow-sm"
            >
              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-sm font-medium">教材</span>
            </a>
          </div>
        </section>

        {/* Upcoming Reservations */}
        <section>
          <h2 className="text-lg font-medium text-gray-900 mb-3">今後の予約</h2>
          {upcomingReservations.length > 0 ? (
            <div className="space-y-3">
              {upcomingReservations.map((reservation) => {
                const mentorName = reservation.lesson_slot.mentor.name || reservation.lesson_slot.mentor.email;
                const studentName = reservation.student.name || reservation.student.email;
                const startTime = new Date(reservation.lesson_slot.start_time);
                
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
                          })} - {new Date(reservation.lesson_slot.end_time).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        reservation.status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {reservation.status === 'approved' ? '承認済み' : '承認待ち'}
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
}