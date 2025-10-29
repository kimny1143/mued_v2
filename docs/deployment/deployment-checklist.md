# Production Deployment Checklist

**Last Updated:** 2025-10-29
**Status:** ✅ Ready for Use

---

## Overview

This checklist ensures a smooth and safe production deployment of MUED LMS v2. Follow each section sequentially and check off items as you complete them.

**Deployment Target:** Vercel
**Estimated Time:** 2-3 hours (first deployment)

---

## Pre-Deployment Checklist

### 1. Code Quality

- [ ] All tests passing
  ```bash
  npm run test
  npm run test:e2e
  npm run typecheck
  ```
- [ ] No TypeScript errors
- [ ] Linting passes without errors
  ```bash
  npm run lint
  ```
- [ ] Build succeeds locally
  ```bash
  npm run build
  npm start  # Test production build locally
  ```
- [ ] No `console.log` statements in production code (except error logs)
- [ ] No commented-out code blocks
- [ ] All TODO comments addressed or documented

---

### 2. Environment Variables

#### Vercel Dashboard Configuration

- [ ] **Authentication (Clerk)**
  - [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (Production: `pk_live_...`)
  - [ ] `CLERK_SECRET_KEY` (Production: `sk_live_...`)
  - [ ] `CLERK_WEBHOOK_SECRET` (Production webhook secret)
  - [ ] `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
  - [ ] `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
  - [ ] `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard`
  - [ ] `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard`

- [ ] **Database (Neon PostgreSQL)**
  - [ ] `DATABASE_URL` (Production database with pooler)
  - [ ] Verify `?sslmode=require&channel_binding=require` in connection string

- [ ] **Payments (Stripe)**
  - [ ] `STRIPE_SECRET_KEY` (Production: `sk_live_...`)
  - [ ] `STRIPE_WEBHOOK_SECRET` (Production webhook endpoint)
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Production: `pk_live_...`)
  - [ ] `NEXT_PUBLIC_STRIPE_PRICE_STARTER` (Production price ID)
  - [ ] `NEXT_PUBLIC_STRIPE_PRICE_BASIC` (Production price ID)
  - [ ] `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM` (Production price ID)

- [ ] **AI Services (OpenAI)**
  - [ ] `OPENAI_API_KEY` (Production API key)
  - [ ] `OPENAI_MODEL=gpt-4o-mini` (or `gpt-4o` for higher quality)
  - [ ] `OPENAI_MAX_TOKENS=1000`

- [ ] **Email (Resend)**
  - [ ] `RESEND_API_KEY` (Production API key)

- [ ] **Monitoring (Sentry)**
  - [ ] `SENTRY_DSN` (Production project DSN)
  - [ ] `NEXT_PUBLIC_SENTRY_DSN` (Same as SENTRY_DSN)

- [ ] **Application URLs**
  - [ ] `NEXT_PUBLIC_APP_URL=https://your-production-domain.com`

- [ ] **All sensitive variables marked as "Sensitive"** in Vercel Dashboard

#### GitHub Secrets

- [ ] `DATABASE_URL` configured in GitHub Repository Secrets
  - Location: Settings → Secrets and variables → Actions
  - Used by: `.github/workflows/daily-rag-metrics.yml`

---

### 3. Database Preparation

- [ ] **Production database created** in Neon Console
  - [ ] Separate from development database
  - [ ] Pooler endpoint enabled
  - [ ] Connection details copied

- [ ] **Database migrations executed**
  ```bash
  # Set DATABASE_URL to production
  export DATABASE_URL="postgresql://..."

  # Run migrations
  npm run db:push

  # Verify schema
  npm run db:studio
  ```

- [ ] **Initial data seeded** (if applicable)
  ```bash
  npm run db:seed
  ```

- [ ] **Database backups configured** in Neon Console
  - Automatic daily backups enabled
  - Retention period: 7 days (or longer)

---

### 4. Third-Party Service Configuration

#### Clerk Authentication

