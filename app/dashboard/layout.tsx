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
  CalendarIcon,
  LogOutIcon,
  CreditCard
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/app/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
//import { cn } from "@/lib/utils";
import Link from "next/link";
import { isDebugMode, isVerboseDebugMode, debugLog, verboseDebugLog } from "@/lib/debug";
import { PlanTag } from "@/app/components/PlanTag";
import { vercelSafeSignOut, safeRedirectToHome } from "@/lib/vercel-auth-fix";
import { handlePostLoginPlanRedirect } from "@/lib/billing-utils";
import { extractRoleFromApiResponse, getRoleDisplayName, updateRoleCache } from "@/lib/role-utils";

// TypeScript型定義
interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  subMenu?: Array<{ label: string; path: string }>;
}

// 拡張ユーザータイプの定義
interface ExtendedUser extends SupabaseUser {
  db_user?: {
    roleId?: string;
    roleName?: string;
    name?: string;
    email?: string;
    image?: string;
  };
}

// 共通ナビゲーション項目（全ユーザー）
const dashboardNavItems: NavItem[] = [
  { icon: HomeIcon, label: "Dashboard", path: "/dashboard" },
  { icon: FolderIcon, label: "Materials", path: "/dashboard/materials" },
  { icon: BookOpenIcon, label: "My Lessons", path: "/dashboard/my-lessons" },
  { icon: DumbbellIcon, label: "Exercises", path: "/dashboard/exercises" },
  { icon: MessageSquareIcon, label: "Messages", path: "/dashboard/messages" },
  { icon: CalendarIcon, label: "Reservations", path: "/dashboard/reservations" }
];

// 生徒専用ナビゲーション項目
const studentNavItems: NavItem[] = [
  { icon: CalendarIcon, label: "Booking", path: "/dashboard/booking-calendar" }
];

// メンター専用ナビゲーション項目
const mentorNavItems: NavItem[] = [
  { icon: CalendarIcon, label: "Slots Calendar", path: "/dashboard/slots-calendar" }
];

