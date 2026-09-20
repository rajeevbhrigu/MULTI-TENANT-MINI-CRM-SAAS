import "server-only";

/**
 * Simple fixed-window rate limiter, in-memory by default. This is
 * per-process, which is fine for a single-instance deployment or local dev;
 * point it at Redis (REDIS_URL) for multi-instance production deployments by
 * swapping the store implementation below without touching call sites.
 */
type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

// Prevent unbounded memory growth from an ever-growing key space.
const MAX_ENTRIES = 50_000;

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    if (store.size > MAX_ENTRIES) store.clear();
    store.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count };
}
