"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  BellIcon, 
  UserCircleIcon, 
  HomeIcon, 
  BookOpenIcon, 
  MessageSquareIcon, 
  SettingsIcon, 
  FolderIcon, 
  DumbbellIcon
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { PlanBadge } from "@/app/components/PlanBadge";

// ナビゲーション項目
const dashboardNavItems = [
  { icon: HomeIcon, label: "Dashboard", path: "/dashboard" },
  { icon: FolderIcon, label: "Materials", path: "/dashboard/materials" },
  { icon: BookOpenIcon, label: "My Lessons", path: "/dashboard/my-lessons" },
  { icon: DumbbellIcon, label: "Exercise", path: "/dashboard/exercises" },
  { icon: MessageSquareIcon, label: "Messages", path: "/dashboard/messages" },
  { icon: SettingsIcon, label: "Settings", path: "/dashboard/settings" }
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  
  // ユーザー情報を取得
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setUser(data.session?.user || null);
        setLoading(false);
        
        // セッションがない場合はログインページへリダイレクト
        if (!data.session) {
          router.push('/login');
        }
      } catch (err) {
        console.error("セッション取得エラー:", err);
        setLoading(false);
      }
    };
    
    getUser();
    
    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
        // サインアウト時にリダイレクト
        if (event === 'SIGNED_OUT') {
          router.push('/login');
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [router]);
  
  // サインアウト処理
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  // ローディング中表示
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ヘッダー */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-10 flex items-center justify-between px-6">
        <div className="flex items-center">
          <div className="flex items-center gap-2">
            <img src="/logomark.svg" alt="MUED" className="h-6 w-6" />
            <span className="text-xl font-bold">MUED</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <BellIcon className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
          </div>
          <UserCircleIcon className="h-6 w-6" />
          <div className="text-sm font-medium mr-4">
            {user?.email}
          </div>
          <button 
            onClick={handleSignOut} 
            className="text-sm font-medium"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* サイドバー */}
      <div className="fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-200">
        <div className="p-6 flex items-start gap-3">
          <UserCircleIcon className="h-12 w-12" />
          <div className="mt-1">
            <PlanBadge />
          </div>
        </div>
        <div className="px-6 pb-4">
          <Link 
            href="/dashboard/plans" 
            className="block w-full py-2 text-center border border-gray-200 rounded text-sm font-medium"
          >
            Upgrade Plan
          </Link>
        </div>
        <nav className="px-2 mt-4">
          {dashboardNavItems.map((item, index) => (
            <Link
              key={index}
              href={item.path}
              className={`flex items-center py-2 px-4 my-1 rounded ${
                pathname === item.path
                  ? 'bg-black text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="h-5 w-5 mr-3" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* メインコンテンツ */}
      <div className="ml-64 pt-16 w-full bg-[#F7F8FA]">
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
} 