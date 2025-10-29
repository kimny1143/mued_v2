"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

interface UsageLimits {
  tier: string;
  aiMaterialsLimit: number;
  aiMaterialsUsed: number;
  reservationsLimit: number;
  reservationsUsed: number;
}

export function Header() {
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const router = useRouter();
  const { signOut } = useClerk();

  useEffect(() => {
    fetchUsageLimits();
  }, []);

  const fetchUsageLimits = async () => {
    try {
      const response = await fetch('/api/subscription/limits');
      const data = await response.json();
      if (data.success) {
        setLimits(data.limits);
      }
    } catch (error) {
      console.error('Failed to fetch limits:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header className="bg-white border-b border-[var(--color-card-border)] sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[var(--color-brand-green)]">✱</span>
            <span className="text-xl font-bold text-[var(--color-text-primary)]">MUED</span>
          </Link>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {limits && (
              <Link href="/dashboard/subscription">
                <div className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  limits.tier === 'freemium'
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : limits.tier === 'starter'
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : limits.tier === 'basic'
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : limits.tier === 'premium'
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                  {limits.tier.charAt(0).toUpperCase() + limits.tier.slice(1)} Plan
                </div>
              </Link>
            )}
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Log Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
