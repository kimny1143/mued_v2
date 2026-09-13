import { ReactNode } from "react";
import { MuednoteHeader } from "./muednote-header";

interface MuednoteLayoutProps {
  children: ReactNode;
}

/**
 * MUEDnote Dashboard Layout
 *
 * Server Component shell — keeps client JS minimal.
 * Interactive parts (sign out, language switcher) live in MuednoteHeader (client).
 */
export function MuednoteLayout({ children }: MuednoteLayoutProps) {
  return (
    <div
      className="brand-workspace min-h-screen flex flex-col"
      style={{ fontFamily: 'var(--font-sora, var(--font-geist-sans)), system-ui, sans-serif' }}
    >
      <MuednoteHeader />
      <main className="brand-workspace-main flex-1 px-5 sm:px-8 py-10">
        {children}
      </main>
      <footer className="brand-workspace-footer py-6">
        <div className="container mx-auto px-6 text-center text-fg-secondary text-sm">
          <p>&copy; {new Date().getFullYear()} MUED by glasswerks. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
