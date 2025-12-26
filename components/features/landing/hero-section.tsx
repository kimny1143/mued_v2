"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

interface HeroSectionProps {
  onGetStarted?: () => void;
}

/**
 * Hero Section - Landing Page
 *
 * Psychological effects applied:
 * - Framing effect: Redefines creativity as "choosing"
 * - Minimal cognitive load: One clear message
 */
export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="min-h-screen flex items-center relative overflow-hidden">
      {/* Overlay for text readability */}
      <div className="absolute inset-0 bg-black/45" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Logo & tagline */}
        <h1 className="text-6xl md:text-7xl font-bold text-white mb-4">MUEDnote</h1>
        <p className="text-2xl md:text-3xl text-slate-400 mb-8 font-light">
          Making music visible.
        </p>

        {/* Pain point + Solution */}
        <p className="text-xl md:text-2xl text-white/80 max-w-2xl mb-12 leading-relaxed">
          「なんでこうしたんだっけ」が消える前に。
          <br />
          <span className="text-white">作ってる最中の"判断"を、資産にする。</span>
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/sign-up"
            className="group inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-lg text-lg font-medium transition-all duration-200 cursor-pointer shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/40 hover:scale-[1.02]"
            onClick={onGetStarted}
          >
            記録を始める
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-4 rounded-lg text-lg font-medium transition-colors cursor-pointer"
          >
            ログイン
          </Link>
        </div>
      </div>

      {/* Scroll indicator with logo */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <Image
          src="/logo.png"
          alt="MUED"
          width={48}
          height={48}
          className="opacity-50"
        />
      </div>
    </section>
  );
}