// 共通メニュー（最下部に表示）
const commonNavItems: NavItem[] = [
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
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});
  const [userRole, setUserRole] = useState<string>('');
  
  // ユーザーロールに応じたメニュー項目を計算（メモ化）
  const visibleMenuItems = React.useMemo(() => {
    const menus = [];
    
    // 共通メニュー（全ユーザー）
    menus.push({
      items: dashboardNavItems,
      label: null // セクションタイトルなし
    });
    
    // ロール別メニュー
    if (userRole === 'student') {
      // 生徒: 生徒専用メニューを追加
      menus.push({
        items: studentNavItems,
        label: '予約管理'
      });
    } else if (userRole === 'mentor') {
      // メンター: メンター専用メニューを追加
      menus.push({
        items: mentorNavItems,
        label: 'メンターメニュー'
      });
    } else if (userRole === 'admin') {
      // 管理者: すべてのメニューを表示
      menus.push({
        items: studentNavItems,
        label: '生徒メニュー'
      });
      menus.push({
        items: mentorNavItems,
        label: 'メンターメニュー'
      });
    }
    
    return menus;
  }, [userRole]);

  // 全メニュー項目を統合（アクティブメニュー判定用）
  const allMenuItems = React.useMemo(() => {
    return [
      ...dashboardNavItems,
      ...studentNavItems,
      ...mentorNavItems,
      ...commonNavItems
    ];
  }, []);

  // メモ化された値を使用して現在アクティブなメニューを判断（将来使用予定）
  const _activeMenuItem = React.useMemo(() => {
    return allMenuItems.find(item => 
      pathname === item.path || (item.subMenu?.some(sub => pathname === sub.path))
    );
  }, [pathname, allMenuItems]);
  
  // 初期レンダリング後にアクティブなメニューを展開
  useEffect(() => {
    // パスが変わった時に、そのパスを含むメニュー項目があれば展開
    const menuToExpand = allMenuItems.find(item => 
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
  }, [pathname, allMenuItems]);
  
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
        debugLog("認証情報取得開始...");
        const { data } = await supabaseBrowser.auth.getSession();
        
        // コンポーネントがアンマウントされていたら何もしない
        if (!isMounted) return;
        
        if (data.session?.user) {
          // ユーザーID検証用の明示的なログ
          debugLog("==================================================");
          debugLog("現在のログインユーザーID:", data.session.user.id);
          debugLog("このIDをSupabaseの「usersテーブル」のIDと比較してください");
          debugLog("==================================================");
          
          debugLog("認証済みユーザー検出:", data.session.user.email);
          debugLog("ユーザーID:", data.session.user.id);
          
          // プラン選択後のログインをチェック
          const redirected = handlePostLoginPlanRedirect();
          if (redirected) {
            debugLog("プラン選択後のBillingポータルリダイレクトを実行しました");
          }
          
          // ロールキャッシュを更新（バックグラウンドで実行）
          updateRoleCache().catch(err => 
            console.warn('ロールキャッシュ更新に失敗:', err)
          );
          
          // 認証情報からユーザーデータを設定
          const authUser = data.session.user;
          setUser(authUser);
          
          // まずはメタデータから仮のロール値を設定
          const userMeta = authUser.user_metadata || {};
          debugLog("ユーザーメタデータ:", userMeta);
          
          // 仮のロール設定（後でAPIから取得した正確な値で上書き）
          const tempRole = userMeta.role || 'student';
          setUserRole(tempRole);
          
          // 代わりに専用APIを使用してユーザー情報を取得
          try {
            // APIからユーザー情報を取得（サーバサイドでadmin権限で実行）
            debugLog("APIからユーザー情報を取得中...");
            const response = await fetch(`/api/user?userId=${authUser.id}`, {
              // キャッシュバスティング（開発時のキャッシュ問題回避）
              cache: process.env.NODE_ENV === 'development' ? 'no-cache' : 'default',
              headers: {
                'pragma': 'no-cache',
                'cache-control': 'no-cache'
              }
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`APIエラー: ${response.status}`, errorText);
              throw new Error(`APIエラー: ${response.status}`);
            }
            
            const userData = await response.json();
            debugLog("API成功 - ユーザーデータ:", userData);
            verboseDebugLog("API応答の生データ:", JSON.stringify(userData));
            verboseDebugLog("API応答からのroleId:", userData.roleId);
            verboseDebugLog("roleIdのタイプ:", typeof userData.roleId);
            debugLog("API応答からのroleName:", userData.roleName);
            debugLog("DBアクセス成功状態:", userData.dbAccessSuccessful);
            
            // 新しいロールユーティリティを使用
            const finalRole = extractRoleFromApiResponse(userData);
            debugLog(`🎯 ロールユーティリティから取得: ${finalRole}`);
            
            // 最終的にロールを設定
            setUserRole(finalRole);
            
            // ユーザー情報を拡張（DBの情報を追加）
            setUser({
              ...authUser,
              db_user: userData
            });
          } catch (err) {
            console.error("ユーザー情報API呼び出しエラー:", err);
            debugLog("メタデータのロールを使用:", tempRole);
            
            // エラー発生時もUser情報はセット（メタデータのみ）
            setUser(authUser);
          }
        } else {
          debugLog("認証されていないユーザー - ログインページへリダイレクト");
          setUser(null);
          router.push('/login');
        }
        
        setLoading(false);
      } catch (err) {
        console.error("セッション取得エラー:", err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    getUser();
    
    // 認証状態の変更を監視
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
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
      debugLog("サインアウト処理を開始します");
      
      // 状態をクリア
      setUser(null);
      setUserRole('');
      
      // Vercel対応のサインアウト処理を実行
      const result = await vercelSafeSignOut();
      debugLog("Vercelサインアウト結果:", result);
      
      // サーバーアクションでサーバー側もクリア
      try {
        const serverResult = await signOut();
        debugLog("サーバーサインアウト結果:", serverResult);
      } catch (serverError) {
        console.error("サーバーサインアウトエラー:", serverError);
        // サーバーエラーでも続行
      }
      
      // ホームページにリダイレクト
      debugLog("ホームページにリダイレクトします");
      safeRedirectToHome();
      
    } catch (error) {
      console.error("サインアウト処理エラー:", error);
      
      // エラー時も状態をクリアしてリダイレクト
      setUser(null);
      setUserRole('');
      safeRedirectToHome();
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
              
              {/* ユーザーメニュー */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="w-10 h-10 p-0"
                  >
                    {user?.user_metadata?.avatar_url ? (
                      <img 
                        src={user.user_metadata.avatar_url} 
                        alt="User avatar" 
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <UserCircleIcon className="h-6 w-6" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-64 p-0"
                  align="end"
                >
                  {/* ユーザー情報セクション */}
                  <div className="px-4 py-3 border-b">
                    <div className="flex items-center gap-3 mb-3">
                      {user?.user_metadata?.avatar_url ? (
                        <img 
                          src={user.user_metadata.avatar_url} 
                          alt="User avatar" 
                          className="w-12 h-12 rounded-full bg-gray-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserCircleIcon className="h-10 w-10 text-gray-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {user?.db_user?.name || user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email || 'ユーザー'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {getRoleDisplayName(userRole)}
                        </p>
                      </div>
                    </div>
                    
                    {/* プランタグ */}
                    <div className="flex justify-center">
                      <PlanTag />
                    </div>
                    {userRole === 'student' && (
                      <p className="text-xxs text-gray-400 text-center mt-1">
                        クリックでプラン管理
                      </p>
                    )}
                    
                    {/* デバッグ情報 - デバッグモードでのみ表示 */}
                    {isDebugMode() && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xxs text-gray-400 truncate">
                          ID: {user?.id?.substring(0, 8)}...
                        </p>
                        <p className="text-xxs text-gray-400 truncate">
                          <span className="font-bold">Role:</span> {userRole || 'unknown'} (<span className="text-red-500">{user?.db_user?.roleName || user?.db_user?.roleId || 'no-role'}</span>)
                        </p>
                        {isVerboseDebugMode() && (
                          <details className="text-xxs text-gray-400 text-left mt-1">
                            <summary className="cursor-pointer">開発者情報</summary>
                            <div className="text-left p-1 bg-gray-50 rounded text-[9px] mt-1">
                              <p>Auth Type: {user?.app_metadata?.provider || 'unknown'}</p>
                              <p>Email: {user?.email}</p>
                              <p>Full ID: {user?.id}</p>
                              <p>DB Info: {user?.db_user ? 'あり' : 'なし'}</p>
                              <p className="text-red-500">DB RoleId: {user?.db_user?.roleId}</p>
                              <p className="text-green-500">DB RoleName: {user?.db_user?.roleName}</p>
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="py-1">
                    <Link 
                      href="/dashboard/settings"
                      className="flex items-center px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
                    >
                      <SettingsIcon className="h-4 w-4 mr-2" />
                      設定
                    </Link>

                    <button 
                      onClick={handleSignOut}
                      className="w-full flex items-center px-3 py-2 text-sm hover:bg-gray-100 transition-colors text-left"
                    >
                      <LogOutIcon className="h-4 w-4 mr-2" />
                      サインアウト
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
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
            fixed inset-y-0 left-0 z-40 bg-white border-r pt-16 transition-all duration-300 ease-in-out flex flex-col
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
            lg:translate-x-0 
            ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
          `}
        >
          <div className="flex items-center justify-end lg:px-4 py-2 border-b flex-shrink-0">
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
          <div className="flex-1 overflow-y-auto">
            <nav className="px-4 py-4">
              <ul className="space-y-2">
                {/* ロール別メニューを動的に表示 */}
                {visibleMenuItems.map((menuSection, sectionIndex) => (
                  <React.Fragment key={sectionIndex}>
                    {/* セクションタイトル（最初のセクション以外で表示） */}
                    {menuSection.label && (
                      <li className="pt-2">
                        <div className={`px-3 py-1 text-xs font-medium text-gray-400 ${isSidebarCollapsed ? 'text-center' : 'text-left'}`}>
                          {!isSidebarCollapsed && menuSection.label}
                        </div>
                      </li>
                    )}
                    
                    {/* メニュー項目 */}
                    {menuSection.items.map(({ icon: Icon, label, path, subMenu }) => {
                      const isActive = isMenuActive(path, subMenu);
                      const hasSubmenu = subMenu && subMenu.length > 0;
                      
                      return (
                        <li key={label}>
                          {hasSubmenu ? (
                            <>
                              <Button
                                variant={isActive ? "secondary" : "ghost"}
                                className={`w-full h-10 ${isSidebarCollapsed ? 'px-2 justify-center' : 'px-4 flex justify-between'}`}
                                onClick={() => toggleSubmenu(label)}
                              >
                                <div className="flex items-center">
                                  <Icon className="h-5 w-5 flex-shrink-0" />
                                  {!isSidebarCollapsed && <span className="text-sm ml-2">{label}</span>}
                                </div>
                                {!isSidebarCollapsed && (
                                  <span className="flex-shrink-0">
                                    {expandedMenus[label] ? 
                                    <ChevronLeftIcon className="h-4 w-4" /> : 
                                    <ChevronRightIcon className="h-4 w-4" />}
                                  </span>
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
                              className={`w-full h-10 ${isSidebarCollapsed ? 'px-2 justify-center' : 'px-4 flex justify-start'}`}
                              onClick={() => router.push(path)}
                            >
                              <div className="flex items-center">
                                <Icon className="h-5 w-5 flex-shrink-0" />
                                {!isSidebarCollapsed && <span className="text-sm ml-2">{label}</span>}
                              </div>
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </React.Fragment>
                ))}
                
                {/* 共通メニュー（Settingsなど）を最下部に表示 */}
                <li className="pt-4 border-t border-gray-200">
                  {commonNavItems.map(({ icon: Icon, label, path, subMenu }) => {
                    const isActive = isMenuActive(path, subMenu);
                    return (
                      <Button
                        key={label}
                        variant={isActive ? "secondary" : "ghost"}
                        className={`w-full h-10 ${isSidebarCollapsed ? 'px-2 justify-center' : 'px-4 flex justify-start'}`}
                        onClick={() => router.push(path)}
                      >
                        <div className="flex items-center">
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          {!isSidebarCollapsed && <span className="text-sm ml-2">{label}</span>}
                        </div>
                      </Button>
                    );
                  })}
                </li>
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