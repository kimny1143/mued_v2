"use client";

import { Brain, Sparkles, Target } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

/**
 * Philosophy Section - Landing Page
 *
 * Psychological effects applied:
 * - Cognitive dissonance resolution: Addresses AI anxiety, clarifies human role
 * - Aesthetic-usability effect: Dark mode + glassmorphism
 */
export function PhilosophySection() {
  return (
    <section className="py-32 bg-[#0F0F1A]/85 backdrop-blur-md relative">
      <div className="container mx-auto px-6">
        {/* Main philosophy statement - left aligned */}
        <div className="max-w-3xl mb-20">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 leading-tight">
            出力はAI、
            <br />
            判断と欲は人間。
          </h2>

          <div className="text-lg md:text-xl text-slate-400 leading-relaxed space-y-6">
            <p>
              AIがやっていることは、人間の脳に似ている。
              <br />
              膨大な過去データをもとに、文脈に応じて連想し、再配置している。
            </p>

            <p className="text-white/90">
              問題は、AIが何を出すかではありません。
              <br />
              <span className="text-indigo-400 font-medium">
                それを見て、自分が何に引っかかり、何を選び、何を捨てたか。
              </span>
              <br />
              そこにだけ、人間の役割があります。
            </p>
          </div>
        </div>

        {/* Three pillars - concrete scenarios */}
        <div className="grid md:grid-cols-3 gap-6">
          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">反応を記録する</h3>
            </div>
            <p className="text-slate-400">
              「AIが出した10案のうち、なぜ3番目に引っかかったのか」
              その瞬間の言葉を、そのまま残す。
            </p>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">選択を可視化する</h3>
            </div>
            <p className="text-slate-400">
              「あの日、なぜBメロをやり直したのか」
              完成作品には残らない、途中の判断を見える形に。
            </p>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">成長を資産化する</h3>
            </div>
            <p className="text-slate-400">
              「1年前は避けていたコード進行を、今は使えている」
              変化の軌跡が、自分だけの教材になる。
            </p>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
