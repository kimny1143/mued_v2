"use client";

import { useUser } from "@/lib/hooks/use-user";
import { Badge } from "@ui/badge";

export function SubscriptionStatus() {
  const { user, loading } = useUser();
  
  if (loading) {
    return (
      <div className="animate-pulse flex space-x-4">
        <div className="h-6 w-24 bg-gray-200 rounded"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Badge variant="outline">未ログイン</Badge>;
  }
  
  // プラン名に基づいてバッジのスタイルを決定
  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
  const planName = user.plan || "Free Plan";
  
  if (planName === "Premium Subscription") {
    badgeVariant = "default"; // 青色のバッジ
  } else if (planName === "Starter Subscription") {
    badgeVariant = "secondary"; // 灰色のバッジ
  } else if (planName === "Basic Subscription") {
    badgeVariant = "destructive"; // 赤色のバッジ
  }
  
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Badge variant={badgeVariant}>
          {planName}
        </Badge>
      </div>
    </div>
  );
}