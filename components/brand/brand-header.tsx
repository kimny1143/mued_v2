import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "./brand-mark";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";

export function BrandHeader({
  locale,
  product = "MUED",
  children,
  showLanguage = true,
}: {
  locale: string;
  product?: string;
  children?: ReactNode;
  showLanguage?: boolean;
}) {
  const isJa = locale === "ja";
  return (
    <header className="brand-header">
      <div className="brand-header-inner">
        <Link
          href={`/${locale}`}
          aria-label={isJa ? "MUED ホーム" : "MUED home"}
        >
          <BrandMark product={product} />
        </Link>
        <nav
          className="brand-header-nav"
          aria-label={isJa ? "メインナビゲーション" : "Main navigation"}
        >
          <Link href={`/${locale}/muedsp`}>
            {isJa ? "プラグイン" : "Plug-ins"}
          </Link>
          <Link href={`/${locale}/muedial`}>MUEDial</Link>
          <Link href={`/${locale}/support`}>
            {isJa ? "サポート" : "Support"}
          </Link>
        </nav>
        <div className="brand-header-actions">
          {children}
          {showLanguage && <LocaleSwitcher />}
        </div>
      </div>
    </header>
  );
}
