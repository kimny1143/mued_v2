"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, FileText } from "lucide-react";

/**
 * MUEDnote Navigation Tabs
 *
 * Simple navigation for MUEDnote dashboard
 * - No LMS features
 * - Focus on sessions and logs
 */
export function MuednoteTabs() {
  const pathname = usePathname();

  const tabs = [
    {
      name: "ホーム",
      href: "/dashboard/muednote",
      icon: Home,
      exact: true,
    },
    {
      name: "セッション",
      href: "/dashboard/muednote/sessions",
      icon: List,
    },
  ];

  return (
    <div className="border-b border-white/10 mb-8">
      <div className="flex gap-6 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`pb-3 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                isActive
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-slate-400 hover:text-white"
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
