/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: {
    readonly SUPABASE_URL: string;
    readonly VITE_API_URL: string;
    readonly STRIPE_PUBLIC_KEY: string;
    readonly MODE: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly SSR: boolean;
    readonly [key: string]: string | boolean;
  }
} 