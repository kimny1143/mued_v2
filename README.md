# MUEDnote

**Your companion in music production.**

[![Production](https://img.shields.io/badge/production-https%3A%2F%2Fmued.jp-brightgreen)](https://mued.jp)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-Proprietary-red)]()

---

## Overview

MUEDnote is a companion app for music producers that helps you:

- **Rest Reminders** - Get gentle nudges before you burn out
- **Sound Reactive** - Hoo (the owl mascot) sways along with your music
- **Voice Memos** - Capture ideas with voice, automatically transcribed

The project includes:
- **iOS App** - Place your phone nearby during production (App Store submission in progress)
- **Web Dashboard** - Review your sessions and voice logs
- **Landing Page** - Multi-language (EN/JA) with subpath routing

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16 | App Router, Server Components |
| React | 19 | UI Framework |
| TypeScript | 5.x | Type Safety |
| TailwindCSS | 4 | Styling |
| next-intl | 4.x | i18n (Landing Page) |

### Backend
| Technology | Purpose |
|------------|---------|
| Clerk | Authentication |
| Neon PostgreSQL | Database |
| Drizzle ORM | Database Access |
| OpenAI API | AI Features |
| Stripe | Payments (future) |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Vercel | Hosting & Deployment |
| Neon | Serverless PostgreSQL |
| Sentry | Error Monitoring |

### Development
| Tool | Purpose |
|------|---------|
| Vitest | Unit Testing |
| Playwright | E2E Testing |
| ESLint | Linting |
| MCP Servers | Claude Code Integration |

---

## Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd mued_v2

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# OpenAI (for AI features)
OPENAI_API_KEY="sk-..."

# Stripe (for payments)
STRIPE_SECRET_KEY="sk_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Project Structure

```
mued_v2/
├── app/                      # Next.js App Router
│   ├── [locale]/            # Landing page (i18n)
│   ├── (auth)/              # Sign-in/Sign-up
│   ├── (public)/            # Privacy, Support pages
│   ├── api/                 # API Routes
│   │   └── muednote/        # MUEDnote APIs
│   └── dashboard/           # Dashboard
│       └── muednote/        # MUEDnote Dashboard
├── apps/                     # Sub-applications
│   ├── muednote-mobile/     # iOS App (Swift)
│   ├── muednote-hub-macos/  # macOS DAW Hub
│   └── muednote-poc/        # Proof of Concept
├── components/               # React Components
│   ├── ui/                  # Base UI (Button, Card, etc.)
│   ├── features/            # Feature Components
│   │   └── landing/         # Landing Page Sections
│   └── layouts/             # Layout Components
├── db/                       # Database
│   ├── schema/              # Drizzle Schemas
│   └── migrations/          # Migration SQL
├── lib/                      # Core Logic
│   ├── i18n/                # Internationalization
│   ├── repositories/        # Data Access Layer
│   └── services/            # Business Logic
├── messages/                 # i18n Translation Files
│   ├── en.json              # English
│   └── ja.json              # Japanese
├── scripts/                  # Development Scripts
│   └── mcp/                 # MCP Servers
└── tests/                    # Test Files
```

---

## Development Commands

### Development

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # TypeScript check
```

### Testing

```bash
npm run test              # Run all tests
npm run test:unit         # Unit tests only
npm run test:e2e          # E2E tests (Playwright)
npm run test:e2e:ui       # E2E with UI
```

### Database

```bash
npm run db:push           # Push schema changes
npm run db:studio         # Open Drizzle Studio
npm run db:test-connection # Test DB connection
```

---

## i18n Architecture

### Landing Page
- Uses `next-intl` with subpath routing
- Routes: `/en`, `/ja`
- Translations: `messages/en.json`, `messages/ja.json`

### Dashboard
- Uses `LocaleProvider` (React Context)
- Language stored in `localStorage`
- Translations: `lib/i18n/translations.ts`
- Language switcher in header

---

## Deployment

### Vercel (Automatic)

```bash
# Preview deployment
git push origin feature/xxx

# Production deployment
git push origin main
```

### Environment Variables

Set in Vercel Dashboard:
1. Project Settings → Environment Variables
2. Add all variables from `.env.local`
3. Redeploy

---

## Architecture

### Patterns
- **Server Components** - Default for all pages
- **Client Components** - Only where needed (`use client`)
- **Repository Pattern** - Data access abstraction
- **Service Layer** - Business logic separation

### Key Principles
- TypeScript strict mode
- i18n for all user-facing text
- Mobile-first responsive design
- Accessibility (WCAG 2.1)

For detailed guidelines, see [`CLAUDE.md`](./CLAUDE.md).

---

## Related Apps

| App | Description | Status |
|-----|-------------|--------|
| MUEDnote iOS | Companion app for production | App Store Review |
| MUEDnote Hub | macOS DAW integration | Development |

---

## License

Proprietary - glasswerks inc.

---

## Links

- **Production**: [https://mued.jp](https://mued.jp)
- **Company**: [https://glasswerks.jp](https://glasswerks.jp)

---

**Built with care by glasswerks inc.**
