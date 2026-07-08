import { Schema } from "./types";

export interface CacheOptions {
  enabled: boolean;
  ttl?: number;
}

interface CacheEntry {
  data: any;
  ttl?: number;
  timestamp: number;
}

export class ValidationCache {
  private store = new Map<string, CacheEntry>();

  get(key: string): any | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: string, data: any, ttl?: number): void {
    this.store.set(key, { data, ttl, timestamp: Date.now() });
  }

  invalidate(key?: string): void {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }

  get size(): number {
    return this.store.size;
  }
}

export const globalCache = new ValidationCache();

function sortKeys(value: any): any {
  if (value === null || typeof value !== "object") return value;
  if (value instanceof RegExp) return value.toString();
  if (Array.isArray(value)) return value.map(sortKeys);
  const sorted: Record<string, any> = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortKeys(value[key]);
  }
  return sorted;
}

export function invalidateCache(key?: string): void {
  globalCache.invalidate(key);
}

export function buildCacheKey(
  env: Record<string, string | undefined>,
  schema: Schema,
): string {
  return JSON.stringify({ env: sortKeys(env), schema: sortKeys(schema) });
}
