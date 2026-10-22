import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Redis client (lazy initialization)
let redis: Redis | null = null;
let hasLoggedWarning = false;

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    // Log warning only once to avoid spam
    if (!hasLoggedWarning) {
      hasLoggedWarning = true;
      if (process.env.NODE_ENV === 'production') {
        // In production, this is a critical configuration error
        console.error("[RateLimit] CRITICAL: Upstash credentials not configured in production! Falling back to in-memory limits (per instance).");
      } else {
        console.warn("[RateLimit] Upstash credentials not configured, skipping rate limit in development");
      }
    }
    return null;
  }

  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

type Duration = `${number} ${"s" | "m" | "h" | "d"}`;
interface Rule {
  algorithm: "sliding" | "fixed";
  tokens: number;
  window: Duration;
}

// Rate limits for different use cases. Each one is enforced by Upstash when it answers, and by the
// in-memory fallback below when it does not (same numbers, fixed window).
const RULES = {
  // Trial claims: five per hour per Clerk user, independent of other plugin email sends.
  "masterchain-trial": { algorithm: "sliding", tokens: 5, window: "1 h" },
  // AI endpoints: 10 requests per minute per user
  ai: { algorithm: "sliding", tokens: 10, window: "1 m" },
  // General API: 60 requests per minute per user
  api: { algorithm: "sliding", tokens: 60, window: "1 m" },
  // Strict: 5 requests per minute (for sensitive operations)
  strict: { algorithm: "sliding", tokens: 5, window: "1 m" },
  // Dial chat: 20 requests per minute (LLM calls are expensive)
  dial: { algorithm: "sliding", tokens: 20, window: "1 m" },
  // Dial processing: 5 requests per minute (RoEx credit-consuming operations)
  "dial-process": { algorithm: "sliding", tokens: 5, window: "1 m" },
  // Dial analyze: 5 requests per day (RoEx Mix Analysis is expensive)
  "dial-analyze-daily": { algorithm: "fixed", tokens: 5, window: "1 d" },
  // Dial analyze: 30 requests per 30 days (monthly cap)
  "dial-analyze-monthly": { algorithm: "fixed", tokens: 30, window: "30 d" },
  // Hoo Pass subscribers: 3 mix analyses per day (credit abuse control)
  "dial-hoo-pass-daily": { algorithm: "fixed", tokens: 3, window: "1 d" },
  // Research beta endpoints: 5 requests per minute per IP (waitlist/readiness submit)
  research: { algorithm: "sliding", tokens: 5, window: "1 m" },
  // MUEDlobe commentary, kept out of the shared "ai" bucket on purpose.
  //
  // Both this and /api/hoo/chat reach Claude, so putting them in one bucket looks tidy — but the
  // buckets are per-user, so a user's own Hoo chat would consume the allowance and the *profile
  // page* would answer "Hoo's analysis is busy right now". That message is false: nothing is busy,
  // the person simply used a different feature. Telling someone the wrong cause is worse than the
  // limit itself, and the two calls are not substitutes for each other.
  //
  // Same 10/min as "ai": the number is not the point here, the isolation is. This endpoint fires on
  // page mount, so the ceiling has to clear ordinary navigation and only catch loops.
  "lobe-commentary": { algorithm: "sliding", tokens: 10, window: "1 m" },
  // Plugin email gate, keyed by EMAIL (not IP): 5 welcome sends per email per hour. The IP-keyed
  // "research" bucket can't stop a retry-storm or a single-address abuser behind a rotating/shared IP
  // from burning the shared Resend send quota one welcome at a time (the 2026-07-16 launch-wave
  // exhaustion showed retries self-amplify). Generous enough that a legit "it didn't arrive, resend"
  // still works; tight enough to cap runaway loops. Used with checkRateLimit("plugin-email", email).
  "plugin-email": { algorithm: "sliding", tokens: 5, window: "1 h" },
} satisfies Record<string, Rule>;

export type RateLimitType = keyof typeof RULES;

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const limiterCache = new Map<RateLimitType, Ratelimit>();

function upstashLimiter(type: RateLimitType, r: Redis): Ratelimit {
  let limiter = limiterCache.get(type);
  if (!limiter) {
    const rule: Rule = RULES[type];
    limiter = new Ratelimit({
      redis: r,
      limiter: rule.algorithm === "fixed"
        ? Ratelimit.fixedWindow(rule.tokens, rule.window)
        : Ratelimit.slidingWindow(rule.tokens, rule.window),
      prefix: `ratelimit:${type}`,
    });
    limiterCache.set(type, limiter);
  }
  return limiter;
}

