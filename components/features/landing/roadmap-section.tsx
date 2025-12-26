"use client";

import { Check, Clock, Sparkles } from "lucide-react";

/**
 * Roadmap Section - Landing Page
 *
 * Shows the product roadmap and future plans
 * Phase 1: MUEDnote launch (1/7)
 * Phase 2: Search, export, sharing
 * Phase 3: Marketplace
 */
export function RoadmapSection() {
  const phases = [
    {
      phase: "Phase 1",
      title: "MUEDnote リリース",
      date: "2025年1月",
      status: "current",
      features: [
        "休憩促進タイマー",
        "音声文字起こし",
        "判断ログの保存",
      ],
    },
    {
      phase: "Phase 2",
      title: "検索・活用",
      date: "2025年春",
      status: "upcoming",
      features: [
        "過去ログの検索・比較",
        "エクスポート機能",
        "DAWログ連携",
      ],
    },
    {
      phase: "Phase 3",
      title: "共有・学び合い",
      date: "2025年〜",
      status: "future",
      features: [
        "判断ログの共有",
        "非同期レビュー",
        "メンタリング機能",
      ],
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "current":
        return <Clock className="w-5 h-5 text-indigo-400" />;
      case "upcoming":
        return <Sparkles className="w-5 h-5 text-slate-500" />;
      default:
        return <Sparkles className="w-5 h-5 text-slate-600" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "current":
        return "border-indigo-500/50 bg-indigo-600/10";
      case "upcoming":
        return "border-white/10 bg-white/5";
      default:
        return "border-white/5 bg-white/[0.02]";
    }
  };

  return (
    <section className="py-20 bg-[#0F0F1A]/90 backdrop-blur-lg relative">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Roadmap
            </h2>
            <p className="text-slate-400">
              MUEDnoteから始まる、判断を資産にする旅
            </p>
          </div>

          {/* Timeline */}
          <div className="grid md:grid-cols-3 gap-6">
            {phases.map((item, index) => (
              <div
                key={index}
                className={`rounded-xl border p-6 ${getStatusStyle(item.status)}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {getStatusIcon(item.status)}
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {item.phase}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-white mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-500 mb-4">{item.date}</p>

                <ul className="space-y-2">
                  {item.features.map((feature, featureIndex) => (
                    <li
                      key={featureIndex}
                      className="flex items-center gap-2 text-sm text-slate-400"
                    >
                      <Check className="w-3 h-3 text-slate-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
