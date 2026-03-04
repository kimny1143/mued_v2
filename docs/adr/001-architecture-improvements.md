# ADR-001: Architecture Improvements (2026-03)

## Status: Accepted

## Context

MUED v2 has grown organically. We evaluated 7 architectural improvements and selected 4 based on risk/reward analysis.

## Decisions

### Adopted

| # | Item | Rationale |
|---|------|-----------|
| 1 | **Sentry completeness** | Error boundaries (`error.tsx`) are missing entirely. `withSentryConfig` not applied. Low effort, high observability gain. |
| 2 | **Design tokens** | Button variants use hardcoded Tailwind colors (`bg-red-600`). Semantic tokens in `globals.css` already exist for brand colors but not for action colors. |
| 3 | **drizzle-zod validation** | ~30 hand-written Zod schemas duplicate Drizzle schema definitions. `drizzle-zod` auto-generates them. Pilot 1 route, adopt incrementally. |
| 4 | **i18n unification (next-intl)** | Dashboard uses custom `LocaleProvider` + `translations.ts`; LP uses `next-intl`. Two systems for the same purpose. Unify on `next-intl`. |

### Deferred

| # | Item | Reason | Revisit When |
|---|------|--------|--------------|
| 5 | Monorepo (Turborepo) | Solo developer; overhead > benefit | 2nd developer joins |
| 6 | AI Gateway | Direct OpenAI calls work fine at current scale | API cost > $100/mo |
| 7 | Feature Flags SaaS | Constant-based flags suffice | Paid users > 100 |

## Implementation Order

1 (Sentry) → 2 (Design Tokens) → 3 (drizzle-zod) → 4 (i18n)

Small-to-large, with i18n last since it touches ~40 files.

## Native App Impact

All native apps (`/apps/*`) live in a separate repo (`mued_nativeapps`), communicate via REST API only. None of these changes affect API contracts.
