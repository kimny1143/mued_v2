"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Bell } from "lucide-react";

/**
 * CTA Section - Landing Page
 *
 * Hoo-centric closing message
 * Warm, inviting tone
 */
export function CtaSection() {
  return (
    <section className="py-32 bg-[#0F0F1A]/55 backdrop-blur-md relative">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          {/* Launch announcement badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/20 rounded-full text-indigo-400 text-sm font-medium mb-8">
            <Bell className="w-4 h-4" />
            近日リリース予定
          </div>

          {/* Hoo image */}
          <div className="mb-8">
            <Image
              src="/logo.png"
              alt="Hoo"
              width={100}
              height={100}
              className="mx-auto drop-shadow-lg"
            />
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Hooと一緒に、
            <br />
            制作を始めよう。
          </h2>

          <p className="text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
            休憩のタイミング、Hooに任せてみない？
            <br />
            制作のおともに、どうぞ。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="group inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-lg text-lg font-medium transition-all duration-200 cursor-pointer shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/40 hover:scale-[1.02]"
            >
              Hooに会う
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
