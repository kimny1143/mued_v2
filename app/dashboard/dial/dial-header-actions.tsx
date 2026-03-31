"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ArrowLeft } from "lucide-react";

export function DialHeaderActions({
  newSessionLabel,
  logOutLabel,
}: {
  newSessionLabel: string;
  logOutLabel: string;
}) {
  const router = useRouter();
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className="flex items-center gap-3">
      <Link href="/dial">
        <Button
          variant="ghost"
          size="sm"
          className="text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {newSessionLabel}
        </Button>
      </Link>
      <LanguageSwitcher />
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        className="text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
      >
        {logOutLabel}
      </Button>
    </div>
  );
}
