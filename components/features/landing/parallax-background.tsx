"use client";

import { useEffect, useState } from "react";

/**
 * Parallax Background - Crossfade between two images on scroll
 */
export function ParallaxBackground() {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
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
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed inset-0 -z-10">
      {/* First background (hero) */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-300"
        style={{
          backgroundImage: "url('/hero-bg.jpg')",
          opacity: 1 - opacity,
        }}
      />
      {/* Second background (CTA) */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-300"
        style={{
          backgroundImage: "url('/cta-bg.jpg')",
          opacity: opacity,
        }}
      />
    </div>
  );
}
