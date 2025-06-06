/// <reference lib="webworker" />

// Service Worker TypeScript definitions for MUED LMS PWA

declare module 'workbox-core' {
  export function clientsClaim(): void;
  export function skipWaiting(): void;
}

declare module 'workbox-precaching' {
  export function precacheAndRoute(entries: Array<string | { url: string; revision?: string }>): void;
  export function createHandlerBoundToURL(url: string): any;
  export function cleanupOutdatedCaches(): void;
}

declare module 'workbox-routing' {
  export function registerRoute(
    match: string | RegExp | ((params: { url: URL; request: Request; event: FetchEvent }) => boolean),
    handler: any,
    method?: string
  ): void;
}

declare module 'workbox-strategies' {
  export class StaleWhileRevalidate {
    constructor(options?: {
      cacheName?: string;
      plugins?: any[];
      fetchOptions?: RequestInit;
      matchOptions?: CacheQueryOptions;
    });
  }

  export class CacheFirst {
    constructor(options?: {
      cacheName?: string;
      plugins?: any[];
      fetchOptions?: RequestInit;
      matchOptions?: CacheQueryOptions;
    });
  }

  export class NetworkFirst {
    constructor(options?: {
      cacheName?: string;
      plugins?: any[];
      fetchOptions?: RequestInit;
      matchOptions?: CacheQueryOptions;
      networkTimeoutSeconds?: number;
    });
  }

  export class NetworkOnly {
    constructor(options?: {
      plugins?: any[];
      fetchOptions?: RequestInit;
    });
  }

  export class CacheOnly {
    constructor(options?: {
      cacheName?: string;
      plugins?: any[];
      matchOptions?: CacheQueryOptions;
    });
  }
}

declare module 'workbox-expiration' {
  export class ExpirationPlugin {
    constructor(config: {
      maxEntries?: number;
      maxAgeSeconds?: number;
      purgeOnQuotaError?: boolean;
    });
  }
}

declare module 'workbox-cacheable-response' {
  export class CacheableResponsePlugin {
    constructor(config: {
      statuses?: number[];
      headers?: { [headerName: string]: string };
    });
  }
}

declare module 'workbox-background-sync' {
  export class BackgroundSyncPlugin {
    constructor(name: string, options?: {
      maxRetentionTime?: number;
    });
  }
}

// Extend the ServiceWorkerGlobalScope
interface ServiceWorkerGlobalScope {
  __WB_MANIFEST: Array<{ url: string; revision?: string }>;
}

// Extend Window interface for PWA features
interface Window {
  workbox?: {
    addEventListener(type: string, callback: (event: any) => void): void;
    register(): void;
    messageSkipWaiting(): void;
  };
}

// PWA installation prompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Extend WindowEventMap
interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
}

// Share target types
interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

// Navigator extensions for PWA
interface Navigator {
  share?(data: ShareData): Promise<void>;
  canShare?(data: ShareData): boolean;
  clearAppBadge?(): Promise<void>;
  setAppBadge?(count?: number): Promise<void>;
}

// Push notification types
interface PushSubscriptionOptions {
  userVisibleOnly?: boolean;
  applicationServerKey?: BufferSource | string | null;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface NotificationOptions {
  actions?: NotificationAction[];
  badge?: string;
  body?: string;
  data?: any;
  dir?: 'auto' | 'ltr' | 'rtl';
  icon?: string;
  image?: string;
  lang?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  timestamp?: number;
  vibrate?: number | number[];
}