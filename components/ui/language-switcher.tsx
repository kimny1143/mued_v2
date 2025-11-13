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
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Switch language"
      data-testid="language-switcher"
    >
      <Languages className="w-4 h-4" />
      {mounted && <span>{locale === 'en' ? 'EN' : '日本語'}</span>}
    </button>
  );
}
