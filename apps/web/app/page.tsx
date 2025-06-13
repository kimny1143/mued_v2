import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/server/auth';
import LandingPageClient from './page.client';

export const dynamic = 'force-dynamic';

export default async function Page() {
  // 開発環境でMOBILE_PREVIEWが設定されている場合はモバイル版へリダイレクト
  if (process.env.MOBILE_PREVIEW === 'true') {
    redirect('/m/login');
  }

  // セッションチェック
  const session = await getServerSession();
  
  if (session) {
    // ログイン済みならダッシュボードへ
    redirect('/dashboard');
  }

  // 未ログインならクライアントコンポーネントを表示
  return <LandingPageClient />;
}