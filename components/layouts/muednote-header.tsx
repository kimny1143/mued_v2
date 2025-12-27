"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";

/**
 * MUEDnote Header
 *
 * Simplified header for MUEDnote dashboard
 * - MUEDnote branding (not LMS)
 * - No subscription info (handled separately)
 */
export function MuednoteHeader() {
  const router = useRouter();
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header className="bg-[#0F0F1A] border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard/muednote" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600/20 rounded-lg flex items-center justify-center">
              <Mic className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-xl font-bold text-white">MUEDnote</span>
          </Link>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-slate-400 hover:text-white hover:bg-white/10"
            >
              ログアウト
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
