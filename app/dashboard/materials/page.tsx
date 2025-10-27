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
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardTabs />
      <PageHeader
        title="🎵 Music Material Library"
        description="AI-powered music learning materials tailored to your needs"
        action={
          <Button onClick={() => router.push('/dashboard/materials/new')}>
            <span className="mr-1">✨</span> Generate Music Material
          </Button>
        }
      />

      {/* Quota Info */}
      {quota && (
        <div className="mb-6">
          <QuotaIndicator
            used={quota.used}
            limit={quota.limit}
            label="Monthly Usage"
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
        <div className="text-center py-20">
          <div className="text-7xl mb-6">🎼</div>
          <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">Your Music Library Awaits</h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Create personalized practice routines, sheet music, exercises, and theory lessons tailored to your instrument and skill level
          </p>
          <Button
            onClick={() => router.push('/dashboard/materials/new')}
            className="bg-[var(--color-brand-green)] hover:bg-[var(--color-brand-green-hover)] text-white font-semibold px-8 py-3"
          >
            <span className="mr-2">✨</span>
            Generate Your First Music Material
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
              category={material.type || "Uncategorized"}
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
