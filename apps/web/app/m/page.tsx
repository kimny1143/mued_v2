import { redirect } from 'next/navigation';

export default function MobileHomePage() {
  // モバイルのホームページはダッシュボードにリダイレクト
  redirect('/m/dashboard');
}