interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export const cacheGet = <T>(key: string): T | undefined => {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
};

export const cacheSet = <T>(key: string, value: T, ttlMs: number): void => {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
};

export const cacheDelete = (key: string): void => {
  store.delete(key);
};

export const cacheDeletePrefix = (prefix: string): void => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
};

export const cached = async <T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> => {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const value = await fn();
  cacheSet(key, value, ttlMs);
  return value;
};
