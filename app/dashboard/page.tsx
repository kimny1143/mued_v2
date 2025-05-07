"use client";

import React from "react";
import { useAuth } from "../../lib/auth";

export default function DashboardPage() {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-lg">読み込み中...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
        <h1 className="text-2xl font-bold">ようこそ！</h1>
      </div>

      {/* Welcome section */}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold mb-2">レッスン総数</h3>
            <p className="text-3xl font-bold">12</p>
          </div>
          <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold mb-2">学習時間</h3>
            <p className="text-3xl font-bold">24</p>
          </div>
          <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold mb-2">次回のレッスン</h3>
            <p className="text-sm text-gray-500">予定されたレッスンはありません</p>
          </div>
        </div>
      </section>

      {/* User information */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">ユーザー情報</h2>
        <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <p className="text-sm font-medium text-gray-500">名前</p>
                <p>{user?.name || "未設定"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">メールアドレス</p>
                <p>{user?.email || "未設定"}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">現在のプラン</p>
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                無料プラン
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-xl font-semibold mb-4">最近のアクティビティ</h2>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm divide-y">
          {[1, 2, 3].map((item) => (
            <div key={item} className="p-4 flex items-center justify-between">
              <div>
                <h4 className="font-medium">レッスン {item} 完了</h4>
                <p className="text-sm text-gray-500">2日前</p>
              </div>
              <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                詳細を見る
              </button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
} 