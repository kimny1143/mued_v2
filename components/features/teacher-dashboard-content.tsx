'use client';

import Link from 'next/link';
import { useLocale } from '@/lib/i18n/locale-context';
import { RevenueStats } from '@/components/features/revenue-stats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>スロット管理</CardTitle>
              <CardDescription>レッスン枠の作成・編集</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/teacher/slots">
                <Button className="w-full">スロット管理へ</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

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
