/* eslint-disable no-restricted-globals */
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// API cache configuration
const API_CACHE_NAME = 'api-cache-v1';
const API_CACHE_MAX_ENTRIES = 100;
const API_CACHE_MAX_AGE_SECONDS = 5 * 60; // 5分

// Cache API responses with NetworkFirst strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: API_CACHE_NAME,
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: API_CACHE_MAX_ENTRIES,
        maxAgeSeconds: API_CACHE_MAX_AGE_SECONDS,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Cache images with StaleWhileRevalidate strategy
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30日
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Skip waiting and claim clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => !cacheName.includes('workbox'))
          .filter((cacheName) => cacheName !== API_CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
      
      // Take control of all clients
      await self.clients.claim();
    })()
  );
});

// Background sync for offline support
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-api-data') {
    event.waitUntil(
      (async () => {
        // Re-fetch critical API data when online
        const cache = await caches.open(API_CACHE_NAME);
        const requests = [
          '/api/lesson-slots?viewMode=all',
          '/api/lesson-slots?viewMode=own',
          '/api/my-reservations',
        ];
        
        for (const url of requests) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
            }
          } catch (error) {
            console.error(`Failed to sync ${url}:`, error);
          }
        }
      })()
    );
  }
});

export {};