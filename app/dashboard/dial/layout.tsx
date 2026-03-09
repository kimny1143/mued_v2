"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { Headphones, ArrowLeft } from "lucide-react";

export default function DialDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0F0F1A]">
      <header className="bg-[#0F0F1A] border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard/dial" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-600/20 rounded-lg flex items-center justify-center">
                <Headphones className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-xl font-bold text-white">MUEDial</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/dial">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  New Session
                </Button>
              </Link>
              <LanguageSwitcher />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                Log Out
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-6 py-8">
        {children}
      </main>
      <footer className="bg-[#0F0F1A] py-6 border-t border-white/10">
        <div className="container mx-auto px-6 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} MUEDial. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
