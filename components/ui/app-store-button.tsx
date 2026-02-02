"use client";

import { Apple } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppStoreButtonProps {
  /** App Store URL */
  href: string;
  /** Button size */
  size?: "small" | "default" | "large";
  /** Additional className */
  className?: string;
}

/**
 * App Store Button - Spitfire style (clean, minimal)
 *
 * Apple-style button with 2-line text layout:
 * - "Download on the" (small)
 * - "App Store" (large)
 *
 * Hover: subtle brightness increase, no scale or colored shadows.
 */
export function AppStoreButton({
  href,
  size = "default",
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

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center",
        "bg-transparent border-2 border-amber-500 text-amber-400",
        "rounded-[var(--radius-lg)] font-medium",
        "transition-colors duration-200",
        "hover:bg-amber-500 hover:text-white",
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
