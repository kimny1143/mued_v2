'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/lib/i18n/locale-context';
import { BarChart3, Package } from 'lucide-react';

export function AdminTabs() {
  const pathname = usePathname();
  const { t } = useLocale();

  const tabs = [
    {
      name: t.ragMetrics.title,
      href: '/dashboard/admin/rag-metrics',
      icon: BarChart3,
    },
    {
      name: t.plugins.title,
      href: '/dashboard/admin/plugins',
      icon: Package,
    },
  ];

  return (
    <div className="border-b border-gray-200 mb-8">
      <div className="flex gap-6 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`pb-3 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                isActive
                  ? 'border-[var(--color-primary)] text-[var(--color-text-primary)]'
                  : 'border-transparent text-gray-600 hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
