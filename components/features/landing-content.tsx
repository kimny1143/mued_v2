'use client';

import Link from 'next/link';
import { useLocale } from '@/lib/i18n/locale-context';

export function LandingContent() {
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">MUED LMS</h1>
          <div className="flex gap-4">
            <Link
              href="/sign-in"
              className="text-gray-700 px-4 py-2 hover:text-blue-600 transition"
            >
              {t.landing.hero.login}
            </Link>
            <Link
              href="/sign-up"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {t.landing.hero.getStarted}
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            {t.landing.hero.title}
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            {t.landing.hero.subtitle}
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/sign-up"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg hover:bg-blue-700 transition"
            >
              {t.landing.hero.cta}
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🎵</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">{t.landing.features.scheduling.title}</h3>
            <p className="text-gray-600">
              {t.landing.features.scheduling.description}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📚</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">{t.landing.features.library.title}</h3>
            <p className="text-gray-600">
              {t.landing.features.library.description}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">{t.landing.features.communication.title}</h3>
            <p className="text-gray-600">
              {t.landing.features.communication.description}
            </p>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-center mb-12">{t.landing.pricing.title}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-md border-2 border-gray-200">
              <h3 className="text-xl font-semibold mb-2">{t.landing.pricing.free.name}</h3>
              <p className="text-3xl font-bold mb-4">
                {t.landing.pricing.free.price}
                <span className="text-sm font-normal">{t.landing.pricing.free.perMonth}</span>
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                {t.landing.pricing.free.features.map((feature, idx) => (
                  <li key={idx}>✓ {feature}</li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className="block text-center bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                {t.landing.pricing.free.cta}
              </Link>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md border-2 border-blue-500">
              <h3 className="text-xl font-semibold mb-2">{t.landing.pricing.basic.name}</h3>
              <p className="text-3xl font-bold mb-4">
                {t.landing.pricing.basic.price}
                <span className="text-sm font-normal">{t.landing.pricing.basic.perMonth}</span>
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                {t.landing.pricing.basic.features.map((feature, idx) => (
                  <li key={idx}>✓ {feature}</li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className="block text-center bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                {t.landing.pricing.basic.cta}
              </Link>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md border-2 border-purple-500">
              <h3 className="text-xl font-semibold mb-2">{t.landing.pricing.premium.name}</h3>
              <p className="text-3xl font-bold mb-4">
                {t.landing.pricing.premium.price}
                <span className="text-sm font-normal">{t.landing.pricing.premium.perMonth}</span>
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                {t.landing.pricing.premium.features.map((feature, idx) => (
                  <li key={idx}>✓ {feature}</li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className="block text-center bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
              >
                {t.landing.pricing.premium.cta}
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 mt-24 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>{t.landing.footer.copyright}</p>
        </div>
      </footer>
    </div>
  );
}
