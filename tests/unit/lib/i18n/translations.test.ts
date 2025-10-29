/**
 * Internationalization (i18n) Tests
 * Phase 2: Multi-language support testing
 */

import { describe, it, expect } from 'vitest';
import { translations, type Locale } from '@/lib/i18n/translations';

describe('i18n Translations', () => {
  describe('Supported Locales', () => {
    it('should support English and Japanese locales', () => {
      expect(translations).toHaveProperty('en');
      expect(translations).toHaveProperty('ja');
    });

    it('should have the same structure for both locales', () => {
      const enKeys = Object.keys(translations.en);
      const jaKeys = Object.keys(translations.ja);

      expect(enKeys).toEqual(jaKeys);
    });
  });

  describe('Common Translations', () => {
    it('should have common UI strings in English', () => {
      const { common } = translations.en;

      expect(common.loading).toBe('Loading...');
      expect(common.error).toBe('Error');
      expect(common.save).toBe('Save');
      expect(common.cancel).toBe('Cancel');
      expect(common.delete).toBe('Delete');
    });

    it('should have common UI strings in Japanese', () => {
      const { common } = translations.ja;

      expect(common.loading).toBe('読み込み中...');
      expect(common.error).toBe('エラー');
      expect(common.save).toBe('保存');
      expect(common.cancel).toBe('キャンセル');
      expect(common.delete).toBe('削除');
    });

    it('should have all common keys in both locales', () => {
      const enCommonKeys = Object.keys(translations.en.common);
      const jaCommonKeys = Object.keys(translations.ja.common);

      expect(enCommonKeys).toEqual(jaCommonKeys);
    });
  });

  describe('Navigation Translations', () => {
    it('should have navigation menu items', () => {
      const { nav } = translations.en;

      expect(nav.dashboard).toBe('Dashboard');
      expect(nav.lessons).toBe('Lessons');
      expect(nav.materials).toBe('Materials');
      expect(nav.library).toBe('Library');
      expect(nav.admin).toBe('Admin');
      expect(nav.settings).toBe('Settings');
      expect(nav.signOut).toBe('Sign Out');
    });

    it('should have Japanese navigation translations', () => {
      const { nav } = translations.ja;

      expect(nav.dashboard).toBe('ダッシュボード');
      expect(nav.lessons).toBe('レッスン');
      expect(nav.materials).toBe('教材');
      expect(nav.library).toBe('ライブラリ');
      expect(nav.admin).toBe('管理');
    });
  });

  describe('RAG Metrics Dashboard', () => {
    it('should have RAG metrics translations in English', () => {
      const { ragMetrics } = translations.en;

      expect(ragMetrics.title).toBe('RAG Metrics Dashboard');
      expect(ragMetrics.subtitle).toContain('AI dialogue performance');
      expect(ragMetrics.sloStatus.title).toBe('SLO Status Overview');
      expect(ragMetrics.sloStatus.citationRate).toBe('Citation Rate');
      expect(ragMetrics.sloStatus.latency).toBe('Latency (P50)');
      expect(ragMetrics.sloStatus.cost).toBe('Cost per Answer');
    });

    it('should have RAG metrics translations in Japanese', () => {
      const { ragMetrics } = translations.ja;

      expect(ragMetrics.title).toBe('RAGメトリクスダッシュボード');
      expect(ragMetrics.subtitle).toContain('AI対話のパフォーマンス');
      expect(ragMetrics.sloStatus.title).toBe('SLOステータス概要');
      expect(ragMetrics.sloStatus.citationRate).toBe('引用率');
      expect(ragMetrics.sloStatus.latency).toBe('レイテンシ（P50）');
    });

    it('should have current metrics section', () => {
      const { currentMetrics } = translations.en.ragMetrics;

      expect(currentMetrics.title).toBe('Current Metrics Overview');
      expect(currentMetrics.totalQueries).toBe('Total Queries');
      expect(currentMetrics.avgCitationRate).toBe('Avg Citation Rate');
      expect(currentMetrics.avgLatency).toBe('Avg Latency (P50)');
      expect(currentMetrics.avgCost).toBe('Avg Cost per Answer');
    });

    it('should have historical trends section', () => {
      const { historical } = translations.en.ragMetrics;

      expect(historical.title).toBe('Historical Trends');
      expect(historical.citationRateChart).toBe('Citation Rate Over Time');
      expect(historical.latencyChart).toBe('Latency Over Time');
      expect(historical.costChart).toContain('Cost per Answer');
    });
  });

  describe('Plugin Management', () => {
    it('should have plugin management translations in English', () => {
      const { plugins } = translations.en;

      expect(plugins.title).toBe('Plugin Management');
      expect(plugins.subtitle).toContain('content source plugins');
      expect(plugins.registered).toBe('Registered Plugins');
      expect(plugins.status.active).toBe('Active');
      expect(plugins.status.inactive).toBe('Inactive');
      expect(plugins.status.healthy).toBe('Healthy');
    });

    it('should have plugin management translations in Japanese', () => {
      const { plugins } = translations.ja;

      expect(plugins.title).toBe('プラグイン管理');
      expect(plugins.subtitle).toContain('コンテンツソースプラグイン');
      expect(plugins.registered).toBe('登録済みプラグイン');
      expect(plugins.status.active).toBe('有効');
      expect(plugins.status.inactive).toBe('無効');
      expect(plugins.status.healthy).toBe('正常');
    });

    it('should have plugin actions translations', () => {
      const { actions } = translations.en.plugins;

      expect(actions.enable).toBe('Enable');
      expect(actions.disable).toBe('Disable');
      expect(actions.checkHealth).toBe('Check Health');
      expect(actions.configure).toBe('Configure');
    });

    it('should have plugin capabilities translations', () => {
      const { capabilities } = translations.en.plugins;

      expect(capabilities.title).toBe('Capabilities');
      expect(capabilities.list).toBe('List Content');
      expect(capabilities.search).toBe('Search');
      expect(capabilities.filter).toBe('Filter');
      expect(capabilities.fetch).toBe('Fetch Individual Items');
      expect(capabilities.transform).toBe('Transform Content');
    });
  });

  describe('Dashboard Translations', () => {
    it('should have dashboard welcome messages', () => {
      expect(translations.en.dashboard.welcome).toBe('Welcome back,');
      expect(translations.ja.dashboard.welcome).toBe('おかえりなさい、');
    });

    it('should have quick actions section', () => {
      const { quickActions } = translations.en.dashboard;

      expect(quickActions.title).toBe('Quick Actions');
      expect(quickActions.createMaterial).toBe('Create Material');
      expect(quickActions.bookLesson).toBe('Book Lesson');
      expect(quickActions.upgradePlan).toBe('Upgrade Plan');
    });

    it('should have stats section', () => {
      const { stats } = translations.en.dashboard;

      expect(stats.totalMaterials).toBe('Total Materials');
      expect(stats.totalLessons).toBe('Total Lessons');
      expect(stats.completed).toBe('Completed');
      expect(stats.inProgress).toBe('In Progress');
    });
  });

  describe('Library Page', () => {
    it('should have library page translations', () => {
      const { library } = translations.en;

      expect(library.title).toBe('Content Library');
      expect(library.subtitle).toContain('note.com');
      expect(library.loadingContent).toBe('Loading library content...');
      expect(library.errorLoading).toBe('Error loading content');
      expect(library.noContent).toBe('No content found');
    });

    it('should have Japanese library translations', () => {
      const { library } = translations.ja;

      expect(library.title).toBe('コンテンツライブラリ');
      expect(library.subtitle).toContain('note.com');
      expect(library.loadingContent).toBe('ライブラリコンテンツを読み込み中...');
    });
  });

  describe('Translation Completeness', () => {
    it('should have matching structure depth for nested objects', () => {
      // Check ragMetrics structure
      expect(Object.keys(translations.en.ragMetrics)).toEqual(
        Object.keys(translations.ja.ragMetrics)
      );

      expect(Object.keys(translations.en.ragMetrics.sloStatus)).toEqual(
        Object.keys(translations.ja.ragMetrics.sloStatus)
      );

      expect(Object.keys(translations.en.ragMetrics.currentMetrics)).toEqual(
        Object.keys(translations.ja.ragMetrics.currentMetrics)
      );
    });

    it('should not have empty or placeholder strings', () => {
      const checkForEmptyStrings = (obj: any, path: string = ''): void => {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;

          if (typeof value === 'string') {
            expect(value.trim(), `Empty string at ${currentPath}`).not.toBe('');
            expect(value, `Placeholder at ${currentPath}`).not.toMatch(/TODO|TBD|xxx/i);
          } else if (typeof value === 'object' && value !== null) {
            checkForEmptyStrings(value, currentPath);
          }
        }
      };

      checkForEmptyStrings(translations.en);
      checkForEmptyStrings(translations.ja);
    });

    it('should have consistent array lengths for lists', () => {
      // Check subscription plans features
      const enFreemium = translations.en.subscription.plans.freemium.features;
      const jaFreemium = translations.ja.subscription.plans.freemium.features;
      expect(enFreemium.length).toBe(jaFreemium.length);

      const enPremium = translations.en.subscription.plans.premium.features;
      const jaPremium = translations.ja.subscription.plans.premium.features;
      expect(enPremium.length).toBe(jaPremium.length);
    });
  });

  describe('Type Safety', () => {
    it('should have correct TypeScript types', () => {
      type Keys = keyof typeof translations;
      const locales: Keys[] = ['en', 'ja'];

      locales.forEach((locale) => {
        expect(translations[locale]).toBeDefined();
        expect(translations[locale].common).toBeDefined();
        expect(translations[locale].nav).toBeDefined();
      });
    });

    it('should maintain type consistency across locales', () => {
      // If TypeScript compiles, types are consistent
      // This test ensures runtime structure matches type definitions
      const enStructure = JSON.stringify(Object.keys(translations.en).sort());
      const jaStructure = JSON.stringify(Object.keys(translations.ja).sort());

      expect(enStructure).toBe(jaStructure);
    });
  });

  describe('Special Characters and Formatting', () => {
    it('should handle emoji in translations', () => {
      expect(translations.en.lessons.tabs.aiMatching).toContain('✨');
      expect(translations.ja.lessons.tabs.aiMatching).toContain('✨');

      expect(translations.en.materials.title).toContain('🎵');
      expect(translations.ja.materials.title).toContain('🎵');
    });

    it('should handle currency symbols correctly', () => {
      expect(translations.en.landing.pricing.basic.price).toBe('¥2,980');
      expect(translations.ja.landing.pricing.basic.price).toBe('¥2,980');

      expect(translations.en.landing.pricing.premium.price).toBe('¥5,980');
      expect(translations.ja.landing.pricing.premium.price).toBe('¥5,980');
    });

    it('should preserve punctuation in sentences', () => {
      const enLoading = translations.en.common.loading;
      expect(enLoading).toMatch(/\.{3}$/); // ends with ...

      const jaLoading = translations.ja.common.loading;
      expect(jaLoading).toMatch(/\.{3}$/); // ends with ...
    });
  });

  describe('Feature-Specific Translations', () => {
    describe('Lesson Booking', () => {
      it('should have lesson status translations', () => {
        const { slots } = translations.en.lessons;

        expect(slots.reserved).toBe('✓ Reserved');
        expect(slots.pending).toBe('⏳ Pending');
        expect(slots.bookNow).toBe('Book Now');
      });

      it('should have AI matching section', () => {
        const { aiMatching } = translations.en.lessons;

        expect(aiMatching.title).toBe('AI Mentor Matching');
        expect(aiMatching.perfectMatches).toBe('Perfect Matches');
        expect(aiMatching.recommendedMentors).toBe('Recommended Mentors');
      });
    });

    describe('Subscription Plans', () => {
      it('should have all plan tiers', () => {
        const { plans } = translations.en.subscription;

        expect(plans.freemium.name).toBe('Freemium');
        expect(plans.starter.name).toBe('Starter');
        expect(plans.basic.name).toBe('Basic');
        expect(plans.premium.name).toBe('Premium');
      });

      it('should have FAQ section', () => {
        const { faq } = translations.en.subscription;

        expect(faq.title).toBe('Frequently Asked Questions');
        expect(faq.q1).toContain('cancel');
        expect(faq.a1).toContain('anytime');
      });
    });
  });

  describe('Fallback Behavior', () => {
    it('should have English as default locale', () => {
      // English should be complete enough to serve as fallback
      const requiredSections = [
        'common',
        'nav',
        'ragMetrics',
        'plugins',
        'dashboard',
        'library',
      ];

      requiredSections.forEach((section) => {
        expect(translations.en).toHaveProperty(section);
      });
    });
  });
});
