'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from "./components/ui/card";
import { Container } from "./landing-sections/container";
import { MainContentWrapper } from "./landing-sections/main-content-wrapper";
import { SoftwareCompany } from "./landing-sections/software-company";
import { SoftwareCompanyWrapper } from "./landing-sections/software-company-wrapper";
import Image from "next/image";
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

// useSearchParamsを使用するコンテンツコンポーネント
function LandingPageContent(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromMiddleware = searchParams.get('from') === 'middleware';
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 直接セッションチェック
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setUser(data.session?.user || null);
        setLoading(false);
        
        // console.log("Root page: Direct session check:", data.session ? "セッションあり" : "セッションなし");
        if (data.session) {
          // console.log("Root page: Session found directly, user ID:", data.session.user.id);
        }
      } catch (err) {
        console.error("Root page: Session check error:", err);
        setLoading(false);
      }
    };
    
    checkSession();
    
    // ミドルウェアからのリダイレクトの場合は何もしない（ループ防止）
    if (fromMiddleware) {
      // console.log('Root page: Detected redirect from middleware, preventing loop');
      return;
    }
    
    // ログイン済みの場合のみダッシュボードにリダイレクト
    if (!loading && user) {
      // console.log('Root page: User is authenticated, redirecting to dashboard');
      router.push('/dashboard');
    }
    
    // 認証状態変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [user, loading, router, fromMiddleware]);

  // 認証コードの検出とリダイレクト
  useEffect(() => {
    // URLにcodeパラメータが含まれる場合、認証コールバックと判断
    const code = searchParams.get('code');
    const next = searchParams.get('next') || '/dashboard';
    
    if (code) {
      // console.log('ルートパスで認証コードを検出:', code);
      // auth/callbackに転送し、元のnextパラメータも保持
      const callbackUrl = `/auth/callback?code=${code}&next=${encodeURIComponent(next)}`;
      // console.log('リダイレクト先:', callbackUrl);
      window.location.href = callbackUrl;
      return;
    }
  }, [searchParams, router]);

  // ローディング中は読み込み画面を表示
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
          <p className="text-muted-foreground">Please wait while we check your authentication status.</p>
        </div>
      </div>
    );
  }

  // 未ログインの場合はランディングページを表示
  return (
    <div
      className="flex flex-col w-full min-h-[900px] items-start px-0 sm:px-12 py-0 relative bg-white border-none rounded-none"
    >
      <SoftwareCompany />
      <Container />
      <MainContentWrapper />
      <SoftwareCompanyWrapper />
    </div>
  );
}

// Suspenseでラップした親コンポーネント
export default function PageLandingMued(): JSX.Element {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">ロード中...</div>}>
      <LandingPageContent />
    </Suspense>
  );
}
