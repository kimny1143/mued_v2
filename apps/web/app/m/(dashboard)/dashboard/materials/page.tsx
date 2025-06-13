'use client';

export const dynamic = 'force-dynamic';

import { FileIcon, ExternalLink, Calendar, User, BookOpen, Music, Mic, Edit, ArrowUpDown, Clock, ArrowLeft, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

import { Button } from "@/app/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { sortItems, type SortMethod } from "@/lib/utils/natural-sort";

interface NoteMaterial {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  image?: string;
  contentSnippet?: string;
  author?: string;
  magazine: string;
  category: string;
  readingTime?: number;
}

interface MagazineData {
  success: boolean;
  magazine: {
    id: string;
    title: string;
    description: string;
    category: string;
  };
  items: NoteMaterial[];
  count: number;
  error?: string;
}

interface ApiResponse {
  success: boolean;
  magazines: MagazineData[];
  totalItems: number;
  successCount: number;
  totalMagazines: number;
  error?: string;
  fallback?: boolean;
  lastUpdated: string;
}

export default function MobileMaterialsPage() {
  const [loading, setLoading] = useState(true);
  const [magazines, setMagazines] = useState<MagazineData[]>([]);
  const [selectedMagazine, setSelectedMagazine] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [sortMethod, setSortMethod] = useState<SortMethod>(() => {
    // ローカルストレージから設定を読み込む
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('materials-sort-method') as SortMethod) || 'date-desc';
    }
    return 'date-desc';
  });
  const router = useRouter();

  // マガジンアイコンマッピング
  const magazineIcons = {
    recording: Mic,
    composition: Music,
    songwriting: Edit,
    general: BookOpen
  };

  // マガジン色マッピング
  const magazineColors = {
    recording: 'bg-red-100 text-red-800',
    composition: 'bg-blue-100 text-blue-800',
    songwriting: 'bg-green-100 text-green-800',
    general: 'bg-purple-100 text-purple-800'
  };

  // 認証チェック
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!data.session) {
        router.push('/m/login');
        return;
      }
      await fetchMagazines();
    };

    checkAuth();
  }, [router]);

  // ソート設定をローカルストレージに保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('materials-sort-method', sortMethod);
    }
  }, [sortMethod]);

  // 全マガジン取得
  const fetchMagazines = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/note-rss');
      
      if (!response.ok) {
        throw new Error('マガジンの取得に失敗しました');
      }
      
      const data: ApiResponse = await response.json();
      setMagazines(data.magazines);
      setIsFallback(data.fallback || false);
      
      if (data.fallback) {
        setError('最新のマガジンを取得できませんでした（サンプルデータを表示中）');
      } else {
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      setIsFallback(false);
      console.error('マガジン取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // 説明文を適切な長さに切り詰め
  const truncateDescription = (description: string, maxLength: number = 80) => {
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
  };

  // 表示用のマガジンとアイテムを取得
  const getDisplayData = () => {
    if (selectedMagazine === 'all') {
      const allItems = magazines.reduce<NoteMaterial[]>((acc, mag) => [...acc, ...mag.items], []);
      return {
        magazine: {
          id: 'all',
          title: '全マガジン',
          description: 'すべてのMUED公開教材',
          category: 'general'
        },
        items: sortItems(allItems, sortMethod),
        count: allItems.length
      };
    }
    
    const magazineData = magazines.find(mag => mag.magazine.id === selectedMagazine);
    if (!magazineData) {
      return { magazine: { id: '', title: '', description: '', category: 'general' }, items: [], count: 0 };
    }
    
    return {
      ...magazineData,
      items: sortItems(magazineData.items, sortMethod)
    };
  };

  const displayData = getDisplayData();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              className="p-2"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">教材ライブラリ</h1>
            <div className="w-8"></div>
          </div>
        </header>
        <main className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-sm">教材マガジンを読み込み中...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            className="p-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">教材ライブラリ</h1>
          <Button 
            variant="ghost"
            size="sm"
            className="p-2"
            onClick={fetchMagazines}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 space-y-4">
        {/* フォールバック状態の警告 */}
        {isFallback && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-800 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">
                最新のマガジンを取得できませんでした。サンプルデータを表示しています。
              </span>
            </div>
          </div>
        )}

        {/* フィルターセクション */}
        <div className="space-y-3">
          {/* マガジン選択 */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedMagazine === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedMagazine('all')}
              className="flex items-center gap-2 whitespace-nowrap text-xs px-3 py-2 h-8"
              size="sm"
            >
              <BookOpen className="w-3 h-3" />
              すべて ({magazines.reduce((sum, mag) => sum + mag.count, 0)})
            </Button>
            {magazines.map((mag) => {
              const Icon = magazineIcons[mag.magazine.category as keyof typeof magazineIcons] || BookOpen;
              return (
                <Button
                  key={mag.magazine.id}
                  variant={selectedMagazine === mag.magazine.id ? 'default' : 'outline'}
                  onClick={() => setSelectedMagazine(mag.magazine.id)}
                  className="flex items-center gap-2 whitespace-nowrap text-xs px-3 py-2 h-8"
                  size="sm"
                >
                  <Icon className="w-3 h-3" />
                  {mag.magazine.title.replace('MUED公開教材〜', '').replace('〜', '')} ({mag.count})
                </Button>
              );
            })}
          </div>

          {/* ソート選択 */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-gray-600" />
            <Select value={sortMethod} onValueChange={(value) => setSortMethod(value as SortMethod)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="並び順を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">新しい順</SelectItem>
                <SelectItem value="date-asc">古い順</SelectItem>
                <SelectItem value="title-asc">タイトル順（昇順）</SelectItem>
                <SelectItem value="title-desc">タイトル順（降順）</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 現在のマガジン情報 */}
          <div className={`rounded-lg p-3 text-xs ${magazineColors[displayData.magazine.category as keyof typeof magazineColors] || magazineColors.general}`}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <FileIcon className="w-3 h-3" />
                <span>{displayData.count}件</span>
              </div>
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>MUED Glasswerks</span>
              </div>
            </div>
          </div>
        </div>

        {/* 教材リスト */}
        <div className="space-y-3">
          {displayData.items.map((material, index) => {
            const categoryColor = magazineColors[material.category as keyof typeof magazineColors] || magazineColors.general;
            
            return (
              <div key={index} className="bg-white rounded-lg shadow-sm active:scale-95 transition-transform">
                {/* 画像部分 */}
                <div className="aspect-video w-full overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 relative rounded-t-lg">
                  {material.image ? (
                    <img 
                      src={material.image} 
                      alt={material.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  
                  {/* カテゴリバッジ */}
                  {selectedMagazine === 'all' && (
                    <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${categoryColor}`}>
                      {material.magazine}
                    </div>
                  )}
                </div>

                {/* コンテンツ部分 */}
                <div className="p-3">
                  <h3 className="font-semibold mb-2 text-sm leading-tight line-clamp-2">
                    {material.title}
                  </h3>
                  
                  {material.description && (
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                      {truncateDescription(material.description)}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(material.pubDate)}</span>
                      {material.readingTime && (
                        <>
                          <Clock className="w-3 h-3 ml-1" />
                          <span>{material.readingTime}分</span>
                        </>
                      )}
                    </div>
                    
                    <Button 
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(material.link, '_blank')}
                      className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 h-6"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      読む
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 記事がない場合 */}
        {displayData.items.length === 0 && !loading && (
          <div className="text-center py-12">
            <FileIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">このマガジンには教材記事がありません</p>
          </div>
        )}

        {/* noteページへのリンク */}
        <div className="pt-4">
          <Button 
            className="w-full bg-black text-white"
            onClick={() => window.open('https://note.com/mued_glasswerks', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            noteページで全記事を見る
          </Button>
        </div>
      </main>
    </div>
  );
}