"use client";

import { Apple } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppStoreButtonProps {
  /** App Store URL */
  href: string;
  /** Button size */
  size?: "default" | "large";
  /** Additional className */
  className?: string;
}

/**
 * App Store Button - Plugin Alliance style (outline + fill on hover)
 *
 * Apple-style button with 2-line text layout:
 * - "Download on the" (small)
 * - "App Store" (large)
 *
 * Uses amber variant for MUEDear branding.
 *
 * @example
 * <AppStoreButton href={MUEDEAR_APP_STORE_URL} />
 *
 * @example
 * <AppStoreButton href={MUEDEAR_APP_STORE_URL} size="large" />
 */
export function AppStoreButton({
  href,
  size = "default",
  className,
}: AppStoreButtonProps) {
  const isLarge = size === "large";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-3",
        "bg-transparent border-2 border-amber-500",
        "text-amber-400 hover:bg-amber-500 hover:text-white",
        "rounded-xl font-medium transition-all duration-300",
        isLarge ? "px-8 py-4" : "px-6 py-4",
        className
      )}
    >
      <Apple className={cn(isLarge ? "w-8 h-8" : "w-6 h-6")} />
      <div className="text-left">
        <div className="text-xs opacity-80">Download on the</div>
        <div className={cn("font-semibold -mt-0.5", isLarge ? "text-xl" : "text-lg")}>
          App Store
        </div>
      </div>
    </a>
  );
}