- [ ] **Production instance created**
  - Dashboard: [clerk.com/dashboard](https://clerk.com/dashboard)

- [ ] **API Keys copied**
  - [ ] Publishable Key (`pk_live_...`)
  - [ ] Secret Key (`sk_live_...`)

- [ ] **Webhook endpoint configured**
  - Endpoint URL: `https://your-domain.com/api/webhooks/clerk`
  - Events: `user.created`, `user.updated`, `user.deleted`
  - Webhook secret copied to Vercel environment variables

- [ ] **OAuth providers configured** (if using social login)
  - [ ] Google OAuth client ID/secret
  - [ ] GitHub OAuth client ID/secret

- [ ] **Email/SMS settings configured**
  - [ ] Email provider (Clerk's default or custom)
  - [ ] Email templates customized

---

#### Stripe Payments

- [ ] **Live mode activated**
  - Dashboard: [dashboard.stripe.com](https://dashboard.stripe.com/)

- [ ] **API Keys copied**
  - [ ] Publishable Key (`pk_live_...`)
  - [ ] Secret Key (`sk_live_...`)

- [ ] **Products and Prices created**
  - [ ] Starter plan (monthly subscription)
  - [ ] Basic plan (monthly subscription)
  - [ ] Premium plan (monthly subscription)
  - [ ] Price IDs copied to Vercel environment variables

- [ ] **Webhook endpoint configured**
  - Endpoint URL: `https://your-domain.com/api/webhooks/stripe`
  - Events to listen for:
    - [ ] `checkout.session.completed`
    - [ ] `customer.subscription.created`
    - [ ] `customer.subscription.updated`
    - [ ] `customer.subscription.deleted`
    - [ ] `invoice.payment_succeeded`
    - [ ] `invoice.payment_failed`
  - Webhook secret copied to Vercel environment variables

- [ ] **Tax settings configured** (if applicable)
  - [ ] Stripe Tax enabled
  - [ ] Tax rates configured

- [ ] **Customer portal settings**
  - [ ] Subscription management enabled
  - [ ] Invoice history enabled
  - [ ] Payment method updates enabled

---

#### OpenAI API

- [ ] **Production API key created**
  - Dashboard: [platform.openai.com](https://platform.openai.com/)

- [ ] **Usage limits set**
  - [ ] Hard limit: $100/month (adjust as needed)
  - [ ] Email notification: $50/month

- [ ] **Model access verified**
  - [ ] `gpt-4o-mini` (cost-effective)
  - [ ] `gpt-4o` (if using for production)

- [ ] **API key copied** to Vercel environment variables

---

#### Resend Email

- [ ] **Domain verified**
  - Dashboard: [resend.com/dashboard](https://resend.com/dashboard)
  - [ ] DNS records added (MX, TXT, CNAME)
  - [ ] Domain status: Verified

- [ ] **Production API key created**
  - [ ] API key copied to Vercel environment variables

- [ ] **Email templates tested**
  - [ ] Welcome email
  - [ ] Subscription confirmation
  - [ ] Payment receipt

- [ ] **Sender email configured**
  - Format: `noreply@your-domain.com`

---

#### Sentry Error Monitoring

- [ ] **Production project created**
  - Dashboard: [sentry.io](https://sentry.io/)

- [ ] **DSN copied** to Vercel environment variables
  - [ ] `SENTRY_DSN`
  - [ ] `NEXT_PUBLIC_SENTRY_DSN` (same value)

- [ ] **Alert rules configured**
  - [ ] Email notifications for errors
  - [ ] Slack integration (optional)
  - [ ] Threshold: Immediate for new errors

- [ ] **Release tracking configured** (optional)
  - [ ] GitHub integration enabled
  - [ ] Source maps uploaded

- [ ] **Performance monitoring enabled**
  - [ ] Sampling rate: 10% (`tracesSampleRate: 0.1`)

- [ ] **Session replay configured**
  - [ ] Sample rate: 10% (`replaysSessionSampleRate: 0.1`)
  - [ ] Error replay: 100% (`replaysOnErrorSampleRate: 1.0`)

---

#### Vercel Analytics

- [ ] **Packages installed**
  ```bash
  npm install @vercel/analytics @vercel/speed-insights
  ```

- [ ] **Components added** to `app/layout.tsx`
  ```typescript
  import { Analytics } from "@vercel/analytics/react";
  import { SpeedInsights } from "@vercel/speed-insights/next";

  // In body:
  <Analytics />
  <SpeedInsights />
  ```

- [ ] **No additional environment variables needed** ✅

---

### 5. Security Audit

- [ ] **No hardcoded secrets** in codebase
  ```bash
  # Search for potential secrets
  git grep -i "api_key\|secret\|password\|token"
  ```

- [ ] **All sensitive environment variables** marked as "Sensitive" in Vercel

- [ ] **CORS configuration reviewed**
  - [ ] Allowed origins configured
  - [ ] Credentials handling verified

- [ ] **Rate limiting configured** (if applicable)
  - [ ] API endpoints protected
  - [ ] Authentication endpoints rate-limited

- [ ] **SQL injection prevention**
  - [ ] All queries use parameterized statements (Drizzle ORM)
  - [ ] No raw SQL with user input

- [ ] **XSS prevention**
  - [ ] All user input sanitized
  - [ ] React's default XSS protection verified

- [ ] **CSRF protection**
  - [ ] Form tokens implemented (if needed)
  - [ ] SameSite cookie attribute set

- [ ] **Security headers configured**
  - [ ] Content-Security-Policy
  - [ ] X-Frame-Options
  - [ ] X-Content-Type-Options
  - [ ] (Vercel provides defaults, review `next.config.js`)

---

### 6. Performance Optimization

- [ ] **Images optimized**
  - [ ] All images use `next/image`
  - [ ] Appropriate formats (WebP, AVIF)
  - [ ] Proper sizing and lazy loading

- [ ] **Fonts optimized**
  - [ ] Using `next/font` for Google Fonts
  - [ ] Font subsetting configured

- [ ] **Code splitting verified**
  - [ ] Dynamic imports for heavy components
  - [ ] Route-based code splitting

- [ ] **Bundle size analyzed**
  ```bash
  npm run build
  # Review output for large bundles
  ```

- [ ] **Server Components prioritized**
  - [ ] `use client` only where necessary
  - [ ] Data fetching in Server Components

- [ ] **Caching strategy reviewed**
  - [ ] Static pages cached
  - [ ] ISR configured for dynamic pages
  - [ ] API routes cache headers set

---

### 7. Monitoring & Logging

- [ ] **Sentry configuration verified**
  - [ ] Error tracking enabled
  - [ ] Performance monitoring enabled
  - [ ] Session replay enabled

- [ ] **Vercel Analytics enabled**
  - [ ] Web vitals tracking
  - [ ] Page performance monitoring

- [ ] **Application logs reviewed**
  - [ ] Structured logging in place
  - [ ] Log levels appropriate (no verbose logs in production)

- [ ] **Vercel logs dashboard familiarized**
  - [ ] Real-time logs available
  - [ ] Log retention understood

---

## Deployment Process

### 1. Create Production Branch

```bash
# Ensure you're on main branch with latest changes
git checkout main
git pull origin main

# Create production branch (if not exists)
git checkout -b production
git push -u origin production
```

---

### 2. Deploy to Vercel

#### Option A: Deploy via Git Integration (Recommended)

1. [ ] **Connect repository** to Vercel (if not already connected)
   - Dashboard: [vercel.com/dashboard](https://vercel.com/dashboard)
   - New Project → Import Git Repository

2. [ ] **Configure project settings**
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`

3. [ ] **Set production branch**
   - Project Settings → Git → Production Branch: `production`

4. [ ] **Push to production branch**
   ```bash
   git push origin production
   ```

5. [ ] **Monitor deployment**
   - Vercel Dashboard → Project → Deployments
   - Watch build logs for errors

6. [ ] **Deployment succeeds** ✅

---

#### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Follow prompts:
# - Link to existing project or create new
# - Confirm production deployment
```

---

### 3. Post-Deployment Verification

#### Automated Tests

- [ ] **Health check endpoint**
  ```bash
  curl https://your-domain.com/api/health
  # Expected: {"status": "ok"}
  ```

- [ ] **Database connectivity**
  ```bash
  curl https://your-domain.com/api/db/health
  # Expected: {"status": "ok", "database": "connected"}
  ```

---

#### Manual Verification

##### Authentication Flow

- [ ] **Sign up page loads**
  - URL: `https://your-domain.com/sign-up`

- [ ] **User registration works**
  - [ ] Email verification sent
  - [ ] User created in database
  - [ ] Redirected to dashboard

- [ ] **Sign in page loads**
  - URL: `https://your-domain.com/sign-in`

- [ ] **User login works**
  - [ ] Correct credentials accepted
  - [ ] Session created
  - [ ] Redirected to dashboard

- [ ] **Sign out works**
  - [ ] Session cleared
  - [ ] Redirected to sign-in page

---

##### Dashboard Access

- [ ] **Dashboard page loads**
  - URL: `https://your-domain.com/dashboard`

- [ ] **User data displays correctly**
  - [ ] Name, email, avatar
  - [ ] Subscription status

- [ ] **Protected routes work**
  - [ ] Unauthenticated users redirected to sign-in
  - [ ] Authenticated users can access

---

##### Payment Flow

- [ ] **Subscription page loads**
  - URL: `https://your-domain.com/subscribe`

- [ ] **Stripe Checkout opens**
  - [ ] Correct plan selected
  - [ ] Test mode card accepted (use `4242 4242 4242 4242`)

- [ ] **Subscription created**
  - [ ] Webhook received
  - [ ] Database updated
  - [ ] User redirected to success page

- [ ] **Subscription status updates**
  - [ ] Dashboard shows active subscription
  - [ ] Features unlocked

- [ ] **Customer portal works**
  - URL: `https://your-domain.com/account`
  - [ ] Manage subscription link opens Stripe portal
  - [ ] Can cancel subscription
  - [ ] Invoice history visible

---

##### AI Dialogue

- [ ] **Dialogue page loads**
  - URL: `https://your-domain.com/dialogue`

- [ ] **RAG content selection works**
  - [ ] Library materials displayed
  - [ ] Selection updates context

- [ ] **AI responses work**
  - [ ] Query sent successfully
  - [ ] Response received in reasonable time (<3s)
  - [ ] Citations displayed correctly

- [ ] **Dialogue history saved**
  - [ ] Previous messages persist
  - [ ] Can view conversation history

---

##### Plugin System

- [ ] **Plugin management page loads**
  - URL: `https://your-domain.com/admin/plugins`

- [ ] **Plugins listed**
  - [ ] note.com plugin visible
  - [ ] Status indicators correct

- [ ] **Plugin configuration works**
  - [ ] Settings page loads
  - [ ] Can update configuration
  - [ ] Changes saved to database

---

##### Performance

- [ ] **Page load times acceptable**
  - [ ] Home page: <2s
  - [ ] Dashboard: <3s
  - [ ] Dialogue page: <3s

- [ ] **Core Web Vitals meet targets**
  - Check Vercel Speed Insights
  - [ ] LCP (Largest Contentful Paint): <2.5s
  - [ ] FID (First Input Delay): <100ms
  - [ ] CLS (Cumulative Layout Shift): <0.1

---

#### Error Monitoring

- [ ] **Sentry receiving events**
  - Trigger test error:
    ```bash
    curl https://your-domain.com/api/test-sentry
    ```
  - [ ] Error appears in Sentry Dashboard
  - [ ] Stack trace includes source maps
  - [ ] Breadcrumbs captured

- [ ] **Vercel Analytics tracking**
  - [ ] Pageviews recorded
  - [ ] Web vitals captured
  - [ ] User flows visible

---

#### Webhooks

- [ ] **Clerk webhook receiving events**
  - Dashboard: Clerk → Webhooks → View Logs
  - [ ] Events received successfully
  - [ ] No failed deliveries

- [ ] **Stripe webhook receiving events**
  - Dashboard: Stripe → Developers → Webhooks → View Logs
  - [ ] Events received successfully
  - [ ] No failed deliveries
  - [ ] Test webhook from dashboard

---

### 4. DNS Configuration (If Custom Domain)

- [ ] **Domain purchased** and registered

- [ ] **Domain added to Vercel project**
  - Dashboard: Project → Settings → Domains

- [ ] **DNS records configured** in domain provider
  - [ ] A record or CNAME record pointing to Vercel
  - [ ] Wait for DNS propagation (up to 48 hours)

- [ ] **SSL certificate issued**
  - Vercel automatically provisions Let's Encrypt certificate
  - [ ] Certificate status: Issued

- [ ] **Custom domain accessible**
  - [ ] `https://your-domain.com` loads successfully
  - [ ] SSL certificate valid

- [ ] **www redirect configured** (if desired)
  - [ ] `www.your-domain.com` redirects to `your-domain.com`

---

### 5. GitHub Actions Batch Job

- [ ] **Workflow file exists**
  - File: `.github/workflows/daily-rag-metrics.yml`

- [ ] **GitHub Secret configured**
  - [ ] `DATABASE_URL` in Repository Secrets

- [ ] **Manual workflow test**
  - GitHub → Actions → Daily RAG Metrics Calculation → Run workflow
  - [ ] Workflow completes successfully
  - [ ] Check logs for errors
  - [ ] Verify data in database

- [ ] **Cron schedule verified**
  - [ ] Schedule: `0 17 * * *` (02:00 JST)
  - [ ] Will run automatically tomorrow

---

## Post-Deployment Tasks

### 1. Documentation

- [ ] **Update README.md**
  - [ ] Add production URL
  - [ ] Update deployment instructions
  - [ ] Add badge for deployment status

- [ ] **Document deployment date**
  - [ ] Update `docs/deployment/deployment-checklist.md`
  - [ ] Add entry to CHANGELOG.md

- [ ] **Share deployment notes** with team
  - [ ] Key metrics (build time, bundle size)
  - [ ] Known issues
  - [ ] Monitoring dashboard links

---

### 2. Monitoring Setup

- [ ] **Set up alert channels**
  - [ ] Slack channel for error notifications
  - [ ] Email list for critical alerts
  - [ ] PagerDuty integration (if applicable)

- [ ] **Configure alert thresholds**
  - Sentry:
    - [ ] New issue: Immediate notification
    - [ ] High-frequency issue: >10 events/hour
  - Vercel:
    - [ ] Deployment failure: Immediate notification
    - [ ] Build errors: Immediate notification

- [ ] **Create monitoring dashboard**
  - [ ] Sentry dashboard with key metrics
  - [ ] Vercel Analytics dashboard
  - [ ] Database monitoring (Neon dashboard)

- [ ] **Schedule regular reviews**
  - [ ] Daily: Check error logs
  - [ ] Weekly: Review performance metrics
  - [ ] Monthly: Security audit

---

### 3. Backup & Recovery

- [ ] **Database backups verified**
  - Neon Console → Backups
  - [ ] Automatic backups enabled
  - [ ] Test restore process

- [ ] **Code repository backups**
  - [ ] GitHub repository private
  - [ ] Branch protection rules enabled
  - [ ] Regular commits to main branch

- [ ] **Environment variable backups**
  - [ ] Secure copy of `.env.production` stored
  - [ ] Password manager entries for all API keys
  - [ ] Recovery documentation written

---

### 4. Performance Baseline

- [ ] **Run Lighthouse audit**
  ```bash
  npx lighthouse https://your-domain.com --view
  ```
  - [ ] Performance: >90
  - [ ] Accessibility: >90
  - [ ] Best Practices: >90
  - [ ] SEO: >90

- [ ] **Record initial metrics**
  - [ ] Average response time
  - [ ] Error rate
  - [ ] Daily active users (DAU)
  - [ ] Conversion rate

- [ ] **Set performance budgets**
  - [ ] Page weight: <500KB
  - [ ] JavaScript bundle: <200KB
  - [ ] LCP: <2.5s

---

### 5. User Communication

- [ ] **Announcement prepared**
  - [ ] Blog post (if applicable)
  - [ ] Email to beta users
  - [ ] Social media posts

- [ ] **Support channels ready**
  - [ ] Email: support@your-domain.com
  - [ ] Documentation: docs.your-domain.com
  - [ ] Community: Discord/Slack

- [ ] **Feedback collection setup**
  - [ ] In-app feedback form
  - [ ] User survey link
  - [ ] Analytics tracking user behavior

---

## Rollback Plan

### If Deployment Fails

1. **Identify issue**
   - Check Vercel deployment logs
   - Check Sentry for errors
   - Review recent commits

2. **Rollback options**

   **Option A: Revert to previous deployment**
   ```bash
   # Vercel Dashboard → Deployments → Previous Deployment → Promote to Production
   ```

   **Option B: Revert Git commits**
   ```bash
   git revert HEAD
   git push origin production
   ```

   **Option C: Redeploy from known good commit**
   ```bash
   git checkout <known-good-commit>
   vercel --prod
   ```

3. **Verify rollback**
   - [ ] Application accessible
   - [ ] Core features working
   - [ ] No new errors in Sentry

4. **Post-mortem**
   - [ ] Document issue
   - [ ] Identify root cause
   - [ ] Create fix plan
   - [ ] Schedule re-deployment

---

## Success Criteria

Deployment is considered successful when:

- [ ] **All automated tests pass**
- [ ] **All manual verification steps complete**
- [ ] **No critical errors in Sentry** (first 24 hours)
- [ ] **Performance metrics meet targets**
- [ ] **All integrations working** (Clerk, Stripe, OpenAI, Resend)
- [ ] **Monitoring dashboards operational**
- [ ] **Team notified and documentation updated**

---

## Post-Deployment Monitoring (First 48 Hours)

### Hour 1-6 (Critical Period)

- [ ] Monitor Sentry for errors (every 30 minutes)
- [ ] Check Vercel Analytics for traffic spikes
- [ ] Review webhook logs (Clerk, Stripe)
- [ ] Verify batch job scheduled correctly

### Hour 6-24

- [ ] Monitor Sentry for errors (every 2 hours)
- [ ] Check database performance (Neon dashboard)
- [ ] Review API response times
- [ ] Monitor OpenAI API usage

### Hour 24-48

- [ ] Monitor Sentry for errors (every 4 hours)
- [ ] Review Core Web Vitals trends
- [ ] Check subscription conversion rate
- [ ] Verify batch job executed successfully

---

## Contacts & Resources

### Emergency Contacts

- **Infrastructure Lead:** [Name] - [Email] - [Phone]
- **Backend Lead:** [Name] - [Email] - [Phone]
- **DevOps:** [Name] - [Email] - [Phone]

### Service Dashboards

- **Vercel:** [vercel.com/dashboard](https://vercel.com/dashboard)
- **Clerk:** [clerk.com/dashboard](https://clerk.com/dashboard)
- **Stripe:** [dashboard.stripe.com](https://dashboard.stripe.com/)
- **Neon:** [console.neon.tech](https://console.neon.tech/)
- **OpenAI:** [platform.openai.com](https://platform.openai.com/)
- **Resend:** [resend.com/dashboard](https://resend.com/dashboard)
- **Sentry:** [sentry.io](https://sentry.io/)

### Documentation

- [Environment Variables Guide](./environment-variables.md)
- [Sentry Setup Guide](./sentry-setup.md)
- [GitHub Actions Setup Guide](./github-actions-setup.md)
- [Troubleshooting Guide](./troubleshooting.md) *(to be created)*

---

## Completion Sign-Off

- [ ] **Deployment completed by:** ________________
- [ ] **Date:** ________________
- [ ] **Deployment URL:** ________________
- [ ] **Verified by:** ________________
- [ ] **Date:** ________________

---

*Last Updated: 2025-10-29*
*Status: ✅ Ready for Production Use*
*Version: 1.0.0*
