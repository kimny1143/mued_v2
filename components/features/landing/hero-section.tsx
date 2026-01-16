"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

interface HeroSectionProps {
  onGetStarted?: () => void;
}

const HOO_PHRASES = [
  "Ho-Hoo, そのアイデアいいね",
  "Ho-Hoo, そんなアプローチするんだ",
  "Ho-Hoo, なるほど、そうきたか",
  "Ho-Hoo, そろそろ休憩しない？",
];

/**
 * Hero Section - Landing Page
 *
 * Hoo (owl mascot) centered design
 * Focus on companion experience, not feature list
 */
export function HeroSection({ onGetStarted }: HeroSectionProps) {
  const [phrase, setPhrase] = useState(HOO_PHRASES[0]);

  useEffect(() => {
    // Random phrase on mount
    const randomIndex = Math.floor(Math.random() * HOO_PHRASES.length);
    setPhrase(HOO_PHRASES[randomIndex]);
  }, []);

  return (
    <section className="min-h-screen flex items-center relative overflow-hidden">
      {/* Overlay for text readability */}
      <div className="absolute inset-0 bg-black/45" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Left: Copy */}
          <div className="flex-1 text-center lg:text-left">
            {/* Logo & tagline */}
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">MUEDnote</h1>
            <p className="text-xl md:text-2xl text-slate-400 mb-8 font-light">
              Making music visible.
            </p>

            {/* Hoo-centric copy - rest tracker focus */}
            <p className="text-2xl md:text-3xl text-white/90 max-w-xl mb-6 leading-relaxed">
              制作のそばに、いつもHoo。
            </p>
            <p className="text-lg text-slate-400 max-w-xl mb-12">
              集中しすぎる前に、休憩の時間を教えてくれる。
              <br />
              音に反応して動く、制作のおとも。
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/sign-up"
                className="group inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-lg text-lg font-medium transition-all duration-200 cursor-pointer shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/40 hover:scale-[1.02]"
                onClick={onGetStarted}
              >
                Hooと始める
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

          {/* Right: Hoo with speech bubble */}
          <div className="flex-1 flex justify-center lg:justify-end">
            <div className="relative">
              {/* Speech bubble - pops in after delay, hidden on mobile */}
              <div className="hidden lg:block absolute -top-16 right-1/2 translate-x-4 bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/20 animate-bubble-pop">
                <p className="text-white text-base font-medium whitespace-nowrap">{phrase}</p>
                {/* Bubble tail - points to Hoo's head */}
                <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white/10 border-r border-b border-white/20 rotate-45" />
              </div>

              {/* Hoo logo - gentle bounce */}
              <Image
                src="/logo.png"
                alt="Hoo - MUEDnote mascot"
                width={280}
                height={280}
                className="drop-shadow-2xl animate-hoo-bounce"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
          <div className="w-1 h-3 bg-white/50 rounded-full" />
        </div>
      </div>
    </section>
  );
}
