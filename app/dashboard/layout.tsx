"use client";

import React, { useEffect, useState, useCallback } from "react";
//import Link from "next/link";
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
//import { cn } from "@/lib/utils";
import Link from "next/link";

// TypeScript型定義
interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  subMenu?: Array<{ label: string; path: string }>;
}

// ナビゲーション項目
const dashboardNavItems: NavItem[] = [
  { icon: HomeIcon, label: "Dashboard", path: "/dashboard" },
  { icon: FolderIcon, label: "Materials", path: "/dashboard/materials" },
  { icon: BookOpenIcon, label: "My Lessons", path: "/dashboard/my-lessons" },
  { icon: CalendarIcon, label: "Reservations", path: "/dashboard/reservations" },
  { icon: DumbbellIcon, label: "Exercises", path: "/dashboard/exercises" },
  { icon: MessageSquareIcon, label: "Messages", path: "/dashboard/messages" },
  { icon: SettingsIcon, label: "Settings", path: "/dashboard/settings" }
];

// メンター/管理者向けのナビゲーション項目
const mentorNavItems: NavItem[] = [
  { icon: CalendarIcon, label: "Lesson Slots", path: "/dashboard/lesson-slots" },
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
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});
  const [userRole, setUserRole] = useState<string>('');
  
  // メモ化された値を使用して現在アクティブなメニューを判断
  const activeMenuItem = React.useMemo(() => {
    return dashboardNavItems.find(item => 
      pathname === item.path || (item.subMenu?.some(sub => pathname === sub.path))
    );
  }, [pathname]);
  
  // 初期レンダリング後にアクティブなメニューを展開
  useEffect(() => {
    // パスが変わった時に、そのパスを含むメニュー項目があれば展開
    const menuToExpand = dashboardNavItems.find(item => 
      item.subMenu?.some(sub => pathname === sub.path)
    );
    
    if (menuToExpand) {
      setExpandedMenus(prev => {
        // すでに設定されていれば状態更新をスキップ
        if (prev[menuToExpand.label]) return prev;
        
        // メニュー展開状態の更新のみを行い、不要な再レンダリングを避ける
        return {
          ...prev,
          [menuToExpand.label]: true
        };
      });
    }
  }, [pathname]);
  
  // 展開されたメニューの切り替え
  const toggleSubmenu = (label: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };
  
  // メニュー項目が選択されているかチェック - メモ化してレンダリングを最適化
  const isMenuActive = useCallback((path: string, subMenu?: Array<{ label: string; path: string }>) => {
    if (pathname === path) return true;
    if (subMenu) {
      return subMenu.some(item => pathname === item.path);
    }
    return false;
  }, [pathname]);
  
  // ユーザー情報を取得
  useEffect(() => {
    // フラグを使って一度だけ実行するようにする
    let isMounted = true;
    
    const getUser = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        // コンポーネントがアンマウントされていたら何もしない
        if (!isMounted) return;
        
        setUser(data.session?.user || null);
        
        // ユーザーロールを取得
        if (data.session?.user) {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', data.session.user.id)
              .single();
              
            setUserRole(profileData?.role || 'student');
          } catch (error) {
            console.error("ロール取得エラー:", error);
            setUserRole('student'); // デフォルトは student
          }
        }
        
        setLoading(false);
        
        // セッションがない場合はログインページへリダイレクト
        if (!data.session) {
          router.push('/login');
        }
      } catch (err) {
        console.error("セッション取得エラー:", err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    getUser();
    
    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // コンポーネントがマウントされていれば状態更新
        if (isMounted) {
          setUser(session?.user || null);
        }
        // サインアウト時にリダイレクト
        if (event === 'SIGNED_OUT') {
          router.push('/login');
        }
      }
    );
    
    return () => {
      isMounted = false; // アンマウント時にフラグをfalseに
      subscription.unsubscribe();
    };
  }, [router]); // 依存配列を最小限に

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
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 bg-white border-r pt-16 transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
            lg:translate-x-0 
            ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
          `}
        >
          <div className="flex items-center justify-end lg:px-4 py-2 border-b">
            <Button 
              variant="ghost" 
              size="sm"
              className="lg:hidden w-10 h-10 p-0"
              onClick={toggleSidebar}
            >
              <XIcon className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:flex w-10 h-10 p-0"
              onClick={toggleSidebarCollapse}
            >
              {isSidebarCollapsed ? (
                <ChevronRightIcon className="h-6 w-6" />
              ) : (
                <ChevronLeftIcon className="h-6 w-6" />
              )}
            </Button>
          </div>
          <div className="h-full overflow-y-auto">
            <nav className="px-4 py-4">
              <ul className="space-y-1">
                {dashboardNavItems.map(({ icon: Icon, label, path, subMenu }) => {
                  const isActive = isMenuActive(path, subMenu);
                  const hasSubmenu = subMenu && subMenu.length > 0;
                  
                  return (
                    <li key={label}>
                      {hasSubmenu ? (
                        <>
                          <Button
                            variant={isActive ? "secondary" : "ghost"}
                            className={`justify-between w-full ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}
                            onClick={() => toggleSubmenu(label)}
                          >
                            <div className="flex items-center">
                              <Icon className={`h-5 w-5 ${isSidebarCollapsed ? 'mr-0' : 'mr-2'}`} />
                              {!isSidebarCollapsed && <span className="text-sm">{label}</span>}
                            </div>
                            {!isSidebarCollapsed && (
                              expandedMenus[label] ? 
                              <ChevronLeftIcon className="h-4 w-4" /> : 
                              <ChevronRightIcon className="h-4 w-4" />
                            )}
                          </Button>
                          {expandedMenus[label] && !isSidebarCollapsed && (
                            <ul className="pl-6 mt-1 space-y-1">
                              {subMenu.map(subItem => (
                                <li key={subItem.path}>
                                  <Button
                                    variant={pathname === subItem.path ? "secondary" : "ghost"}
                                    className="w-full px-4 py-2"
                                    onClick={() => router.push(subItem.path)}
                                  >
                                    <span className="text-sm">{subItem.label}</span>
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      ) : (
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={`w-full ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}
                          onClick={() => router.push(path)}
                        >
                          <div className="flex items-center">
                            <Icon className={`h-5 w-5 ${isSidebarCollapsed ? 'mr-0' : 'mr-2'}`} />
                            {!isSidebarCollapsed && <span className="text-sm">{label}</span>}
                          </div>
                        </Button>
                      )}
                    </li>
                  );
                })}
                
                {/* メンター/管理者向けメニューを表示（ユーザーロールで制御） */}
                {(userRole === 'mentor' || userRole === 'admin') && (
                  <>
                    <li className="pt-2">
                      <div className={`px-3 py-1 text-xs font-medium text-gray-400 ${isSidebarCollapsed ? 'text-center' : ''}`}>
                        {!isSidebarCollapsed && 'メンターメニュー'}
                      </div>
                    </li>
                    {mentorNavItems.map(({ icon: Icon, label, path, subMenu }) => {
                      const isActive = isMenuActive(path, subMenu);
                      return (
                        <li key={label}>
                          <Button
                            variant={isActive ? "secondary" : "ghost"}
                            className={`w-full ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}
                            onClick={() => router.push(path)}
                          >
                            <div className="flex items-center">
                              <Icon className={`h-5 w-5 ${isSidebarCollapsed ? 'mr-0' : 'mr-2'}`} />
                              {!isSidebarCollapsed && <span className="text-sm">{label}</span>}
                            </div>
                          </Button>
                        </li>
                      );
                    })}
                  </>
                )}
              </ul>
            </nav>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className={`dashboard-main ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
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