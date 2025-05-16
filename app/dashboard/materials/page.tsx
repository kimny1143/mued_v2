'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { FileIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function MaterialsPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 認証チェック
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!data.session) {
        router.push('/login');
      }
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  // 教材データ
  const materials = [
    {
      title: "音楽理論の基礎",
      type: "PDF",
      size: "2.4 MB",
      lastUpdated: "2024-04-30",
      image: "https://images.pexels.com/photos/5561923/pexels-photo-5561923.jpeg"
    },
    {
      title: "ピアノ練習シート",
      type: "PDF",
      size: "1.8 MB",
      lastUpdated: "2024-04-29",
      image: "https://images.pexels.com/photos/4088801/pexels-photo-4088801.jpeg"
    },
    {
      title: "リズム練習課題",
      type: "PDF",
      size: "3.2 MB",
      lastUpdated: "2024-04-28",
      image: "https://images.pexels.com/photos/4088009/pexels-photo-4088009.jpeg"
    },
    {
      title: "歌唱トレーニング教材",
      type: "PDF",
      size: "5.1 MB",
      lastUpdated: "2024-04-27",
      image: "https://images.pexels.com/photos/7087668/pexels-photo-7087668.jpeg"
    },
    {
      title: "作曲入門ガイド",
      type: "PDF",
      size: "4.3 MB",
      lastUpdated: "2024-04-26",
      image: "https://images.pexels.com/photos/4088282/pexels-photo-4088282.jpeg"
    },
    {
      title: "DTM基礎講座",
      type: "PDF",
      size: "3.7 MB",
      lastUpdated: "2024-04-25",
      image: "https://images.pexels.com/photos/164938/pexels-photo-164938.jpeg"
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm">Loading materials...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">教材ライブラリ</h1>
        <Button className="bg-black text-white">
          教材をアップロード
        </Button>
      </div>

      {/* 教材グリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.map((material, index) => (
          <div key={index} className="bg-white rounded-lg overflow-hidden shadow">
            <div className="aspect-video w-full overflow-hidden">
              <img 
                src={material.image} 
                alt={material.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold mb-2">{material.title}</h3>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <FileIcon className="w-4 h-4" />
                  <span>{material.type}</span>
                  <span>•</span>
                  <span>{material.size}</span>
                </div>
                <Button variant="ghost" size="sm">
                  ダウンロード
                </Button>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                最終更新日: {material.lastUpdated}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}