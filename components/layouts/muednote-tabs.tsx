"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Upload, Settings, Wifi } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";

/**
 * MUED Dashboard Utility Navigation
 *
 * Simplified nav for cross-cutting concerns (Import, Settings, Connect).
 * Service tabs (MUEDnote / MUEDial / MUEDear) are handled by DashboardServiceTabs.
 */
export function MuednoteTabs() {
  const pathname = usePathname();
  const { t } = useLocale();

  const tabs = [
    {
      name: t.muednote.utilityNav.import,
      href: "/dashboard/import",
      icon: Upload,
    },
    {
      name: t.muednote.utilityNav.settings,
      href: "/dashboard/settings",
      icon: Settings,
    },
    {
      name: t.muednote.utilityNav.connect,
      href: "/connect",
      icon: Wifi,
    },
  ];

  return (
    <div className="border-b border-white/10 mb-8">
      <div className="flex gap-6 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
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
