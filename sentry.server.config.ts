/**
 * Sentry Server-Side Configuration
 *
 * This configuration is used for the server-side (Node.js runtime).
 * Errors in API routes, server components, server actions, etc.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Environment
  environment: process.env.NODE_ENV,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Filter out specific errors
  ignoreErrors: [
    // Database connection errors (handled separately)
    'Connection terminated',
    'Connection refused',
  ],

  // Event preprocessing
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Sentry Event (not sent in dev):', event);
      return null;
    }

    // Filter sensitive data
    if (event.request) {
      // Remove sensitive headers
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }

      // Remove query parameters that might contain sensitive data
      if (event.request.query_string) {
        event.request.query_string = '[Filtered]';
      }
    }

    // Filter database connection strings
    if (event.exception?.values) {
      event.exception.values = event.exception.values.map((exception) => {
        if (exception.value) {
          // Remove DATABASE_URL from error messages
          exception.value = exception.value.replace(
            /postgresql:\/\/[^@]+@[^\s]+/g,
            'postgresql://[FILTERED]'
          );
        }
        return exception;
      });
    }

    return event;
  },

  // Integration with database operations
  integrations: [
    // Prisma/Drizzle integration can be added here
  ],
});
