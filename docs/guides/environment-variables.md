# Environment Variables Configuration Guide

**Last Updated:** 2025-10-29
**Status:** ✅ Production Ready

---

## Overview

This guide documents all environment variables required for MUED LMS v2, organized by service category with deployment-specific configurations.

---

## Environment Files

### Development
- **File:** `.env.local`
- **Usage:** Local development with hot reload
- **Git:** Ignored (in `.gitignore`)

### Testing
- **File:** `.env.test`
- **Usage:** Playwright E2E tests
- **Git:** Ignored (in `.gitignore`)

### Production (Vercel)
- **Location:** Vercel Dashboard → Project Settings → Environment Variables
- **Scope:** Production, Preview, Development

### GitHub Actions
- **Location:** GitHub Repository → Settings → Secrets and variables → Actions
- **Usage:** Batch jobs, CI/CD workflows

---

## Required Environment Variables

### 1. Authentication (Clerk)

#### Public Variables
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

#### Secret Variables
```env
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
```

**Deployment Notes:**
- Production: Replace `pk_test_` with `pk_live_` and `sk_test_` with `sk_live_`
- Webhook secret: Generate new secret in Clerk Dashboard for production endpoint
- All `NEXT_PUBLIC_*` variables are exposed to the browser (safe for public keys)