// ★In-memory fallback (2026-10-22). Production's Upstash env pointed at a database whose host no longer
// resolves (ENOTFOUND set-cowbird-41295.upstash.io), and every check here used to fail OPEN — so the
// email-sending public forms (plugin subscribe, paid demos) had no limit at all. Recreating Upstash is a
// new external resource (not done here), so when it is unconfigured in production or fails, the same
// numbers are enforced in this process's memory instead.
// ★Not fail-closed: with Upstash dead that would reject every free download and demo request, i.e. turn a
// missing limiter into an outage of the deliverable itself.
// ★Per instance, not global: a burst that lands on one warm instance (the usual shape of a loop or a
// script) is stopped; traffic spread across many cold instances is not. That is weaker than Upstash, and
// still far better than nothing.
const memoryWindows = new Map<string, { count: number; reset: number }>();
const MEMORY_MAX_KEYS = 10_000;
const UNIT_MS = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

function windowMs(window: Duration): number {
  const [amount, unit] = window.split(" ") as [string, keyof typeof UNIT_MS];
  return Number(amount) * UNIT_MS[unit];
}

function checkMemory(type: RateLimitType, identifier: string, now = Date.now()): RateLimitResult {
  const rule: Rule = RULES[type];
  const key = `${type}:${identifier}`;
  let entry = memoryWindows.get(key);
  if (!entry || entry.reset <= now) {
    if (!entry && memoryWindows.size >= MEMORY_MAX_KEYS) {
      for (const [k, v] of memoryWindows) if (v.reset <= now) memoryWindows.delete(k);
      // Still full of live windows: drop the oldest insertions rather than grow without bound.
      for (const k of memoryWindows.keys()) {
        if (memoryWindows.size < MEMORY_MAX_KEYS) break;
        memoryWindows.delete(k);
      }
    }
    entry = { count: 0, reset: now + windowMs(rule.window) };
    memoryWindows.set(key, entry);
  }
  entry.count += 1;
  return {
    success: entry.count <= rule.tokens,
    limit: rule.tokens,
    remaining: Math.max(0, rule.tokens - entry.count),
    reset: entry.reset,
  };
}

// After Upstash fails once, skip it for a while: each failed call took ~4.6 s in production (the client's
// retries against a host that does not resolve), and that wait landed on the visitor's form submit.
const UPSTASH_RETRY_AFTER_MS = 60_000;
let upstashDownUntil = 0;

/**
 * Check rate limit for a request
 * @param type - Type of rate limit to apply
 * @param identifier - Unique identifier (userId or IP)
 * @returns RateLimitResult, or null when no limit applies (Upstash unconfigured outside production)
 */
export async function checkRateLimit(
  type: RateLimitType,
  identifier: string
): Promise<RateLimitResult | null> {
  const r = getRedis();
  if (!r) return process.env.NODE_ENV === "production" ? checkMemory(type, identifier) : null;
  if (Date.now() < upstashDownUntil) return checkMemory(type, identifier);

  try {
    const result = await upstashLimiter(type, r).limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    upstashDownUntil = Date.now() + UPSTASH_RETRY_AFTER_MS;
    console.error("[RateLimit] Upstash check failed, using in-memory limits for 60s:", error);
    return checkMemory(type, identifier);
  }
}

/**
 * Get identifier for rate limiting (userId or IP)
 */
export async function getRateLimitIdentifier(request: Request): Promise<string> {
  // Try to get authenticated user
  try {
    const { userId } = await auth();
    if (userId) return `user:${userId}`;
  } catch {
    // Not authenticated, fall through to IP
  }

  // Fall back to IP address
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `ip:${ip}`;
}

/**
 * Rate limit middleware for API routes
 * Usage:
 *   const rateLimitResponse = await rateLimit(request, "ai");
 *   if (rateLimitResponse) return rateLimitResponse;
 */
export async function rateLimit(
  request: Request,
  type: RateLimitType = "api"
): Promise<NextResponse | null> {
  try {
    const identifier = await getRateLimitIdentifier(request);
    const result = await checkRateLimit(type, identifier);

    // No limit applies (Upstash unconfigured outside production)
    if (!result) return null;

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
          retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": result.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": result.reset.toString(),
            "Retry-After": Math.ceil((result.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Request allowed
    return null;
  } catch (error) {
    // Fail open on anything else (auth lookup, an unexpected throw). An Upstash failure does not land
    // here any more: checkRateLimit falls back to in-memory limits itself.
    console.error('[rateLimit] Rate limit check failed, allowing request:', error);
    return null;
  }
}
