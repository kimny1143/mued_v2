import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Hover effect intensity
   * @default true
   */
  hover?: boolean;
}

/**
 * Glassmorphism card component for MUED dark mode design
 *
 * Usage:
 * ```tsx
 * <GlassCard>Content here</GlassCard>
 * <GlassCard hover={false}>No hover effect</GlassCard>
 * ```
 */
const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, hover = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base glassmorphism styles
          "bg-bg-elev-1 border border-border-default rounded-[var(--radius-md)] p-6",
          // Hover effect
          hover && "transition-colors hover:bg-bg-elev-2",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = "GlassCard";

export { GlassCard };
