"use client";

import { Apple } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "amber" | "indigo";

const variantStyles: Record<Variant, string> = {
  amber: "border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-white",
  indigo: "border-indigo-500 text-indigo-400 hover:bg-indigo-500 hover:text-white",
};

interface AppStoreButtonProps {
  /** App Store URL */
  href: string;
  /** Color variant */
  variant?: Variant;
  /** Custom app label (shown instead of "App Store") */
  label?: string;
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
 * - App name or "App Store" (large)
 *
 * @example
 * <AppStoreButton href={MUEDEAR_APP_STORE_URL} />
 *
 * @example
 * <AppStoreButton href={MUEDNOTE_APP_STORE_URL} variant="indigo" label="MUEDnote" />
 */
export function AppStoreButton({
  href,
  variant = "amber",
  label,
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
        "bg-transparent border-2",
        "rounded-[var(--radius-lg)] font-medium transition-all duration-300",
        variantStyles[variant],
        isLarge ? "px-8 py-4" : "px-6 py-4",
        className
      )}
    >
      <Apple className={cn(isLarge ? "w-8 h-8" : "w-6 h-6")} />
      <div className="text-left">
        <div className="text-xs opacity-80">Download on the</div>
        <div className={cn("font-semibold -mt-0.5", isLarge ? "text-xl" : "text-lg")}>
          {label || "App Store"}
        </div>
      </div>
    </a>
  );
}
