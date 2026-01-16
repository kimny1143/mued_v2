"use client";

import Image from "next/image";
import { GlassCard } from "@/components/ui/glass-card";

/**
 * MUEDnote Section - Landing Page
 *
 * iOS app introduction with Hoo-centric messaging
 * Companion experience, not feature list
 */
export function MuednoteSection() {
  return (
    <section className="py-20 bg-[#1A1A2E]/90 backdrop-blur-lg relative">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Description */}
          <div>
            <div className="inline-block px-3 py-1 bg-indigo-600/20 rounded-full text-indigo-400 text-sm font-medium mb-6">
              iOS App
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              ポケットの中のHoo
            </h2>

            <div className="text-lg text-slate-400 leading-relaxed mb-8 space-y-4">
              <p>スマホを置くだけで、Hooがそばにいる。</p>
              <p className="text-white/90">
                音に反応して動いたり、休憩を教えてくれたり。
                <br />
                制作のおともに、どうぞ。
              </p>
            </div>

            {/* Simple feature hints - not a bullet list */}
            <div className="bg-white/5 rounded-xl p-6 mb-8 border border-white/10">
              <p className="text-slate-300 text-sm leading-relaxed">
                💡 声でメモを残すと、自動で文字起こし。
                後から見返せるよ。
              </p>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#0F0F1A] px-6 py-3 rounded-lg font-medium hover:bg-slate-100 transition-colors cursor-pointer"
              >
                近日リリース予定
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer"
              >
                App Store
              </a>
            </div>
          </div>

          {/* Right: App preview with Hoo */}
          <div className="flex justify-center lg:justify-end">
            <GlassCard className="w-72 h-[500px] flex items-center justify-center relative overflow-hidden">
              <div className="text-center">
                {/* Hoo in phone mockup style */}
                <Image
                  src="/logo.png"
                  alt="Hoo"
                  width={120}
                  height={120}
                  className="mx-auto mb-4 drop-shadow-lg"
                />
                <p className="text-white/80 text-lg font-medium mb-2">ほほう</p>
                <p className="text-slate-400 text-sm">休憩まであと 23:45</p>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </section>
  );
}
