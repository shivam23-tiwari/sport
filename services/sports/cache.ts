interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  fetchedAt: string;
}

const cacheStore = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export const CACHE_TTL = {
  LIVE: 25_000,       // 25 seconds for live scores
  FIXTURES: 120_000,  // 2 minutes for daily schedules
  STANDINGS: 300_000, // 5 minutes for standings & calendars
  NEWS: 300_000,      // 5 minutes for RSS & news feeds
  SEARCH: 60_000,     // 1 minute for search queries
  DETAIL: 25_000,     // 25 seconds for match detail views
};

export async function getOrFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  force = false
): Promise<{ data: T; fetchedAt: string; fromCache: boolean }> {
  const now = Date.now();
  const existing = cacheStore.get(key) as CacheEntry<T> | undefined;

  if (!force && existing && existing.expiresAt > now) {
    return { data: existing.data, fetchedAt: existing.fetchedAt, fromCache: true };
  }

  const running = inFlight.get(key) as Promise<T> | undefined;
  if (running) {
    const data = await running;
    const updated = cacheStore.get(key) as CacheEntry<T> | undefined;
    return { data, fetchedAt: updated?.fetchedAt || new Date().toISOString(), fromCache: true };
  }

  const promise = (async () => {
    try {
      const data = await fetcher();
      const fetchedAt = new Date().toISOString();
      cacheStore.set(key, {
        data,
        expiresAt: Date.now() + ttlMs,
        fetchedAt,
      });
      return data;
    } catch (err) {
      if (existing) {
        return existing.data;
      }
      throw err;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  const data = await promise;
  const saved = cacheStore.get(key) as CacheEntry<T> | undefined;
  return {
    data,
    fetchedAt: saved?.fetchedAt || new Date().toISOString(),
    fromCache: false,
  };
}

export async function fetchJsonWithTimeout<T>(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 8000
): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'SportsNetwork/2.0',
      ...headers,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }

  return (await res.json()) as T;
}

export async function fetchTextWithTimeout(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 8000
): Promise<string> {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
      'User-Agent': 'Mozilla/5.0 (compatible; SportsNetwork/2.0)',
      ...headers,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }

  return await res.text();
}
