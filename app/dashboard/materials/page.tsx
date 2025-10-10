'use client';

import { useRouter } from 'next/navigation';
import { useMaterials } from '@/hooks/use-materials';
import { MaterialCard } from '@/components/features/material-card';
import { QuotaIndicator } from '@/components/features/quota-indicator';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { DashboardTabs } from '@/components/layouts/dashboard-tabs';
import { PageHeader } from '@/components/layouts/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function MaterialsPage() {
  const router = useRouter();
  const { materials, quota, loading, error, deleteMaterial } = useMaterials();

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    const success = await deleteMaterial(id);
    if (!success) {
      alert('Failed to delete material');
    }
  };

  const handleMaterialClick = (id: string) => {
    router.push(`/dashboard/materials/${id}`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardTabs />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-brand-green)] mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardTabs />
      <PageHeader
        title="教材ライブラリ"
        description="AI生成された学習教材を管理"
        action={
          <Button onClick={() => router.push('/dashboard/materials/new')}>
            + 新規作成
          </Button>
        }
      />

      {/* Quota Info */}
      {quota && (
        <div className="mb-6">
          <QuotaIndicator
            used={quota.used}
            limit={quota.limit}
            label="今月の使用量"
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <Card className="bg-red-50 border-red-200 text-red-700 mb-6 p-4">
          {error}
        </Card>
      )}

      {/* Materials Grid */}
      {materials.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">教材がありません</h3>
          <p className="text-gray-600 mb-6">
            最初のAI教材を生成してみましょう
          </p>
          <Button onClick={() => router.push('/dashboard/materials/new')}>
            教材を生成
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map((material) => (
            <MaterialCard
              key={material.id}
              id={material.id}
              title={material.title}
              description={material.description || ""}
              category={material.category || "未分類"}
              createdAt={new Date(material.createdAt)}
              onView={handleMaterialClick}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
