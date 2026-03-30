"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, Upload, Settings, Brain } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";

/**
 * MUEDnote Navigation Tabs
 */
export function MuednoteTabs() {
  const pathname = usePathname();
  const { t } = useLocale();

  const tabs = [
    {
      name: t.muednote.tabs.home,
      href: "/dashboard/muednote",
      icon: Home,
      exact: true,
    },
    {
      name: "MUEDlobe",
      href: "/dashboard/muednote/lobe",
      icon: Brain,
    },
    {
      name: t.muednote.tabs.sessions,
      href: "/dashboard/muednote/sessions",
      icon: List,
    },
    {
      name: t.muednote.tabs.import || "Import",
      href: "/dashboard/muednote/import",
      icon: Upload,
    },
    {
      name: t.muednote.tabs.settings,
      href: "/dashboard/settings",
      icon: Settings,
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
              key={tab.name}
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
