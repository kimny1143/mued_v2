'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { ArrowRight, SlidersHorizontal, Settings, Upload, Plug, LogOut } from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';

export function AccountSection() {
  const { t } = useLocale();
  const { signOut } = useClerk();
  const router = useRouter();
  const hub = t.muednote.dashboardHub;

  const handleSignOut = async () => {
    try { await signOut(); } catch {}
    router.push('/');
  };

  // ★The portal row is unconditional. /dashboard/plugins renders its own "not on your shelf yet"
  // section for the live free modules (lib/plugins/portal.ts buildAvailableItems), so a signed-in
  // user who owns nothing still lands somewhere useful — and gating the row on entitlements would
  // cost a DB read on every dashboard render while hiding the only in-product path to the free
  // plugins from exactly the people who have none. Listed first because it is a destination; the
  // three below are configuration.
  const links = [
    { label: hub.account.plugins,  href: '/dashboard/plugins',  icon: SlidersHorizontal },
    { label: hub.account.settings, href: '/dashboard/settings', icon: Settings },
    { label: hub.account.import,   href: '/dashboard/import',   icon: Upload  },
    { label: hub.account.mcp,      href: '/dashboard/settings/mcp', icon: Plug },
  ];

  return (
    <section className="mb-10">
      <h2 className="dashboard-section-title">{hub.account.title}</h2>

      <div className="border-t border-white/[0.08]">
        {links.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3 border-b border-white/[0.04] py-3 pl-1 hover:bg-white/[0.025] transition-colors"
          >
            <Icon className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
            <span className="flex-1 text-sm text-white/70 group-hover:text-white transition-colors">
              {label}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0 mr-1" />
          </Link>
        ))}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="group flex w-full items-center gap-3 border-b border-white/[0.04] py-3 pl-1 hover:bg-white/[0.025] transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
          <span className="flex-1 text-left text-sm text-white/70 group-hover:text-white transition-colors">
            {hub.account.signOut}
          </span>
        </button>
      </div>
    </section>
  );
}
