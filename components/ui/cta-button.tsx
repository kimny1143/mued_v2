"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type CtaVariant = "indigo" | "amber";

interface CtaButtonProps {
  /** Color variant: indigo (MUEDnote) or amber (MUEDear) */
  variant: CtaVariant;
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
  indigo: "border-indigo-500 text-indigo-400 hover:bg-indigo-500 hover:text-white",
  amber: "border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-white",
};

/**
 * CTA Button - Plugin Alliance style (outline + fill on hover)
 *
 * Consistent button design across all landing pages:
 * - Transparent background with brand color border
 * - Brand color text
 * - On hover: brand color background + white text
 *
 * @example
 * // Internal link (MUEDnote)
 * <CtaButton variant="indigo" href="/sign-up">
 *   Get Started <ArrowRight />
 * </CtaButton>
 *
 * @example
 * // External link (MUEDear App Store)
 * <CtaButton variant="amber" href={APP_STORE_URL} external>
 *   <Apple /> Download
 * </CtaButton>
 */
export function CtaButton({
  variant,
  href,
  external = false,
  children,
  className,
  onClick,
}: CtaButtonProps) {
  const baseStyles = cn(
    "group inline-flex items-center justify-center gap-2",
    "bg-transparent border-2",
    "px-8 py-4 rounded-[var(--radius-md)] text-lg font-medium",
    "transition-all duration-300",
    variantStyles[variant],
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
