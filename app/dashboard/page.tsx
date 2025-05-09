"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  // 認証状態を確認（ページ保護用）
  useEffect(() => {
    // 初期セッションチェック
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // ログインしていない場合はログインページへリダイレクト
        window.location.href = '/login';
      }
      setLoading(false);
    };

    getSession();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-6">Dashboard</h1>
      
      {/* Welcome section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded border border-gray-100">
          <h3 className="text-sm font-medium mb-2">Total Lessons</h3>
          <p className="text-2xl font-bold">12</p>
        </div>
        <div className="bg-white p-6 rounded border border-gray-100">
          <h3 className="text-sm font-medium mb-2">Hours Learned</h3>
          <p className="text-2xl font-bold">24</p>
        </div>
        <div className="bg-white p-6 rounded border border-gray-100">
          <h3 className="text-sm font-medium mb-2">Next Lesson</h3>
          <p className="text-sm text-gray-500">No upcoming lessons</p>
        </div>
      </div>

      {/* Subscription Status */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-2">Your Subscription</h2>
        <p className="text-sm">No active subscription</p>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-bold mb-2">Recent Activity</h2>
        <div className="bg-white rounded border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h4 className="text-sm font-medium">Completed Lesson 1</h4>
              <p className="text-xs text-gray-500">2 days ago</p>
            </div>
            <Link href="/dashboard/lessons/1" className="text-xs text-gray-700 hover:underline">
              View Details
            </Link>
          </div>
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h4 className="text-sm font-medium">Completed Lesson 2</h4>
              <p className="text-xs text-gray-500">2 days ago</p>
            </div>
            <Link href="/dashboard/lessons/2" className="text-xs text-gray-700 hover:underline">
              View Details
            </Link>
          </div>
          <div className="p-4 flex justify-between items-center">
            <div>
              <h4 className="text-sm font-medium">Completed Lesson 3</h4>
              <p className="text-xs text-gray-500">2 days ago</p>
            </div>
            <Link href="/dashboard/lessons/3" className="text-xs text-gray-700 hover:underline">
              View Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 