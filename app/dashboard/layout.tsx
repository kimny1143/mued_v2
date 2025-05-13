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
  DumbbellIcon,
  MenuIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";

// ナビゲーション項目
const dashboardNavItems = [
  { icon: HomeIcon, label: "Dashboard", path: "/dashboard" },
  { icon: FolderIcon, label: "Materials", path: "/dashboard/materials" },
  { icon: BookOpenIcon, label: "My Lessons", path: "/dashboard/my-lessons" },
  { icon: CalendarIcon, label: "Reservations", path: "/reservations" },
  { icon: DumbbellIcon, label: "Exercise", path: "/dashboard/exercises" },
  { icon: MessageSquareIcon, label: "Messages", path: "/dashboard/messages" },
  { icon: SettingsIcon, label: "Settings", path: "/dashboard/settings" }
];

export default function DashboardLayout({
  children,
  title = "Welcome back!",
  actions
}: {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
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

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  
  // サインアウト処理
  const handleSignOut = async () => {
    try {
      console.log("サインアウト処理を開始します");
      
      // 明示的にローカルセッションをクリア
      const { error: localSignOutError } = await supabase.auth.signOut();
      if (localSignOutError) {
        console.error("ローカルセッションクリアエラー:", localSignOutError);
      } else {
        console.log("ローカルセッションクリア成功");
      }
      
      // Server Actionを使用したサインアウト
      const result = await signOut();
      console.log("サーバーサインアウト結果:", result);
      
      // 強制的にリダイレクト（結果に関わらず）
      console.log("ランディングページにリダイレクトします");
      router.replace('/');
    } catch (error) {
      console.error("Sign out failed:", error);
      // エラー時もリダイレクト
      router.replace('/');
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
    <div className="dashboard-layout">
      {/* ヘッダー */}
      <header className="dashboard-header">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="flex justify-between h-16">
            {/* Left section */}
            <div className="flex items-center gap-8">
              <Button 
                variant="ghost" 
                size="sm" 
                className="lg:hidden w-10 h-10 p-0"
                onClick={toggleSidebar}
              >
                <MenuIcon className="h-6 w-6" />
              </Button>
              <div className="flex items-center gap-2">
                <img className="h-8 w-8" src="/logomark.svg" alt="MUED" />
                <span className="text-2xl font-bold hidden lg:block font-shantell">MUED</span>
              </div>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                className="relative w-10 h-10 p-0"
              >
                <BellIcon className="h-6 w-6" />
                <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full"></span>
              </Button>
              <Button 
                variant="ghost"
                size="sm"
                className="w-10 h-10 p-0"
              >
                <UserCircleIcon className="h-6 w-6" />
              </Button>
              <Button 
                variant="ghost" 
                className="hidden lg:flex items-center gap-2"
                onClick={handleSignOut}
              >
                <span className="text-sm">Sign out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="mobile-overlay"
            onClick={toggleSidebar}
          />
        )}

        {/* サイドバー */}
        <aside className={`
          mobile-sidebar
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isSidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}
        `}>
          {/* Collapse toggle button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute -right-4 top-8 hidden lg:flex h-8 w-8 p-0 rounded-full bg-white border shadow-md"
            onClick={toggleSidebarCollapse}
          >
            {isSidebarCollapsed ? (
              <ChevronRightIcon className="h-4 w-4" />
            ) : (
              <ChevronLeftIcon className="h-4 w-4" />
            )}
          </Button>

          {/* Close button for mobile */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute top-4 right-4 lg:hidden w-10 h-10 p-0"
            onClick={toggleSidebar}
          >
            <XIcon className="h-6 w-6" />
          </Button>

          <div className={`p-6 ${isSidebarCollapsed ? 'lg:p-4' : ''}`}>
            {/* User Profile */}
            <div className="mb-8 mt-16 lg:mt-4">
              <div className={`flex items-center gap-4 mb-4 ${isSidebarCollapsed ? 'lg:justify-center' : ''}`}>
                <UserCircleIcon className="h-12 w-12" />
                {!isSidebarCollapsed && (
                  <div className="hidden lg:block">
                    <h3 className="font-semibold">{user?.email}</h3>
                    <p className="text-sm text-gray-500">Free Plan</p>
                  </div>
                )}
              </div>
              {!isSidebarCollapsed && (
                <Button 
                  className="w-full hidden lg:flex" 
                  variant="outline"
                  onClick={() => router.push('/dashboard/plans')}
                >
                  Upgrade Plan
                </Button>
              )}
            </div>

            {/* Navigation */}
            <nav className="space-y-1">
              {dashboardNavItems.map((item, index) => (
                <Button
                  key={index}
                  variant={pathname === item.path ? "default" : "ghost"}
                  className={`w-full justify-start ${
                    pathname === item.path ? 'bg-black text-white' : ''
                  } ${isSidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                  onClick={() => {
                    router.push(item.path);
                    setIsSidebarOpen(false);
                  }}
                >
                  <item.icon className={`h-5 w-5 ${isSidebarCollapsed ? '' : 'mr-3'}`} />
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </Button>
              ))}
            </nav>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className={`${isSidebarCollapsed ? 'dashboard-main-collapsed' : 'dashboard-main-expanded'} w-full`}>
          <div className="max-w-[1440px] mx-auto p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
              {title && <h1 className="text-2xl font-bold font-shantell">{title}</h1>}
              {actions}
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 