"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardTabs() {
  const pathname = usePathname();

  const tabs = [
    { name: "Overview", href: "/dashboard" },
    { name: "Lessons", href: "/dashboard/lessons" },
    { name: "Materials", href: "/dashboard/materials" },
  ];

  return (
    <div className="border-b border-gray-200 mb-8">
      <div className="flex gap-6 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`pb-3 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "border-[var(--color-brand-green)] text-[var(--color-text-primary)]"
                  : "border-transparent text-gray-600 hover:text-[var(--color-text-primary)]"
              }`}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
