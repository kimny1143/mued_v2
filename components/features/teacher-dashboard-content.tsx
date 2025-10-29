'use client';

import { useLocale } from '@/lib/i18n/locale-context';
import { RevenueStats } from '@/components/features/revenue-stats';

export function TeacherDashboardContent() {
  const { t } = useLocale();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t.teacher.title}</h1>
        <p className="text-muted-foreground mt-2">
          {t.teacher.subtitle}
        </p>
      </div>

      <div className="grid gap-6">
        {/* Revenue Statistics */}
        <RevenueStats />

        {/* Additional sections can be added here */}
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">{t.teacher.nextSteps.title}</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• {t.teacher.nextSteps.createSlots}</li>
            <li>• {t.teacher.nextSteps.createMaterials}</li>
            <li>• {t.teacher.nextSteps.updateProfile}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
