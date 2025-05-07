"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BellIcon, 
  UserCircleIcon, 
  HomeIcon, 
  BookOpenIcon, 
  MessageSquareIcon, 
  SettingsIcon, 
  MenuIcon, 
  FolderIcon, 
  XIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  DumbbellIcon
} from "lucide-react";
import { useAuth } from "../../lib/auth";

// ナビゲーション項目
const dashboardNavItems = [
  { icon: HomeIcon, label: "ダッシュボード", path: "/dashboard" },
  { icon: FolderIcon, label: "教材", path: "/dashboard/materials" },
  { icon: BookOpenIcon, label: "レッスン", path: "/dashboard/lessons" },
  { icon: DumbbellIcon, label: "エクササイズ", path: "/dashboard/exercise" },
  { icon: MessageSquareIcon, label: "メッセージ", path: "/dashboard/messages" },
  { icon: SettingsIcon, label: "設定", path: "/dashboard/settings" }
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("サインアウトに失敗:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 fixed w-full z-20">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="flex justify-between h-16">
            {/* 左側セクション */}
            <div className="flex items-center gap-8">
              <button 
                className="lg:hidden text-gray-500 hover:text-gray-700 focus:outline-none" 
                onClick={toggleSidebar}
              >
                <MenuIcon className="h-6 w-6" />
              </button>
              <div className="flex items-center gap-2">
                <img className="h-8 w-8" src="/logomark.svg" alt="MUED" />
                <span className="text-2xl font-bold hidden lg:block">MUED</span>
              </div>
            </div>

            {/* 右側セクション */}
            <div className="flex items-center gap-4">
              <button className="relative text-gray-500 hover:text-gray-700 focus:outline-none">
                <BellIcon className="h-6 w-6" />
                <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="text-gray-500 hover:text-gray-700 focus:outline-none">
                <UserCircleIcon className="h-6 w-6" />
              </button>
              <button 
                className="hidden lg:flex items-center gap-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                onClick={handleSignOut}
              >
                <span className="text-sm">サインアウト</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* モバイルサイドバーオーバーレイ */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* サイドバー */}
      <aside className={`
        fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-40
        transition-all duration-300 ease-in-out
        lg:z-10
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
      `}>
        {/* 折りたたみトグルボタン */}
        <button
          className="absolute -right-4 top-24 hidden lg:flex h-8 w-8 rounded-full bg-white border shadow-md items-center justify-center text-gray-500 hover:text-gray-700 focus:outline-none"
          onClick={toggleSidebarCollapse}
        >
          {isSidebarCollapsed ? (
            <ChevronRightIcon className="h-4 w-4" />
          ) : (
            <ChevronLeftIcon className="h-4 w-4" />
          )}
        </button>

        {/* モバイル用閉じるボタン */}
        <button 
          className="absolute top-4 right-4 lg:hidden text-gray-500 hover:text-gray-700 focus:outline-none"
          onClick={toggleSidebar}
        >
          <XIcon className="h-6 w-6" />
        </button>

        <div className={`p-6 ${isSidebarCollapsed ? 'lg:p-4' : ''}`}>
          {/* ユーザープロフィール */}
          <div className="mb-8 mt-16 lg:mt-16">
            <div className={`flex items-center gap-4 mb-4 ${isSidebarCollapsed ? 'lg:justify-center' : ''}`}>
              <UserCircleIcon className="h-12 w-12" />
              {!isSidebarCollapsed && (
                <div className="hidden lg:block">
                  <h3 className="font-semibold">{user?.email}</h3>
                  <p className="text-sm text-gray-500">無料プラン</p>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <Link 
                className="w-full hidden lg:flex items-center justify-center py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
                href="/dashboard/plans"
              >
                プランをアップグレード
              </Link>
            )}
          </div>

          {/* ナビゲーション */}
          <nav className="space-y-1">
            {dashboardNavItems.map((item, index) => (
              <Link
                key={index}
                href={item.path}
                className={`flex items-center py-2 px-4 rounded-md transition-colors duration-200 
                  ${pathname === item.path 
                    ? 'bg-black text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                  } 
                  ${isSidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                onClick={() => {
                  if (isSidebarOpen) toggleSidebar();
                }}
              >
                <item.icon className={`h-5 w-5 ${isSidebarCollapsed ? '' : 'mr-3'}`} />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className={`pt-16 transition-all duration-300 ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <div className="max-w-[1440px] mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
} 