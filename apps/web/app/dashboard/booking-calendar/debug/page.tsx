import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/server/auth';
import BookingCalendarDebug from '../debug-booking-calendar';

export default async function BookingCalendarDebugPage() {
  // Authentication check
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto py-8">
      <BookingCalendarDebug />
    </div>
  );
}