**Clerk Dashboard:**
- [clerk.com/dashboard](https://clerk.com/dashboard)
- Navigate to: Your App → API Keys

---

### 2. Database (Neon PostgreSQL)

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require&channel_binding=require
```

**Connection String Format:**
```
postgresql://[username]:[password]@[host]/[database]?sslmode=require&channel_binding=require
```

**Deployment Notes:**
- Production: Use Neon production database (separate from development)
- Pooler: Recommended for serverless environments
- SSL Mode: Always `require` in production
- Connection Pooling: Neon automatically handles pooling with `-pooler` endpoint

**Neon Dashboard:**
- [console.neon.tech](https://console.neon.tech/)
- Navigate to: Project → Connection Details → Connection String

**Security:**
- Never commit DATABASE_URL to Git
- Rotate credentials if exposed
- Use read-only replicas for analytics queries (future)

---

### 3. Payment Processing (Stripe)

#### Public Variables
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PRICE_STARTER=price_...
NEXT_PUBLIC_STRIPE_PRICE_BASIC=price_...
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM=price_...
```

#### Secret Variables
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Deployment Notes:**
- Production: Replace `pk_test_` with `pk_live_` and `sk_test_` with `sk_live_`
- Price IDs: Create separate product prices for production in Stripe Dashboard
- Webhook secret: Generate new endpoint secret for production URL
- Webhook endpoint: `https://your-domain.com/api/webhooks/stripe`

**Stripe Dashboard:**
- [dashboard.stripe.com](https://dashboard.stripe.com/)
- Navigate to: Developers → API Keys (for keys)
- Navigate to: Developers → Webhooks (for webhook secrets)

**Required Webhook Events:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

### 4. AI Services (OpenAI)

```env
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=1000
```

**Model Recommendations:**
- **Development:** `gpt-4o-mini` (cost-effective)
- **Production:** `gpt-4o` (higher quality, higher cost)
- **Budget-conscious:** `gpt-4o-mini` (acceptable quality, lower cost)

**Deployment Notes:**
- Use separate API keys for development and production
- Monitor usage in OpenAI Dashboard to avoid unexpected costs
- MAX_TOKENS: 1000 is recommended for dialogue responses

**OpenAI Dashboard:**
- [platform.openai.com](https://platform.openai.com/)
- Navigate to: API → API Keys

**Cost Monitoring:**
- Set up usage limits in OpenAI Dashboard
- Monitor daily costs via OpenAI API
- Track per-user usage in `ai_dialogue_log` table

---

### 5. Email Service (Resend)

```env
RESEND_API_KEY=re_...
EMAIL_FROM=MUED <noreply@mued.jp>
EMAIL_SUPPORT=support@mued.jp
```

**Deployment Notes:**
- Production: Create separate API key for production domain
- Domain verification: Add DNS records in domain provider
- Sender email: Configure verified domain or use `onboarding@resend.dev` for testing
- `EMAIL_FROM`: Default sender address (format: `Name <email>`)
- `EMAIL_SUPPORT`: Support email shown in email footers

**Resend Dashboard:**
- [resend.com/dashboard](https://resend.com/dashboard)
- Navigate to: API Keys

**Email Templates Used:**
- Welcome email (user signup)
- Subscription confirmation
- Payment receipt
- Password reset (handled by Clerk)
- **Reservation confirmation** (student + mentor)
- **Payment completed** notification
- **Cancellation** notification
- **Lesson reminder** (24h/1h before)

---

### 6. Error Monitoring (Sentry)

```env
SENTRY_DSN=https://...@o...ingest.sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@o...ingest.sentry.io/...
```

**Deployment Notes:**
- Both variables should have the same DSN value
- `NEXT_PUBLIC_*` is for client-side error tracking
- `SENTRY_DSN` is for server-side error tracking
- Optional: Set `SENTRY_IGNORE_API_RESOLUTION_ERROR=1` if getting resolution errors

**Sentry Dashboard:**
- [sentry.io](https://sentry.io/)
- Navigate to: Project → Settings → Client Keys (DSN)

**Configuration Files:**
- `sentry.client.config.ts` - Client-side monitoring
- `sentry.server.config.ts` - Server-side monitoring
- `sentry.edge.config.ts` - Edge runtime monitoring

**Free Tier Limits:**
- 5,000 errors/month
- 10,000 performance units/month
- Upgrade if exceeded or adjust sampling rates

---

### 7. Analytics (Vercel)

**No environment variables required!**

Vercel Analytics and Speed Insights are automatically enabled when:
1. `@vercel/analytics` and `@vercel/speed-insights` packages are installed
2. Components are added to `app/layout.tsx`
3. Project is deployed on Vercel

**Setup:**
```typescript
// app/layout.tsx
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

**Vercel Dashboard:**
- [vercel.com/dashboard](https://vercel.com/dashboard)
- Navigate to: Project → Analytics

---

### 8. Design Integration (Figma)

```env
FIGMA_ACCESS_TOKEN=figd_...
```

**Deployment Notes:**
- Development only: Not required in production
- Used for Figma MCP server integration
- Personal access token from Figma account settings

**Figma Settings:**
- [figma.com/settings](https://www.figma.com/settings)
- Navigate to: Account → Personal Access Tokens

---

### 9. Application URLs

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Deployment Notes:**
- Development: `http://localhost:3000`
- Production: `https://your-production-domain.com`
- Used for:
  - Webhook callbacks
  - Email link generation
  - OAuth redirects
  - Sitemap generation

---

## Environment-Specific Configuration

### Development (.env.local)

```env
# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Database
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require

# Payments (Test Mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PRICE_STARTER=price_...
NEXT_PUBLIC_STRIPE_PRICE_BASIC=price_...
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM=price_...

# AI
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=1000

# Email
RESEND_API_KEY=re_...

# Monitoring (Optional in Dev)
# SENTRY_DSN=https://...
# NEXT_PUBLIC_SENTRY_DSN=https://...

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Design (Optional)
FIGMA_ACCESS_TOKEN=figd_...
```

---

### Testing (.env.test)

```env
# E2E Test Mode Flag
NEXT_PUBLIC_E2E_TEST_MODE=true

# Other variables inherited from .env.local or mocked
```

---

### Production (Vercel Environment Variables)

**Required for all environments:**
| Variable | Environment | Value Type |
|----------|-------------|------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | All | Plain Text |
| `CLERK_SECRET_KEY` | All | Sensitive |
| `CLERK_WEBHOOK_SECRET` | Production | Sensitive |
| `DATABASE_URL` | All | Sensitive |
| `STRIPE_SECRET_KEY` | All | Sensitive |
| `STRIPE_WEBHOOK_SECRET` | Production | Sensitive |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | All | Plain Text |
| `NEXT_PUBLIC_STRIPE_PRICE_STARTER` | All | Plain Text |
| `NEXT_PUBLIC_STRIPE_PRICE_BASIC` | All | Plain Text |
| `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM` | All | Plain Text |
| `OPENAI_API_KEY` | All | Sensitive |
| `OPENAI_MODEL` | All | Plain Text |
| `OPENAI_MAX_TOKENS` | All | Plain Text |
| `RESEND_API_KEY` | All | Sensitive |
| `EMAIL_FROM` | All | Plain Text |
| `EMAIL_SUPPORT` | All | Plain Text |
| `SENTRY_DSN` | Production, Preview | Sensitive |
| `NEXT_PUBLIC_SENTRY_DSN` | Production, Preview | Plain Text |
| `NEXT_PUBLIC_APP_URL` | All | Plain Text |

**Value by Environment:**

- **Production:** Live keys, production database, `https://your-domain.com`
- **Preview:** Test keys, preview database, `https://preview-branch.vercel.app`
- **Development:** Test keys, development database, `http://localhost:3000`

---

### GitHub Actions Secrets

**Required for batch jobs:**

| Secret | Usage |
|--------|-------|
| `DATABASE_URL` | RAG metrics calculation job |

**Setup:**
1. Go to: GitHub Repository → Settings → Secrets and variables → Actions
2. Click: **New repository secret**
3. Add: `DATABASE_URL` with production database connection string

**Workflow Files:**
- `.github/workflows/daily-rag-metrics.yml`

---

## Security Best Practices

### ✅ DO

1. **Separate environments**
   - Use different API keys for development and production
   - Use separate databases for development, staging, and production
   - Never share production credentials

2. **Rotate credentials regularly**
   - API keys: Every 6 months
   - Database passwords: Every 3 months
   - Webhook secrets: After any exposure

3. **Use Vercel's environment variable encryption**
   - Mark sensitive variables as "Sensitive" in Vercel Dashboard
   - Encrypted at rest and in transit

4. **Monitor for exposed secrets**
   - Use GitHub's secret scanning
   - Set up alerts for exposed keys
   - Rotate immediately if exposed

5. **Limit access scope**
   - GitHub Secrets: Only accessible to workflows
   - Vercel Environment Variables: Scoped by environment
   - API Keys: Use restricted keys where possible

---

### ❌ DON'T

1. **Never commit secrets to Git**
   - Always use `.env.local` (gitignored)
   - Never commit `.env.production`
   - Use environment variables for all sensitive data

2. **Never log sensitive data**
   - Don't `console.log()` API keys or tokens
   - Don't include credentials in error messages
   - Don't send credentials to Sentry (filtered by `beforeSend`)

3. **Never expose server-side secrets to client**
   - Don't prefix server secrets with `NEXT_PUBLIC_`
   - Don't include in client-side bundles
   - Don't send in API responses

4. **Never use default/example values in production**
   - Change all placeholder values
   - Generate strong, unique secrets
   - Use production-grade API keys

---

## Verification Checklist

### Before Deployment

- [ ] All required environment variables are set in Vercel Dashboard
- [ ] Production API keys are used (not test keys)
- [ ] Database URL points to production database
- [ ] `NEXT_PUBLIC_APP_URL` matches production domain
- [ ] Webhook secrets are generated for production endpoints
- [ ] Sentry DSN is configured for production project
- [ ] Stripe webhook endpoint is configured with production URL
- [ ] GitHub Secrets are set for batch jobs
- [ ] All sensitive variables are marked as "Sensitive" in Vercel
- [ ] No test keys or placeholder values remain

### After Deployment

- [ ] Test Clerk authentication flow
- [ ] Verify database connections (check Neon dashboard)
- [ ] Test Stripe payment flow with live mode
- [ ] Confirm Stripe webhooks are receiving events
- [ ] Verify OpenAI API responses
- [ ] Test email sending with Resend
- [ ] Check Sentry for error capture
- [ ] Verify Vercel Analytics is tracking pageviews
- [ ] Confirm GitHub Actions job executes successfully
- [ ] Monitor all service dashboards for errors

---

## Troubleshooting

### Issue: "Invalid API Key" Errors

**Cause:** Using test keys in production or expired keys

**Solution:**
1. Verify environment in Vercel Dashboard
2. Check API key validity in service dashboard
3. Regenerate key if expired
4. Redeploy after updating environment variables

---

### Issue: Database Connection Timeout

**Cause:** Invalid DATABASE_URL or network issues

**Solution:**
1. Verify connection string format
2. Check Neon dashboard for database status
3. Ensure `?sslmode=require` is in connection string
4. Test connection locally with `psql` or database client

---

### Issue: Webhook Events Not Received

**Cause:** Incorrect webhook URL or secret

**Solution:**
1. Verify webhook endpoint URL matches deployment domain
2. Check webhook secret in environment variables
3. Review webhook logs in service dashboard (Stripe, Clerk)
4. Ensure webhook endpoint is not behind authentication

---

### Issue: CORS Errors in Production

**Cause:** `NEXT_PUBLIC_APP_URL` mismatch

**Solution:**
1. Set `NEXT_PUBLIC_APP_URL` to production domain
2. Redeploy application
3. Clear browser cache

---

## Migration Guide

### From Development to Production

1. **Clone environment variables:**
   ```bash
   # Export from Vercel CLI (if needed)
   vercel env pull .env.production
   ```

2. **Replace test keys with production keys:**
   - Clerk: `pk_test_` → `pk_live_`, `sk_test_` → `sk_live_`
   - Stripe: `pk_test_` → `pk_live_`, `sk_test_` → `sk_live_`
   - Database: Development DB → Production DB

3. **Update URLs:**
   - `NEXT_PUBLIC_APP_URL`: `http://localhost:3000` → `https://your-domain.com`
   - Webhook endpoints: Update in service dashboards

4. **Add production-only variables:**
   - `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`
   - Production webhook secrets

5. **Deploy and verify:**
   ```bash
   vercel --prod
   ```

---

## Related Documentation

- [Sentry Setup Guide](./sentry-setup.md)
- [GitHub Actions Setup Guide](./github-actions-setup.md)
- [Deployment Checklist](./deployment-checklist.md) *(to be created)*

---

*Last Updated: 2025-12-09*
*Status: ✅ Ready for Production Deployment*
