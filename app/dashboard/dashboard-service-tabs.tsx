"use client";

import { useState } from "react";
import { Brain, Headphones, Music } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";

// ========================================
// Types
// ========================================

interface DashboardServiceTabsProps {
  muednoteContent: React.ReactNode;
  dialContent: React.ReactNode;
  muedearContent: React.ReactNode;
}

type ServiceTab = "muednote" | "dial" | "muedear";

// ========================================
// Constants
// ========================================

const TAB_CONFIG: { key: ServiceTab; icon: typeof Brain }[] = [
  { key: "muednote", icon: Brain },
  { key: "dial", icon: Headphones },
  { key: "muedear", icon: Music },
];

// ========================================
// Component
// ========================================

export function DashboardServiceTabs({
  muednoteContent,
  dialContent,
  muedearContent,
}: DashboardServiceTabsProps) {
  const [activeTab, setActiveTab] = useState<ServiceTab>("muednote");
  const { t } = useLocale();

  const contentMap: Record<ServiceTab, React.ReactNode> = {
    muednote: muednoteContent,
    dial: dialContent,
    muedear: muedearContent,
  };

  return (
    <div>
      {/* Service Tab Bar */}
      <div className="border-b border-white/10 mb-8">
        <div className="flex gap-6">
          {TAB_CONFIG.map(({ key, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`pb-3 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.muednote.serviceTabs[key]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>{contentMap[activeTab]}</div>
    </div>
  );
}
