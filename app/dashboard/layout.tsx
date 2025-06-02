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
import { useReservationNotifications, useMentorApprovalNotifications, useStudentReservationNotifications } from '@/lib/hooks/useReservationNotifications';

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
  { icon: MessageSquareIcon, label: "Messages", path: "/dashboard/messages" }
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
  title = "",
  actions,
  fullWidth = false
}: {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  fullWidth?: boolean;
}) {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // ローカルストレージから初期値を取得
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true';
    }
    return false;
  });
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});
  const [userRole, setUserRole] = useState<string>('');
  
  // Phase 4: リアルタイム通知システムの統合
  // ユーザーロールに応じた通知フックを使用
  const { isEnabled: notificationsEnabled } = useReservationNotifications({
    enabled: !!user,
  });

  // メンター専用通知
  useMentorApprovalNotifications();
  
  // 生徒専用通知
  useStudentReservationNotifications();

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
    // 重複実行を防ぐフラグ
    let isMounted = true;
    let initializationAttempts = 0;
    const MAX_ATTEMPTS = 3;
    
    const getUser = async () => {
      // 初期化試行回数をチェック
      initializationAttempts++;
      if (initializationAttempts > MAX_ATTEMPTS) {
        console.warn('認証初期化の最大試行回数に達しました');
        return;
      }
      
      try {
        debugLog(`認証状態初期化開始 (${initializationAttempts}回目)`);
        debugLog("認証状態を確認中...");
        
        // セッションを強制的に更新（キャッシュ問題対策）
        const { data, error: sessionError } = await supabaseBrowser.auth.getSession();
        
        if (sessionError) {
          console.error('セッション取得エラー:', sessionError);
          throw sessionError;
        }
        
        // コンポーネントがアンマウントされていたら何もしない
        if (!isMounted) return;
        
        if (data.session?.user) {
          debugLog("認証状態変更: INITIAL_SESSION セッションあり");
          debugLog("ユーザー情報を設定:", data.session.user.email);
          
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
          
          // APIからユーザー情報を取得（より堅牢なエラーハンドリング）
          try {
            debugLog("APIからユーザー詳細を取得開始...");
            
            // 最新のセッションから確実にトークンを取得
            const { data: latestSession } = await supabaseBrowser.auth.getSession();
            const token = latestSession.session?.access_token;
            
            if (!token) {
              throw new Error('認証トークンが取得できません');
            }
            
            const response = await fetch(`/api/user?userId=${authUser.id}`, {
              // 強制的にキャッシュを無効化
              cache: 'no-store',
              headers: {
                'Authorization': `Bearer ${token}`,
                'pragma': 'no-cache',
                'cache-control': 'no-cache, no-store, must-revalidate',
                'expires': '0'
              }
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`APIエラー: ${response.status}`, errorText);
              throw new Error(`APIエラー: ${response.status} - ${errorText}`);
            }
            
            const userData = await response.json();
            debugLog("APIからユーザー詳細を取得成功:", userData);
            
            // 新しいロールユーティリティを使用
            const finalRole = extractRoleFromApiResponse(userData);
            debugLog(`🎯 最終ロール設定: ${finalRole}`);
            
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
          
          // 認証エラーの場合はログインページへリダイレクト
          if (err instanceof Error && err.message.includes('認証')) {
            router.push('/login');
          }
        }
      }
    };
    
    getUser();
    
    // 認証状態の変更を監視（重複防止）
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      (event, session) => {
        debugLog(`認証状態変更イベント: ${event}`);
        
        // コンポーネントがマウントされていれば状態更新
        if (isMounted) {
          if (event === 'SIGNED_IN' && session?.user) {
            setUser(session.user);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setUserRole('');
            router.push('/login');
          }
        }
      }
    );
    
    return () => {
      isMounted = false; // アンマウント時にフラグをfalseに
      subscription.unsubscribe();
    };
  }, [router]); // routerのみを依存配列に含める（最小限の再実行）

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleSidebarCollapse = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', newState.toString());
    }
  };
  
  // サインアウト処理
  const handleSignOut = async () => {
    try {
      debugLog("サインアウト処理を開始します");
      
      // 状態をクリア
      setUser(null);
      setUserRole('');
      
      // 1. Supabaseセッションを完全に無効化
      const { error: signOutError } = await supabaseBrowser.auth.signOut({ 
        scope: 'global' // 全デバイスからサインアウト
      });
      
      if (signOutError) {
        console.error('Supabaseサインアウトエラー:', signOutError);
      }
      
      // 2. ローカルストレージとセッションストレージを完全にクリア
      try {
        localStorage.clear();
        sessionStorage.clear();
        debugLog("ローカルストレージをクリアしました");
      } catch (storageError) {
        console.error('ストレージクリアエラー:', storageError);
      }
      
      // 3. Supabaseの内部キャッシュをクリア
      try {
        // Supabaseクライアントの内部状態をリセット
        await supabaseBrowser.auth.refreshSession();
      } catch (refreshError) {
        // エラーは無視（既にサインアウト済みの場合）
        debugLog('セッションリフレッシュエラー（予期された動作）:', refreshError);
      }
      
      // 4. Vercel対応のサインアウト処理を実行
      const result = await vercelSafeSignOut();
      debugLog("Vercelサインアウト結果:", result);
      
      // 5. サーバーアクションでサーバー側もクリア
      try {
        const serverResult = await signOut();
        debugLog("サーバーサインアウト結果:", serverResult);
      } catch (serverError) {
        console.error("サーバーサインアウトエラー:", serverError);
        // サーバーエラーでも続行
      }
      
      // 6. iPhoneのWebKitキャッシュ対策 - 強制リロード
      if (typeof window !== 'undefined') {
        // Service Workerのキャッシュもクリア（PWA対応）
        if ('serviceWorker' in navigator) {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
              await registration.unregister();
            }
          } catch (swError) {
            console.warn('Service Worker クリアエラー:', swError);
          }
        }
        
        // キャッシュを無効化してページをリロード
        const timestamp = new Date().getTime();
        const cleanUrl = `${window.location.origin}/login?_t=${timestamp}&clear_cache=1`;
        
        debugLog("強制キャッシュクリア付きでログインページにリダイレクト:", cleanUrl);
        window.location.replace(cleanUrl);
        return; // この後の処理は不要
      }
      
      // フォールバック: 通常のリダイレクト
      debugLog("ログインページにリダイレクトします");
      safeRedirectToHome();
      
    } catch (error) {
      console.error("サインアウト処理エラー:", error);
      
      // エラー時も状態をクリアしてリダイレクト
      setUser(null);
      setUserRole('');
      
      // 強制的にキャッシュをクリアしてリダイレクト
      if (typeof window !== 'undefined') {
        try {
          localStorage.clear();
          sessionStorage.clear();
          const timestamp = new Date().getTime();
          window.location.replace(`${window.location.origin}/login?_t=${timestamp}&error_recovery=1`);
        } catch (fallbackError) {
          console.error('フォールバックリダイレクトエラー:', fallbackError);
          safeRedirectToHome();
        }
      } else {
        safeRedirectToHome();
      }
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
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
          <div className="flex justify-between h-14 sm:h-16">
            {/* Left section */}
            <div className="flex items-center gap-4 sm:gap-8">
              <Button 
                variant="ghost" 
                size="sm" 
                className="lg:hidden w-8 h-8 sm:w-10 sm:h-10 p-0"
                onClick={toggleSidebar}
              >
                <MenuIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
              <div className="flex items-center gap-2">
                <img className="h-6 w-6 sm:h-8 sm:w-8" src="/logomark.svg" alt="MUED" />
                <span className="text-xl sm:text-2xl font-bold hidden lg:block font-shantell">MUED</span>
              </div>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                className="relative w-8 h-8 sm:w-10 sm:h-10 p-0"
              >
                <BellIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="absolute top-1 right-1 sm:top-2 sm:right-2 h-2 w-2 bg-red-500 rounded-full"></span>
              </Button>
              
              {/* ユーザーメニュー */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 sm:w-10 sm:h-10 p-0"
                  >
                    {user?.user_metadata?.avatar_url ? (
                      <img 
                        src={user.user_metadata.avatar_url} 
                        alt="User avatar" 
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full"
                      />
                    ) : (
                      <UserCircleIcon className="h-5 w-5 sm:h-6 sm:w-6" />
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

      <div className="relative">
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
            fixed inset-y-0 left-0 z-40 bg-white border-r pt-14 sm:pt-16 flex flex-col
            w-64 lg:transition-all lg:duration-300 lg:ease-in-out
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
        <div 
          className={`
            lg:transition-all lg:duration-300 lg:ease-in-out 
            ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}
            pt-14 sm:pt-16
          `}
        >
          <main className={`${fullWidth ? 'p-0' : 'p-4 sm:p-6 lg:p-8'} max-w-full overflow-x-hidden`}>
            {(title || actions) && (
              <div className={`${fullWidth ? 'px-4 sm:px-6 lg:px-8' : ''} mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
                {title && (
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold font-shantell text-gray-900">
                    {title}
                  </h1>
                )}
                {actions && (
                  <div className="flex-shrink-0 w-full sm:w-auto">
                    {actions}
                  </div>
                )}
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
} 