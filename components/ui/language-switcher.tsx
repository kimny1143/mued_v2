'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '@/lib/i18n/locale-context';
import { Languages } from 'lucide-react';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering locale text after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'ja' : 'en');
  };

  return (
    <button
      onClick={toggleLocale}
      className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium transition-colors text-slate-400 hover:text-white hover:bg-white/10 whitespace-nowrap"
      aria-label="Switch language"
      data-testid="language-switcher"
    >
      <Languages className="w-4 h-4 shrink-0" />
      {mounted && <span>{locale === 'en' ? 'EN' : '日本語'}</span>}
    </button>
  );
}
