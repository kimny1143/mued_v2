"use client";

import { useUser } from "@clerk/nextjs";

export function UserAvatar() {
  const { user } = useUser();

  if (!user) return null;

  const initial = (
    user.firstName?.[0] ||
    user.username?.[0] ||
    user.emailAddresses?.[0]?.emailAddress?.[0] ||
    "U"
  ).toUpperCase();

  const displayName =
    user.firstName ||
    user.username ||
    user.emailAddresses?.[0]?.emailAddress ||
    "ユーザー";

  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-12 h-12 rounded-full bg-[var(--color-brand-green)] flex items-center justify-center text-white text-lg font-bold">
        {initial}
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          {displayName}
        </p>
        <p className="text-xs text-gray-500">
          {user.emailAddresses?.[0]?.emailAddress}
        </p>
      </div>
    </div>
  );
}
