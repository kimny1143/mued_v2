"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useUser } from "@/lib/hooks/use-user";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { SubscriptionStatus } from "@/app/components/SubscriptionStatus";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useUser();

  // 認証状態を確認（ページ保護用）
  useEffect(() => {
    // 初期セッションチェック
    const getSession = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!data.session) {
        // ログインしていない場合はログインページへリダイレクト
        router.push('/login');
      }
      setLoading(false);
    };

    getSession();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <>
      {/* Welcome section */}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-white">
            <h3 className="font-semibold mb-2">Total Lessons</h3>
            <p className="text-3xl font-bold">12</p>
          </Card>
          <Card className="p-6 bg-white">
            <h3 className="font-semibold mb-2">Hours Learned</h3>
            <p className="text-3xl font-bold">24</p>
          </Card>
          <Card className="p-6 bg-white">
            <h3 className="font-semibold mb-2">Next Lesson</h3>
            <p className="text-sm text-gray-500">No upcoming lessons</p>
          </Card>
        </div>
      </section>

      {/* Subscription Status */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Subscription</h2>
        <SubscriptionStatus />
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <Card className="bg-white divide-y">
          {[1, 2, 3].map((item) => (
            <div key={item} className="p-4 flex items-center justify-between">
              <div>
                <h4 className="font-medium">Completed Lesson {item}</h4>
                <p className="text-sm text-gray-500">2 days ago</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
              >
                View Details
              </Button>
            </div>
          ))}
        </Card>
      </section>
    </>
  );
} 