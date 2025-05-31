'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { FileIcon, ExternalLink, Calendar, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

interface NoteMaterial {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  image?: string;
  contentSnippet?: string;
  author?: string;
}

interface ApiResponse {
  success: boolean;
  items: NoteMaterial[];
  error?: string;
  fallback?: boolean;
  lastUpdated: string;
}

export default function MaterialsPage() {
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<NoteMaterial[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const router = useRouter();

  // 認証チェック
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!data.session) {
        router.push('/login');
        return;
      }
      await fetchNoteMaterials();
    };

    checkAuth();
  }, [router]);

  // note記事の取得
  const fetchNoteMaterials = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/note-rss');
      
      if (!response.ok) {
        throw new Error('RSSフィードの取得に失敗しました');
      }
      
      const data: ApiResponse = await response.json();
      setMaterials(data.items);
      setIsFallback(data.fallback || false);
      
      if (data.fallback) {
        setError('最新の記事を取得できませんでした（サンプルデータを表示中）');
      } else {
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      setIsFallback(false);
      console.error('RSS取得エラー:', err);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-sm">教材を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto">
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchNoteMaterials} variant="outline">
            再読み込み
          </Button>
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
            note記事から最新の教材をお届けします
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={fetchNoteMaterials}
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
              最新の記事を取得できませんでした。サンプルデータを表示しています。
            </span>
          </div>
        </div>
      )}

      {/* 統計情報 */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <FileIcon className="w-4 h-4" />
            <span>{materials.length}件の記事</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>MUED Glasswerks</span>
          </div>
        </div>
      </div>

      {/* 教材グリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.map((material, index) => (
          <div key={index} className="bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow">
            {/* 画像部分 */}
            <div className="aspect-video w-full overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
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
        ))}
      </div>

      {/* 記事がない場合 */}
      {materials.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">教材記事がありません</p>
        </div>
      )}
    </div>
  );
}