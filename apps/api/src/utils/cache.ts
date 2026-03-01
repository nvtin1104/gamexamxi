/**
 * Cache-aside pattern using Cloudflare KV.
 * Checks KV first; on miss, calls fetcher, stores result with TTL.
 */
export async function getCachedOrFetch<T>(
  kv: KVNamespace,
  key: string,
  fetcher: () => Promise<T>,
  ttl = 300
): Promise<T> {
  const cached = await kv.get<T>(key, 'json')
  if (cached !== null) return cached

  const fresh = await fetcher()
  await kv.put(key, JSON.stringify(fresh), { expirationTtl: ttl })
  return fresh
}

/** Invalidate a cache key */
export async function invalidateCache(
  kv: KVNamespace,
  key: string
): Promise<void> {
  await kv.delete(key)
}
