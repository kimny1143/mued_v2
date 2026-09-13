"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackCtaClick } from "@/lib/analytics/gtag";

export function ProductLink({
  href,
  product,
  location,
  external = false,
  preview = false,
  className,
  children,
}: {
  href: string;
  product: string;
  location: string;
  external?: boolean;
  preview?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const onClick = () => {
    if (!preview)
      trackCtaClick(
        product,
        location,
        external ? "app_store" : "internal_page",
      );
  };
  return external ? (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
