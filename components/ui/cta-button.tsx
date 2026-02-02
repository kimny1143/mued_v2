"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type CtaVariant = "white" | "indigo" | "amber";
type CtaSize = "default" | "large";

interface CtaButtonProps {
  /** Color variant: white (primary), indigo (MUEDnote), or amber (MUEDear) */
  variant: CtaVariant;
  /** Button size */
  size?: CtaSize;
  /** Link destination */
  href: string;
  /** External link (opens in new tab) */
  external?: boolean;
  /** Button content */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

const variantStyles: Record<CtaVariant, string> = {
  white: "bg-white text-black hover:bg-white/90",
  indigo: "bg-transparent border-2 border-indigo-500 text-indigo-400 hover:bg-indigo-500 hover:text-white",
  amber: "bg-transparent border-2 border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-white",
};

const sizeStyles: Record<CtaSize, string> = {
  default: "px-5 py-2.5 text-sm",
  large: "px-6 py-3 text-base",
};

/**
 * CTA Button - Spitfire style
 *
 * Primary: white background, black text (Spitfire default)
 * Secondary: transparent with brand color border
 *
 * @example
 * // Primary CTA (Spitfire style)
 * <CtaButton variant="white" href="/sign-up" size="large">
 *   Get Started
 * </CtaButton>
 *
 * @example
 * // Brand colored CTA
 * <CtaButton variant="indigo" href="/dashboard">
 *   Open Dashboard
 * </CtaButton>
 */
export function CtaButton({
  variant,
  size = "default",
  href,
  external = false,
  children,
  className,
  onClick,
}: CtaButtonProps) {
  const baseStyles = cn(
    "inline-flex items-center justify-center gap-2",
    "rounded-[var(--radius-md)] font-medium",
    "transition-colors duration-200 cursor-pointer",
    variantStyles[variant],
    sizeStyles[size],
    className
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={baseStyles}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={baseStyles} onClick={onClick}>
      {children}
    </Link>
  );
}
