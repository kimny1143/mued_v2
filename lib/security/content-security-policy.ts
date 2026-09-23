// FastSpring masterchain popup checkout sources, measured 2026-09-23.
// Iframe-internal loads are governed by FastSpring's CSP, not ours.
export function contentSecurityPolicy(opts: { isProduction: boolean }): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${!opts.isProduction ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com https://*.clerk.accounts.dev https://clerk.mued.jp https://challenges.cloudflare.com https://va.vercel-scripts.com https://d1f8f9xcsvx3ha.cloudfront.net`,
    "style-src 'self' 'unsafe-inline' https://d1f8f9xcsvx3ha.cloudfront.net",
    "img-src 'self' data: blob: https://img.clerk.com https://*.clerk.com https://sbl.onfastspring.com",
    "font-src 'self' data:",
    "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://*.clerk.accounts.dev https://clerk.mued.jp https://api.clerk.com https://tonn.roexaudio.com https://muedial-upload-proxy.glasswerkskimny.workers.dev https://muedial-r2.glasswerkskimny.workers.dev https://mued-videos-cdn.glasswerkskimny.workers.dev https://vitals.vercel-insights.com https://va.vercel-scripts.com https://*.sentry.io https://*.onfastspring.com",
    "frame-src https://challenges.cloudflare.com https://*.clerk.accounts.dev https://clerk.mued.jp https://*.onfastspring.com",
    "worker-src 'self' blob:",
    "media-src 'self' blob: https://muedial-r2.glasswerkskimny.workers.dev https://mued-videos-cdn.glasswerkskimny.workers.dev",
  ].join('; ');
}
