import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/server/auth';
import SimpleTest from '../simple-test';

export default async function SimpleTestPage() {
  // Authentication check
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto py-8">
      <SimpleTest />
    </div>
  );
}