"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";

/**
 * Parallax Background - Crossfade between two images on scroll
 * Optimized with next/image and requestAnimationFrame
 */
export function ParallaxBackground() {
  const [opacity, setOpacity] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const windowHeight = window.innerHeight;
          const docHeight = document.documentElement.scrollHeight;

          // Start transition at 60% scroll, complete at 85%
          const startPoint = (docHeight - windowHeight) * 0.6;
          const endPoint = (docHeight - windowHeight) * 0.85;

          if (scrollY < startPoint) {
            setOpacity(0);
          } else if (scrollY > endPoint) {
            setOpacity(1);
          } else {
            const progress = (scrollY - startPoint) / (endPoint - startPoint);
            setOpacity(progress);
          }

          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed inset-0 -z-10">
      {/* First background (hero) - priority load */}
      <Image
        src="/hero-bg.webp"
        alt=""
        fill
        priority
        className="object-cover object-center transition-opacity duration-300"
        style={{ opacity: 1 - opacity }}
        sizes="100vw"
      />
      {/* Second background (CTA) */}
      <Image
        src="/cta-bg.webp"
        alt=""
        fill
        className="object-cover object-center transition-opacity duration-300"
        style={{ opacity: opacity }}
        sizes="100vw"
      />
    </div>
  );
}
