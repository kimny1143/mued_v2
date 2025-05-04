"use client";

import React from "react";
import { useAuth } from "../../lib/auth";

export default function DashboardPage() {
  const { user, role, isLoading, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">ダッシュボード</h1>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              ログアウト
            </button>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg mb-6">
            <h2 className="text-lg font-medium mb-2">ユーザー情報</h2>
            <p><strong>名前:</strong> {user?.name || "未設定"}</p>
            <p><strong>メール:</strong> {user?.email || "未設定"}</p>
            <p><strong>ロール:</strong> {role}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <h3 className="font-medium text-lg mb-2">最近のレッスン</h3>
              <p className="text-gray-600">レッスンはまだありません</p>
            </div>
            
            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <h3 className="font-medium text-lg mb-2">次回の予定</h3>
              <p className="text-gray-600">予定はまだありません</p>
            </div>
            
            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <h3 className="font-medium text-lg mb-2">最新の通知</h3>
              <p className="text-gray-600">通知はまだありません</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 