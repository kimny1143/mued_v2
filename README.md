# MUED

**Product suite for music creators.**

[![Production](https://img.shields.io/badge/production-https%3A%2F%2Fmued.jp-brightgreen)](https://mued.jp)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-Proprietary-red)]()

---

## Overview

MUED is a product suite for music creators — from ear training to AI-powered mixing to production logging. The platform is built around **Hoo**, an AI owl companion that guides users through every stage of music production.

### Core Products

| Product | Description | Status |
|---------|-------------|--------|
| **MUEDial** | AI mixing & mastering powered by Hoo — chat-based, no engineering knowledge required | Production |
| **MUEDear** | Ear training mobile app with gamified frequency/compression/reverb exercises | Production |
| **MUEDnote** | Production companion — session logs, voice memos, DAW integration | Production |
| **MUEDlobe** | Cognitive training PWA with 8 brain games | Production |

### Key Features

- **Hoo** - AI owl companion. In MUEDial, Hoo acts as your mixing director — translating "make the vocals brighter" into professional mix decisions
- **MUEDial** - Upload stems, chat with Hoo, get a pro-quality mix. Omakase (quick) and Dialogue (detailed) modes. Guest access (no login required)
- **MUEDear** - 6 ear training games (MuFreQ, MuComp, MuVerb, MuPan, MuRush, MuHorse)
- **Session Tracking** - Log and review DAW sessions with parameter capture
- **Multi-language** - Full English and Japanese support

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16 | App Router, Server Components, Turbopack |
| React | 19 | UI Framework |
| TypeScript | 5.x | Type Safety |
| TailwindCSS | 4 | Styling (via PostCSS plugin) |
| Framer Motion | 12 | Animations |
| next-intl | 4.x | i18n (subpath routing) |
| Serwist | 9.x | PWA / Service Worker |
| Recharts | 3.x | Data visualization |

### Backend

| Technology | Purpose |
|------------|---------|
| Clerk | Authentication & user management |
| Neon PostgreSQL | Serverless database |
| Drizzle ORM | Type-safe database access |
| Stripe | Payments & subscription management |
| Resend | Transactional email |
| Upstash Redis | Rate limiting |
| Zod | Runtime validation |

### AI

| Provider | Purpose |
|----------|---------|
| OpenAI (GPT-4) | Production AI features |
| Anthropic Claude | Development / MCP integration |
| Google Gemini | Alternative provider |
| Vercel AI SDK | Unified AI interface |

### Infrastructure

| Service | Purpose |
|---------|---------|
| Vercel | Hosting & deployment |
| Neon | Serverless PostgreSQL |
| Sentry | Error monitoring (client, server, edge) |
| Vercel Analytics | Performance & usage tracking |
| Modal.com | Serverless MIDI-LLM deployment |

### Development

| Tool | Purpose |
|------|---------|
| Vitest | Unit & integration testing |
| Playwright | E2E testing |
| ESLint | Linting |
| Lighthouse CI | Performance auditing |
| MCP Servers | Claude Code integration |
| Testcontainers | Integration test DB |

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

# Install dependencies (.npmrc sets ignore-scripts=true, so dependencies' install scripts do not run)
npm install
# Once per machine: puppeteer's Chrome (its postinstall no longer fetches it). Used by the PDF scripts.
npx puppeteer browsers install chrome

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

# OpenAI
OPENAI_API_KEY="sk-..."

# Anthropic (optional, for dev)
ANTHROPIC_API_KEY="sk-ant-..."

# Stripe
STRIPE_SECRET_KEY="sk_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Resend (email)
RESEND_API_KEY="re_..."

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Sentry
SENTRY_DSN="https://..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Project Structure

```
mued_v2/
├── app/                        # Next.js App Router
│   ├── [locale]/              # Landing page (i18n: /en, /ja)
│   │   ├── privacy/           # Privacy policy
│   │   ├── support/           # Support page
│   │   ├── story/[slug]/      # Story articles
│   │   └── tokushoho/         # Legal (JP)
│   ├── (auth)/                # Sign-in / Sign-up (Clerk)
│   ├── api/                   # API Routes (23 endpoint groups)
│   │   ├── ai/               # AI material generation, intent, tests
│   │   ├── hoo/              # Hoo conversation, memory, sessions
│   │   ├── muednote/         # Sessions, logs, DAW, mobile API
│   │   ├── lobe/             # Cognitive training game API
│   │   ├── interview/        # Assessment questions & answers
│   │   ├── mentor-matching/  # AI mentor search & chat
│   │   ├── subscription/     # Checkout, cancel, limits
│   │   ├── webhooks/         # Stripe & Clerk webhooks
│   │   └── ...               # lessons, materials, admin, etc.
│   ├── dashboard/             # Protected dashboard
│   │   ├── muednote/         # Session logs, Hoo chat, DAW data
│   │   ├── materials/        # Material CRUD & import
│   │   ├── library/          # Shared content library
│   │   ├── lessons/          # Lesson management
│   │   ├── teacher/          # Teacher: slots, revenue, tests
│   │   ├── admin/            # Admin: plugins, RAG metrics
│   │   ├── subscription/     # Subscription management
│   │   └── settings/         # User settings
│   ├── lobe/                  # MUEDlobe game interface
│   └── payment/               # Payment success/cancelled
├── components/                 # React Components
│   ├── ui/                    # Primitives (Button, Card, Input, etc.)
│   ├── features/              # Domain components
│   │   ├── landing/           # Landing page sections
│   │   ├── muedear-landing/   # MUEDear marketing page
│   │   ├── materials/         # ABC notation, piano keyboard
│   │   ├── library/           # Library browser
│   │   ├── chat-matching/     # Mentor matching chat UI
│   │   ├── lobe/              # Cognitive training games
│   │   ├── admin/             # Plugin & RAG metrics admin
│   │   └── ...                # subscription, trial, teacher, etc.
│   ├── layouts/               # Dashboard, MUEDnote, Header, Footer
│   ├── providers/             # Locale context provider
│   └── seo/                   # Hreflang, structured data
├── db/                         # Database
│   ├── schema/                # 12 Drizzle schema files
│   ├── migrations/            # 25 migration SQL files
│   └── seed/                  # Seed data
├── lib/                        # Core Logic
│   ├── ai/                    # AI integration
│   │   ├── prompts/           # 12 feature-specific prompt files
│   │   ├── providers/         # OpenAI, Claude, Gemini providers
│   │   └── tools.ts           # AI tool definitions
│   ├── repositories/          # Data access (10 repositories)
│   ├── services/              # Business logic (9 services)
│   ├── i18n/                  # Internationalization
│   ├── middleware/             # Auth, rate limit, usage limit
│   ├── audio/                 # ABC player, loop handler
│   ├── content/               # Content fetcher registry
│   ├── export/                # PDF, MIDI export
│   ├── metrics/               # Learning tracker
│   ├── muedlobe/              # 8 game implementations + scoring
│   ├── plugins/               # Plugin system
│   └── utils/                 # Logger, auth helpers, env
├── hooks/                      # 13 custom React hooks
├── types/                      # TypeScript type definitions
├── messages/                   # i18n JSON files (en, ja)
├── scripts/                    # Development utilities
│   ├── mcp/                   # 6 MCP servers for Claude Code
│   ├── daw-hub/               # DAW OSC integration scripts
│   ├── jobs/                  # Background jobs (RAG metrics)
│   └── ...                    # 40+ DB, seed, test utilities
├── tests/                      # Test suite
│   ├── e2e/                   # Playwright E2E specs
│   ├── integration/           # Integration tests
│   ├── performance/           # Performance benchmarks
│   ├── fixtures/              # Test data
│   ├── mocks/                 # MSW, OpenAI, Stripe mocks
│   └── setup/                 # Test environment config
├── modal_app/                  # Modal.com MIDI-LLM deployment
├── docs/                       # Documentation
│   ├── guides/                # Dev guides (testing, DB, MCP)
│   ├── business/              # Brand, cost, LP proposals
│   └── ...                    # Per-feature docs
└── e2e/                        # Additional E2E specs
```

---

## Development Commands

### Development

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run typecheck    # TypeScript check
```

### Testing

```bash
npm run test                  # All tests (unit + components + integration + e2e)
npm run test:unit             # Unit tests
npm run test:components       # Component tests
npm run test:integration      # Integration tests
npm run test:e2e              # E2E tests (Playwright)
npm run test:e2e:ui           # E2E with interactive UI
npm run test:performance      # Performance benchmarks
npm run test:coverage         # Coverage report
```

### Database

```bash
npm run db:push               # Push schema changes
npm run db:generate           # Generate migration SQL
npm run db:studio             # Open Drizzle Studio
npm run db:seed               # Seed development data
npm run db:test-connection    # Verify DB connection
npm run db:migrate:phase2     # Run Phase 2 migrations
```

### External Services

```bash
npm run clerk:sync            # Sync Clerk users to DB
npm run job:rag-metrics       # Calculate RAG metrics
```

---

## Architecture

### Patterns

- **Server Components** - Default for all pages; `use client` only where needed
- **Repository Pattern** - Data access abstraction (`lib/repositories/`)
- **Service Layer** - Business logic separation (`lib/services/`)
- **Plugin System** - Dynamic content fetcher loading (`lib/plugins/`)

### Database Schema

12 schema files covering:

| Schema | Purpose |
|--------|---------|
| sessions | AI interview-driven session logging |
| chat-system | Conversation message storage |
| ear-training | Ear training exercises & progress |
| structure-training | Music theory exercises |
| question-templates | Versioned question templates |
| cognitive-profiles | User learning profiles |
| hoo-conversations | Hoo conversation history |
| hoo-memories | Hoo persistent memory |
| muednote-daw-logs | DAW parameter capture |
| muednote-mobile | Mobile app session data |
| log-entries | Activity audit trail |
| rag-metrics | RAG search performance |

### AI Prompt System

Prompts are organized as one file per feature in `lib/ai/prompts/`:

```
lib/ai/prompts/
├── hoo.ts                    # Hoo companion personality
├── interviewer.ts            # Assessment interview
├── analyzer.ts               # Session analysis
├── lobe-commentary.ts        # Game feedback
├── mentor-matching.ts        # Mentor recommendation
├── quick-test.ts             # Quick assessment
├── weak-drill.ts             # Weak spot exercises
├── material-request-parser.ts
├── conversation-title.ts
├── intent.ts
└── versions.ts               # Version tracking
```

Each prompt exports a `*_PROMPT_VERSION` constant for cache management.

---

## i18n Architecture

### Landing Page

- Uses `next-intl` with subpath routing (`/en`, `/ja`)
- Translations: `messages/en.json`, `messages/ja.json`
- Locale detection from `Accept-Language` header

### Dashboard

- Uses `LocaleProvider` (React Context)
- Language stored in `localStorage`
- Translations: `lib/i18n/translations.ts`
- Language switcher in header

---

## API Routes

### Main Endpoint Groups

| Group | Endpoints | Purpose |
|-------|-----------|---------|
| `/api/ai/*` | 9 routes | Material generation, intent detection, MIDI, tests |
| `/api/hoo/*` | 7 routes | Conversations, memory, session context |
| `/api/muednote/*` | 12 routes | Sessions, logs, DAW, projects, mobile API |
| `/api/lobe/*` | 4 routes | Game measurement, profile, commentary |
| `/api/interview/*` | 3 routes | Questions, answers, history |
| `/api/mentor-matching/*` | 3 routes | Search, chat, booking |
| `/api/mentor-slots/*` | 4 routes | Slot CRUD, recurring slots |
| `/api/lessons/*` | 2 routes | Lesson CRUD |
| `/api/materials/*` | 1 route | Share to library |
| `/api/subscription/*` | 4 routes | Checkout, cancel, reactivate, limits |
| `/api/admin/*` | 4 routes | RAG metrics, plugins, provenance |
| `/api/webhooks/*` | 2 routes | Stripe, Clerk |
| `/api/export/*` | 1 route | PDF export |
| `/api/health/*` | 2 routes | Health check, DB status |

---

## Deployment

### Vercel (Automatic)

```bash
# Preview deployment
git push origin feature/xxx

# Production deployment
git push origin main
```

### Cron Jobs

Configured in `vercel.json`:

| Schedule | Path | Purpose |
|----------|------|---------|
| Daily 17:00 UTC | `/api/cron/rag-metrics` | RAG performance aggregation |

### Environment Variables

Set in Vercel Dashboard: Project Settings > Environment Variables. Add all variables from `.env.local`.

---

## License

Proprietary - glasswerks inc.

---

## Links

- **Production**: [https://mued.jp](https://mued.jp)
- **Company**: [https://glasswerks.jp](https://glasswerks.jp)

---

**Built with care by glasswerks inc.**
