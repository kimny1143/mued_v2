"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Header() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  return (
    <header className="bg-white border-b border-[var(--color-card-border)] sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[var(--color-brand-green)]">✱</span>
            <span className="text-xl font-bold text-[var(--color-text-primary)]">MUED</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <div
              className="relative"
              onMouseEnter={() => setActiveMenu("dashboard")}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-card-bg)] rounded-[var(--radius-sm)] transition-colors"
              >
                Dashboard ▾
              </Link>
            </div>

            <div
              className="relative"
              onMouseEnter={() => setActiveMenu("lessons")}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <Link
                href="/dashboard/lessons"
                className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-card-bg)] rounded-[var(--radius-sm)] transition-colors"
              >
                Lessons ▾
              </Link>
            </div>

            <div
              className="relative"
              onMouseEnter={() => setActiveMenu("materials")}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <Link
                href="/dashboard/materials"
                className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-card-bg)] rounded-[var(--radius-sm)] transition-colors"
              >
                Materials ▾
              </Link>
            </div>

          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm">
              Download app
            </Button>
            <Button variant="outline" size="sm">
              Log in
            </Button>
            <Button variant="primary" size="sm">
              Try it free
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
