"use client";

import Image from "next/image";
import { Monitor, MessageCircle, Wrench } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

/**
 * Growth Preview Section - Landing Page
 *
 * Shows what Hoo is learning to do (upcoming features)
 * Uses active voice: "開発中" not "Coming Soon"
 * Hoo speaks in first person about growth
 */
export function GrowthPreviewSection() {
  return (
    <section className="py-24 bg-[#1A1A2E]/80 backdrop-blur-lg relative">
      <div className="container mx-auto px-6">
        {/* Header with Hoo */}
        <div className="flex flex-col items-center text-center mb-16">
          <Image
            src="/logo.png"
            alt="Hoo"
            width={80}
            height={80}
            className="mb-6 drop-shadow-lg"
          />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Hooはもっとできるようになるよ
          </h2>
          <p className="text-lg text-slate-400 max-w-xl">
            いま準備してること、ちょっとだけ教えるね。
          </p>
        </div>

        {/* Upcoming features grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* DAW Log Integration */}
          <GlassCard className="relative overflow-hidden">
            {/* Badge */}
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
                <Wrench className="w-3 h-3" />
                開発中
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                <Monitor className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">DAWログ連携</h3>
            </div>

            {/* Hoo's voice */}
            <blockquote className="text-white/90 text-lg mb-4 pl-4 border-l-2 border-indigo-500/50">
              「制作中、DAWで何をしたか覚えておけるようになるよ。後で振り返れるから、便利でしょ？」
            </blockquote>

            <ul className="text-slate-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                DAWの操作ログを自動で記録
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                「なぜこうしたか」が後から見返せる
              </li>
            </ul>
          </GlassCard>

          {/* Conversation with Hoo */}
          <GlassCard className="relative overflow-hidden">
            {/* Badge */}
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
                <Wrench className="w-3 h-3" />
                開発中
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Hooとの会話</h3>
            </div>

            {/* Hoo's voice */}
            <blockquote className="text-white/90 text-lg mb-4 pl-4 border-l-2 border-indigo-500/50">
              「いつか、君の話し相手にもなれるかも。制作の相談とか、聞けるようになりたいな。」
            </blockquote>

            <ul className="text-slate-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                AIを活用した会話機能
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                有料オプションとして提供予定
              </li>
            </ul>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
