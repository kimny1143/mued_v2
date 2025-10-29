/**
 * Lighthouse Performance Configuration
 * Phase 2: Performance benchmarks for new features
 */

module.exports = {
  extends: 'lighthouse:default',
  settings: {
    // Test Phase 2 pages
    urls: [
      'http://localhost:3000/admin/rag-metrics',
      'http://localhost:3000/admin/plugins',
      'http://localhost:3000/library',
    ],

    // Performance thresholds
    assertions: {
      // Core Web Vitals
      'first-contentful-paint': ['error', { maxNumericValue: 2000 }], // 2s
      'largest-contentful-paint': ['error', { maxNumericValue: 2500 }], // 2.5s
      'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      'total-blocking-time': ['error', { maxNumericValue: 300 }], // 300ms
      'speed-index': ['error', { maxNumericValue: 3000 }], // 3s

      // Scores
      'categories:performance': ['error', { minScore: 0.9 }], // 90+
      'categories:accessibility': ['error', { minScore: 0.9 }], // 90+
      'categories:best-practices': ['error', { minScore: 0.9 }], // 90+
      'categories:seo': ['error', { minScore: 0.9 }], // 90+

      // Network
      'uses-http2': 'error',
      'uses-long-cache-ttl': 'warn',
      'efficient-animated-content': 'warn',

      // JavaScript
      'bootup-time': ['warn', { maxNumericValue: 3500 }],
      'mainthread-work-breakdown': ['warn', { maxNumericValue: 4000 }],
      'unused-javascript': 'warn',

      // Images
      'uses-optimized-images': 'error',
      'modern-image-formats': 'warn',
      'uses-responsive-images': 'error',
    },
  },
};
