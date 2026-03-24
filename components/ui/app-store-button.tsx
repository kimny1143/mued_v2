"use client";

import { Apple } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackCtaClick } from "@/lib/analytics/gtag";

type AppStoreColor = "amber" | "indigo" | "white";

interface AppStoreButtonProps {
  /** App Store URL */
  href: string;
  /** Color theme: amber (MUEDear), indigo (MUEDnote), white (neutral) */
  color?: AppStoreColor;
  /** Button size */
  size?: "small" | "default" | "large";
  /** Product name for analytics (e.g., "muedear", "muednote") */
  product?: string;
  /** CTA location for analytics (e.g., "hero", "final_cta") */
  ctaLocation?: string;
  /** Additional className */
  className?: string;
}

const colorStyles: Record<AppStoreColor, string> = {
  amber: "border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-white",
  indigo: "border-indigo-500 text-indigo-400 hover:bg-indigo-500 hover:text-white",
  white: "border-white text-white hover:bg-white hover:text-black",
};

/**
 * App Store Button - Unified download button for iOS apps
 *
 * Apple-style button with 2-line text layout:
 * - "Download on the" (small)
 * - "App Store" (large)
 *
 * Use consistent style for all App Store downloads.
 * Color variants match brand colors:
 * - amber: MUEDear
 * - indigo: MUEDnote
 * - white: neutral/generic
 */
export function AppStoreButton({
  href,
  color = "amber",
  size = "default",
  product,
  ctaLocation,
  className,
}: AppStoreButtonProps) {
  const sizeStyles = {
    small: "px-3 py-1.5 gap-1.5",
    default: "px-4 py-2.5 gap-2",
    large: "px-5 py-3 gap-2.5",
  };

  const iconSize = {
    small: "w-4 h-4",
    default: "w-5 h-5",
    large: "w-6 h-6",
  };

  const textSize = {
    small: "text-xs",
    default: "text-sm",
    large: "text-base",
  };

  const handleClick = () => {
    if (product && ctaLocation) {
      trackCtaClick(product, ctaLocation);
    }
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center",
        "bg-transparent border-2",
        "rounded-[var(--radius-lg)] font-medium",
        "transition-colors duration-200",
        colorStyles[color],
        sizeStyles[size],
        className
      )}
    >
      <Apple className={iconSize[size]} />
      <div className="text-left">
        <div className={cn("opacity-80", size === "small" ? "text-[10px]" : "text-xs")}>
          Download on the
        </div>
        <div className={cn("font-semibold -mt-0.5", textSize[size])}>
          App Store
        </div>
      </div>
    </a>
  );
}
