"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, History, Settings, Brain, Lock } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";
import { useState, useEffect } from "react";

/**
 * MUEDnote Navigation Tabs
 *
 * Includes MUEDlobe tab (Premium-only, grayed out for other tiers)
 */
export function MuednoteTabs() {
  const pathname = usePathname();
  const { t, locale } = useLocale();
  const [tier, setTier] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/subscription/limits")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setTier(data.data.limits.tier);
      })
      .catch(() => {});
  }, []);

  const isPremium = tier === "premium";

  const tabs = [
    {
      name: t.muednote.tabs.home,
      href: "/dashboard/muednote",
      icon: Home,
      exact: true,
    },
    {
      name: t.muednote.tabs.sessions,
      href: "/dashboard/muednote/sessions",
      icon: List,
    },
    {
      name: t.muednote.tabs.hoo,
      href: "/dashboard/muednote/hoo",
      icon: History,
    },
    {
      name: "MUEDlobe",
      href: "/dashboard/muednote/lobe",
      icon: Brain,
      premiumOnly: true,
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
          const isPremiumTab = "premiumOnly" in tab && tab.premiumOnly;
          const isLocked = isPremiumTab && !isPremium;
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
                  : isLocked
                    ? "border-transparent text-slate-600 hover:text-slate-400"
                    : "border-transparent text-slate-400 hover:text-white"
              }`}
              title={
                isLocked
                  ? locale === "ja"
                    ? "Premiumプランで利用可能"
                    : "Available on Premium plan"
                  : undefined
              }
            >
              <Icon className="w-4 h-4" />
              {tab.name}
              {isLocked && <Lock className="w-3 h-3" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
