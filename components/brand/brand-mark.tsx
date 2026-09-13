import Image from "next/image";
import { cn } from "@/lib/utils";

/** Shared identity for the showroom, product pages and working studio. */
export function BrandMark({
  product = "MUED",
  compact = false,
  className,
}: {
  product?: string;
  compact?: boolean;
  className?: string;
}) {
  const suffix = product.startsWith("MUED") ? product.slice(4) : "";
  return (
    <span
      className={cn("brand-mark", compact && "brand-mark-compact", className)}
    >
      <Image src="/hoo-animated.svg" width={44} height={28} alt="" />
      <span>
        MUED<span className="brand-mark-accent">{suffix || "."}</span>
      </span>
    </span>
  );
}
