import Link from "next/link";

/**
 * One line from one paid MUEDsp product's page to the other (masterchain ⇄ MUEDvox), the same shape both ways:
 * the other product's own approved line, then a link. ★No copy of its own beyond the link label.
 * ★`?from=`, not utm_* — an internal link must not start a new GA4 source (same rule as MUEDlim → masterchain).
 */
export function RelatedProductLine({ line, href, label, testId }: { line: string; href: string; label: string; testId: string }) {
  return (
    <p data-testid={testId} className="mt-10 border-t border-white/8 pt-6 text-[15px] leading-relaxed text-white/70">
      {line}{" "}
      <Link href={href} className="font-medium text-[#f5a524] transition-colors hover:text-[#ffc35a]">
        {label} →
      </Link>
    </p>
  );
}
