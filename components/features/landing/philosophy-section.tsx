"use client";

import { Clock, Music, Mic } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

/**
 * Philosophy Section - Landing Page
 *
 * MVP features: Rest tracker + Sound reaction + Voice memo
 * No AI conversation - just a cute companion
 */
export function PhilosophySection() {
  return (
    <section className="py-32 bg-[#0F0F1A]/85 backdrop-blur-md relative">
      <div className="container mx-auto px-6">
        {/* Intro - softer tone */}
        <div className="max-w-3xl mb-20">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 leading-tight">
            Hooができること
          </h2>

          <div className="text-lg md:text-xl text-slate-400 leading-relaxed space-y-6">
            <p>
              制作に集中してると、時間を忘れちゃうよね。
              <br />
              Hooがそばにいるから、大丈夫。
            </p>
          </div>
        </div>

        {/* Three features - MVP accurate */}
        <div className="grid md:grid-cols-3 gap-6">
          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">休憩を教えてくれる</h3>
            </div>
            <p className="text-slate-400">
              集中しすぎる前に、Hooが「そろそろ休憩しよ？」って教えてくれる。
              頭がスッキリした状態をキープ。
            </p>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                <Music className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">音に反応する</h3>
            </div>
            <p className="text-slate-400">
              音楽が鳴ると、Hooがゆらゆら動く。
              制作中、そばにいる感じがするでしょ？
            </p>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                <Mic className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">声でメモを残せる</h3>
            </div>
            <p className="text-slate-400">
              思いついたことを声で残しておける。
              後で文字になって見返せるよ。
            </p>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
