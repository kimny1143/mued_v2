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
        console.error("[RateLimit] CRITICAL: Upstash credentials not configured in production! Rate limiting is DISABLED.");
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

// Rate limiters for different use cases
const limiters = {
  // AI endpoints: 10 requests per minute per user
  ai: () => {
    const r = getRedis();
    if (!r) return null;
    return new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      prefix: "ratelimit:ai",
    });
  },

  // General API: 60 requests per minute per user
  api: () => {
    const r = getRedis();
    if (!r) return null;
    return new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      prefix: "ratelimit:api",
    });
  },

  // Strict: 5 requests per minute (for sensitive operations)
  strict: () => {
    const r = getRedis();
    if (!r) return null;
    return new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      prefix: "ratelimit:strict",
    });
  },
};

export type RateLimitType = keyof typeof limiters;

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for a request
 * @param type - Type of rate limit to apply
 * @param identifier - Unique identifier (userId or IP)
 * @returns RateLimitResult or null if rate limiting is disabled
 */
export async function checkRateLimit(
  type: RateLimitType,
  identifier: string
): Promise<RateLimitResult | null> {
  const limiter = limiters[type]();
  if (!limiter) return null;

  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
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
  const identifier = await getRateLimitIdentifier(request);
  const result = await checkRateLimit(type, identifier);

  // If rate limiting is not configured, allow the request
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
}
