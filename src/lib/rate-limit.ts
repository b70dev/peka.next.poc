// =============================================================
// Simple in-memory rate limiter (sliding window)
// Suitable for single-instance deployments (Vercel serverless).
// For multi-instance deployments, replace with Redis-backed solution.
// =============================================================

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  limit: number
  /** Window size in milliseconds */
  windowMs: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Checks whether the given key is within its rate limit.
 * Key is typically a combination of IP address and endpoint.
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    // First request or window expired — start fresh
    store.set(key, { count: 1, resetAt: now + options.windowMs })
    return { allowed: true, remaining: options.limit - 1, resetAt: now + options.windowMs }
  }

  if (entry.count >= options.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count += 1
  return { allowed: true, remaining: options.limit - entry.count, resetAt: entry.resetAt }
}

/**
 * Extracts the client IP from a Next.js Request.
 * Falls back to 'unknown' if no IP header is present.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}
