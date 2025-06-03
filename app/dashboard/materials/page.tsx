'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { FileIcon, ExternalLink, Calendar, User, BookOpen, Music, Mic, Edit, ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
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

export default function MaterialsPage() {
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
    recording: 'bg-red-50 border-red-200 text-red-800',
    composition: 'bg-blue-50 border-blue-200 text-blue-800',
    songwriting: 'bg-green-50 border-green-200 text-green-800',
    general: 'bg-purple-50 border-purple-200 text-purple-800'
  };

  // 認証チェック
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!data.session) {
        router.push('/login');
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

  // 特定マガジン取得
  const fetchSpecificMagazine = async (magazineId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/note-rss?magazine=${magazineId}`);
      
      if (!response.ok) {
        throw new Error('マガジンの取得に失敗しました');
      }
      
      const data: MagazineData = await response.json();
      
      // 既存のマガジンデータを更新
      setMagazines(prev => 
        prev.map(mag => 
          mag.magazine.id === magazineId ? data : mag
        )
      );
      
      setError(data.success ? null : data.error || 'マガジンの取得に失敗しました');
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      console.error('特定マガジン取得エラー:', err);
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
  const truncateDescription = (description: string, maxLength: number = 100) => {
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-sm">教材マガジンを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">教材ライブラリ</h1>
          <p className="text-gray-600 text-sm mt-1">
            noteマガジンから最新の教材をカテゴリ別にお届けします
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={selectedMagazine === 'all' ? fetchMagazines : () => fetchSpecificMagazine(selectedMagazine)}
            disabled={loading}
          >
            更新
          </Button>
          <Button 
            className="bg-black text-white"
            onClick={() => window.open('https://note.com/mued_glasswerks', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            noteページ
          </Button>
        </div>
      </div>

      {/* フォールバック状態の警告 */}
      {isFallback && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-yellow-800">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">
              最新のマガジンを取得できませんでした。サンプルデータを表示しています。
            </span>
          </div>
        </div>
      )}

      {/* マガジン選択タブとソート */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedMagazine === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedMagazine('all')}
            className="flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            すべて ({magazines.reduce((sum, mag) => sum + mag.count, 0)})
          </Button>
          {magazines.map((mag) => {
            const Icon = magazineIcons[mag.magazine.category as keyof typeof magazineIcons] || BookOpen;
            return (
              <Button
                key={mag.magazine.id}
                variant={selectedMagazine === mag.magazine.id ? 'default' : 'outline'}
                onClick={() => setSelectedMagazine(mag.magazine.id)}
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                {mag.magazine.title.replace('MUED公開教材〜', '').replace('〜', '')} ({mag.count})
              </Button>
            );
          })}
        </div>

        {/* ソート選択 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <ArrowUpDown className="w-4 h-4" />
            <span>並び順：</span>
          </div>
          <Select value={sortMethod} onValueChange={(value) => setSortMethod(value as SortMethod)}>
            <SelectTrigger className="w-[180px]">
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
      </div>

      {/* 選択中のマガジン情報 */}
      <div className={`rounded-lg p-4 mb-6 border ${magazineColors[displayData.magazine.category as keyof typeof magazineColors] || magazineColors.general}`}>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <FileIcon className="w-4 h-4" />
            <span>{displayData.count}件の記事</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>MUED Glasswerks</span>
          </div>
          {selectedMagazine !== 'all' && (
            <span className="text-xs">{displayData.magazine.description}</span>
          )}
        </div>
      </div>

      {/* 教材グリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayData.items.map((material, index) => {
          const categoryColor = magazineColors[material.category as keyof typeof magazineColors] || magazineColors.general;
          
          return (
            <div key={index} className="bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow">
              {/* 画像部分 */}
              <div className="aspect-video w-full overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 relative">
                {material.image ? (
                  <img 
                    src={material.image} 
                    alt={material.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                
                {/* カテゴリバッジ */}
                {selectedMagazine === 'all' && (
                  <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium border ${categoryColor}`}>
                    {material.magazine}
                  </div>
                )}
              </div>

              {/* コンテンツ部分 */}
              <div className="p-4">
                <h3 className="font-semibold mb-2 line-clamp-2 leading-tight">
                  {material.title}
                </h3>
                
                {material.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                    {truncateDescription(material.description)}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(material.pubDate)}</span>
                  </div>
                  
                  <Button 
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(material.link, '_blank')}
                    className="text-blue-600 hover:text-blue-800"
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
          <FileIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">このマガジンには教材記事がありません</p>
        </div>
      )}
    </div>
  );
}