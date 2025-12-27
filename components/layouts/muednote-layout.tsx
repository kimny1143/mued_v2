"use client";

import { ReactNode } from "react";
import { MuednoteHeader } from "./muednote-header";
import { MuednoteTabs } from "./muednote-tabs";

interface MuednoteLayoutProps {
  children: ReactNode;
}

/**
 * MUEDnote Dashboard Layout
 *
 * Dark theme layout for MUEDnote
 * - Consistent with landing page design
 * - No LMS elements
 */
export function MuednoteLayout({ children }: MuednoteLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0F0F1A]">
      <MuednoteHeader />
      <main className="flex-1 container mx-auto px-6 py-8">
        <MuednoteTabs />
        {children}
      </main>
      <footer className="bg-[#0F0F1A] py-6 border-t border-white/10">
        <div className="container mx-auto px-6 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} MUEDnote. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
