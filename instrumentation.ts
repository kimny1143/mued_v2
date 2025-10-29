/**
 * Next.js Instrumentation File
 *
 * This file is used to initialize monitoring and observability tools.
 * It runs once when the Next.js server starts.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import and initialize Sentry for Node.js runtime
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Import and initialize Sentry for Edge runtime
    await import('./sentry.edge.config');
  }
}
