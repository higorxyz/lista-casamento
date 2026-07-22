import { Redis } from "@upstash/redis";

const kv = Redis.fromEnv();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Simple fixed-window rate limiter backed by Redis: one INCR per request,
 * with an EXPIRE set only the first time a window's key is created. It's not
 * perfectly precise at window boundaries, but it's cheap and good enough to
 * stop scripted abuse of public endpoints (gift claiming, admin login).
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${key}`;
  const count = await kv.incr(redisKey);
  if (count === 1) {
    await kv.expire(redisKey, windowSeconds);
  }
  const ttl = await kv.ttl(redisKey);
  const resetInSeconds = ttl && ttl > 0 ? ttl : windowSeconds;
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetInSeconds
  };
}

/**
 * Best-effort client IP extraction from standard proxy headers. Vercel sets
 * x-forwarded-for; this is good enough for rate limiting (not for anything
 * security-critical like auth) since headers can be spoofed by direct callers.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
