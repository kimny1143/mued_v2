"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useLocale } from "@/lib/i18n/locale-context";
import { Shield } from "lucide-react";

export function DashboardTabs() {
  const pathname = usePathname();
  const { user } = useUser();
  const { t } = useLocale();

  // Check if user is admin
  const isAdmin = user?.publicMetadata?.role === "admin";

  const baseTabs = [
    { name: t.nav.dashboard, href: "/dashboard" },
    { name: t.nav.lessons, href: "/dashboard/lessons" },
    { name: t.nav.materials, href: "/dashboard/materials" },
    { name: t.nav.library, href: "/dashboard/library" },
  ];

  // Add Admin tab if user is admin
  const tabs = isAdmin
    ? [
        ...baseTabs,
        { name: t.nav.admin, href: "/dashboard/admin/rag-metrics", icon: Shield },
      ]
    : baseTabs;

  return (
    <div className="border-b border-gray-200 mb-8">
      <div className="flex gap-6 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const Icon = 'icon' in tab ? tab.icon : null;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`pb-3 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                isActive
                  ? "border-[var(--color-brand-green)] text-[var(--color-text-primary)]"
                  : "border-transparent text-gray-600 hover:text-[var(--color-text-primary)]"
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {tab.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
