'use client';

/**
 * Billingポータルへのリダイレクト処理を管理するユーティリティ
 */

/**
 * Stripe Billing ポータルにリダイレクト
 */
export function redirectToBillingPortal(): void {
  const billingPortalUrl = process.env.NEXT_PUBLIC_STRIPE_BILLING_PORTAL_URL;
  
  if (!billingPortalUrl) {
    console.error('Billing Portal URLが設定されていません');
    // フォールバック: ダッシュボードにリダイレクト
    window.location.href = '/dashboard';
    return;
  }
  
  console.log('Stripe Billing Portalにリダイレクト:', billingPortalUrl);
  window.location.href = billingPortalUrl;
}

/**
 * プラン選択後のログイン処理
 */
export function handlePostLoginPlanRedirect(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const selectedPlanData = localStorage.getItem('selectedPlan');
    if (!selectedPlanData) return false;
    
    const selectedPlan = JSON.parse(selectedPlanData);
    console.log('プラン選択後のログイン処理:', selectedPlan);
    
    // プラン情報をクリア
    localStorage.removeItem('selectedPlan');
    
    // FREEプランの場合は何もしない
    if (selectedPlan.priceId === 'free') {
      console.log('FREEプランのため、ダッシュボードに留まります');
      return false;
    }
    
    // 有料プランの場合はBillingポータルにリダイレクト
    console.log('有料プラン選択のため、Billingポータルにリダイレクトします');
    setTimeout(() => {
      redirectToBillingPortal();
    }, 1500); // 1.5秒後にリダイレクト
    
    return true;
    
  } catch (error) {
    console.error('プラン選択後のログイン処理エラー:', error);
    // エラー時はプラン情報をクリア
    localStorage.removeItem('selectedPlan');
    return false;
  }
}

/**
 * 選択されたプラン情報を取得
 */
export function getSelectedPlanInfo(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const selectedPlanData = localStorage.getItem('selectedPlan');
    return selectedPlanData ? JSON.parse(selectedPlanData) : null;
  } catch (error) {
    console.error('プラン情報の取得エラー:', error);
    return null;
  }
}

/**
 * プラン選択情報をクリア
 */
export function clearSelectedPlan(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('selectedPlan');
  console.log('プラン選択情報をクリアしました');
} 