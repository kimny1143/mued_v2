"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
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
  CalendarIcon,
  LogOutIcon
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { signOut } from "@/app/actions/auth";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  subMenu?: Array<{ label: string; path: string }>;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole: string;
  userName: string;
  title?: string;
  fullWidth?: boolean;
  actions?: React.ReactNode;
}

export default function DashboardLayout({ children, userRole, userName, title, fullWidth, actions }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  // ロールに基づいたナビゲーション項目を定義
  const getNavigationItems = (): NavItem[] => {
    const commonItems: NavItem[] = [
      { 
        icon: HomeIcon, 
        label: "ダッシュボード", 
        path: "/dashboard" 
      },
      { 
        icon: MessageSquareIcon, 
        label: "メッセージ", 
        path: "/dashboard/messages" 
      },
      { 
        icon: SettingsIcon, 
        label: "設定", 
        path: "/dashboard/settings" 
      }
    ];

    if (userRole === 'admin') {
      return [
        ...commonItems.slice(0, 1),
        { 
          icon: BookOpenIcon, 
          label: "マイレッスン", 
          path: "/dashboard/my-lessons" 
        },
        { 
          icon: DumbbellIcon, 
          label: "エクササイズ", 
          path: "/dashboard/exercises" 
        },
        { 
          icon: UserCircleIcon, 
          label: "ユーザー管理", 
          path: "/dashboard/users" 
        },
        { 
          icon: FolderIcon, 
          label: "コンテンツ管理", 
          path: "/dashboard/content" 
        },
        ...commonItems.slice(1)
      ];
    } else if (userRole === 'mentor') {
      return [
        ...commonItems.slice(0, 1),
        { 
          icon: CalendarIcon, 
          label: "レッスン管理", 
          path: "/dashboard/slots-calendar",
          subMenu: [
            { label: "スロットカレンダー", path: "/dashboard/slots-calendar" },
            { label: "承認待ち", path: "/dashboard/mentor-approvals" }
          ]
        },
        { 
          icon: BookOpenIcon, 
          label: "マイレッスン", 
          path: "/dashboard/my-lessons" 
        },
        { 
          icon: DumbbellIcon, 
          label: "エクササイズ", 
          path: "/dashboard/exercises" 
        },
        { 
          icon: FolderIcon, 
          label: "教材管理", 
          path: "/dashboard/materials" 
        },
        ...commonItems.slice(1)
      ];
    } else {
      // Student
      return [
        ...commonItems.slice(0, 1),
        { 
          icon: CalendarIcon, 
          label: "レッスン予約", 
          path: "/dashboard/booking-calendar" 
        },
        { 
          icon: BookOpenIcon, 
          label: "マイレッスン", 
          path: "/dashboard/my-lessons" 
        },
        { 
          icon: DumbbellIcon, 
          label: "エクササイズ", 
          path: "/dashboard/exercises" 
        },
        ...commonItems.slice(1)
      ];
    }
  };

  const navigationItems = getNavigationItems();

  const toggleSubmenu = (label: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const isMenuActive = (path: string, subMenu?: Array<{ label: string; path: string }>) => {
    if (pathname === path) return true;
    if (subMenu) {
      return subMenu.some(item => pathname === item.path);
    }
    return false;
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* モバイルメニューボタン */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-white shadow-md h-10 w-10 p-0"
        >
          {isMobileMenuOpen ? <XIcon /> : <MenuIcon />}
        </Button>
      </div>

      {/* サイドバー */}
      <aside className={`
        fixed left-0 top-0 z-40 h-full bg-white shadow-lg transition-all duration-300
        ${isSidebarOpen ? 'w-64' : 'w-20'}
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* サイドバーヘッダー */}
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className={`font-bold text-xl ${!isSidebarOpen && 'hidden'}`}>
            MUED LMS
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden lg:flex h-8 w-8 p-0"
          >
            {isSidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </Button>
        </div>

        {/* ユーザー情報 */}
        <div className={`px-4 py-4 border-b ${!isSidebarOpen && 'px-2'}`}>
          <div className="flex items-center space-x-3">
            <UserCircleIcon className="h-10 w-10 text-gray-400" />
            {isSidebarOpen && (
              <div>
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-gray-500 capitalize">{userRole}</p>
              </div>
            )}
          </div>
        </div>

        {/* ナビゲーション */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigationItems.map((item) => (
            <div key={item.path}>
              <Link
                href={item.path}
                onClick={(e) => {
                  if (item.subMenu) {
                    e.preventDefault();
                    toggleSubmenu(item.label);
                  }
                }}
                className={`
                  flex items-center px-4 py-2 text-sm font-medium rounded-md
                  ${isMenuActive(item.path, item.subMenu) 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  ${!isSidebarOpen && 'justify-center'}
                `}
              >
                <item.icon className={`h-5 w-5 ${isSidebarOpen && 'mr-3'}`} />
                {isSidebarOpen && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.subMenu && (
                      <ChevronRightIcon className={`h-4 w-4 transition-transform ${
                        expandedMenus[item.label] ? 'rotate-90' : ''
                      }`} />
                    )}
                  </>
                )}
              </Link>
              
              {/* サブメニュー */}
              {item.subMenu && expandedMenus[item.label] && isSidebarOpen && (
                <div className="ml-11 mt-1 space-y-1">
                  {item.subMenu.map((subItem) => (
                    <Link
                      key={subItem.path}
                      href={subItem.path}
                      className={`
                        block px-4 py-2 text-sm rounded-md
                        ${pathname === subItem.path
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                      `}
                    >
                      {subItem.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* ログアウトボタン */}
        <div className="p-4 border-t">
          <form action={handleSignOut}>
            <Button
              type="submit"
              variant="ghost"
              className={`w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 ${
                !isSidebarOpen && 'justify-center'
              }`}
            >
              <LogOutIcon className={`h-5 w-5 ${isSidebarOpen && 'mr-3'}`} />
              {isSidebarOpen && 'ログアウト'}
            </Button>
          </form>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <div className={`
        transition-all duration-300
        ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}
      `}>
        <main className={fullWidth ? "" : "p-6"}>
          {title && (
            <div className={`${fullWidth ? "px-6 pt-6" : ""} mb-6`}>
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{title}</h1>
                {actions && <div>{actions}</div>}
              </div>
            </div>
          )}
          <div className={fullWidth ? "" : ""}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}