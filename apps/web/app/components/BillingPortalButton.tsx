"use client";

import { useState } from 'react';
import { Button } from '@ui/button';
import { Settings, ExternalLink } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export function BillingPortalButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openBillingPortal = async () => {
    const confirmed = confirm(
      '🔄 プラン管理ページに移動します\n\n' +
      '・プランの変更\n' +
      '・支払い方法の更新\n' +
      '・請求履歴の確認\n' +
      '・サブスクリプションのキャンセル\n\n' +
      'これらの操作が可能です。続行しますか？'
    );
    
    if (confirmed) {
      try {
        setIsLoading(true);
        setError(null);

        // 認証トークンを取得
        const { data: sessionData } = await supabaseBrowser.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          throw new Error('認証トークンが見つかりません。再度ログインしてください。');
        }

        // Billing Portal Sessionを作成
        const response = await fetch('/api/billing-portal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Billing Portal Sessionの作成に失敗しました');
        }

        // 新しいタブでBilling Portalを開く
        window.open(data.url, '_blank');

      } catch (error) {
        console.error('Billing Portal エラー:', error);
        const errorMessage = error instanceof Error ? error.message : 'Billing Portalの開始に失敗しました';
        setError(errorMessage);
        alert(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex-1">
      <Button
        onClick={openBillingPortal}
        disabled={isLoading}
        variant="outline"
        className="w-full flex items-center justify-center space-x-2"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            <span>処理中...</span>
          </>
        ) : (
          <>
            <Settings className="w-4 h-4" />
            <span>プラン管理</span>
            <ExternalLink className="w-3 h-3" />
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
} 