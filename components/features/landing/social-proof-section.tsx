"use client";

import { Music, Award, Code, ExternalLink } from "lucide-react";

/**
 * Social Proof Section - Landing Page
 *
 * Psychological effects applied:
 * - Authority bias: Professional credentials
 * - Social proof: glasswerks brand
 */
export function SocialProofSection() {
  const credentials = [
    {
      icon: Award,
      title: "国内での豊富な制作実績",
      description: "メジャーインディー・法人個人",
    },
    {
      icon: Music,
      title: "商業音楽での豊富な経験",
      description: "新旧クリエイターの知見を蓄積",
    },
    {
      icon: Code,
      title: "先進的な技術設計",
      description: "アートとテクノロジーの融合",
    },
  ];

  return (
    <section className="py-16 bg-[#0F0F1A]/92 backdrop-blur-xl relative">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <p className="text-slate-400 text-lg mb-2">Developed by</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              glasswerks inc.
            </h2>
          </div>

          {/* Credentials - simple border style */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {credentials.map((item, index) => (
              <div key={index} className="text-center py-6 border-t border-white/20">
                <item.icon className="w-6 h-6 text-slate-500 mx-auto mb-4" />
                <h3 className="text-base font-medium text-white mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-500">{item.description}</p>
              </div>
            ))}
          </div>

          {/* Link to glasswerks */}
          <div className="text-center">
            <a
              href="https://www.glasswerks.jp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              詳しく見る
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
