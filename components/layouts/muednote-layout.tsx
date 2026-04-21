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
      className="min-h-screen flex flex-col bg-[#0a0a0a]"
      style={{ fontFamily: 'var(--font-sora, var(--font-geist-sans)), system-ui, sans-serif' }}
    >
      <MuednoteHeader />
      <main className="flex-1 container mx-auto px-6 py-8">
        {children}
      </main>
      <footer className="bg-[#0a0a0a] py-6 border-t border-white/10">
        <div className="container mx-auto px-6 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} MUED by glasswerks. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
