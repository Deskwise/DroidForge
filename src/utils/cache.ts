import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Signals, PRDContent } from '../types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hash: string;
}

interface CacheStats {
  size: number;
  entries: number;
}

export class SimpleCache {
  private cacheDir: string;
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(cacheDir: string = '.droidforge-cache', ttl: number = 5 * 60 * 1000) {
    this.cacheDir = cacheDir;
    this.defaultTTL = ttl;

    // Ensure cache directory exists
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getCachePath(key: string): string {
    const safeKey = key.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50);
    return join(this.cacheDir, `${safeKey}.cache`);
  }

  private generateHash(data: unknown): string {
    // Simple hash function for cache keys
    try {
      return JSON.stringify(data).split('').reduce((a: number, b: string) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0).toString(36);
    } catch {
      // Fallback for circular references or non-serializable data
      return Date.now().toString(36);
    }
  }

  get<T>(key: string, customTTL?: number): T | null {
    try {
      const cachePath = this.getCachePath(key);
      if (!existsSync(cachePath)) return null;

      const content = readFileSync(cachePath, 'utf8');
      const entry: CacheEntry<T> = JSON.parse(content) as CacheEntry<T>;
      const ttl = customTTL || this.defaultTTL;

      if (Date.now() - entry.timestamp > ttl) {
        // Cache expired
        this.delete(key);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  set<T>(key: string, data: T, customTTL?: number): void {
    try {
      const cachePath = this.getCachePath(key);
      const hash = this.generateHash(data);

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        hash
      };

      const serializedEntry = JSON.stringify(entry);
      if (serializedEntry) {
        writeFileSync(cachePath, serializedEntry, 'utf8');
      }
    } catch {
      // Fail silently - caching is optional
    }
  }

  delete(key: string): void {
    try {
      const cachePath = this.getCachePath(key);
      if (existsSync(cachePath)) {
        unlinkSync(cachePath);
      }
    } catch {
      // Fail silently
    }
  }

  clear(): void {
    try {
      const files = readdirSync(this.cacheDir);
      for (const file of files) {
        unlinkSync(join(this.cacheDir, file));
      }
    } catch {
      // Fail silently
    }
  }

  // Get cache statistics
  getStats(): CacheStats {
    try {
      const files = readdirSync(this.cacheDir);
      let totalSize = 0;

      for (const file of files) {
        const stats = statSync(join(this.cacheDir, file));
        totalSize += stats.size;
      }

      return {
        size: totalSize,
        entries: files.length
      };
    } catch {
      return { size: 0, entries: 0 } as CacheStats;
    }
  }
}

// Create a global cache instance
export const cache = new SimpleCache();

// Cache keys
export const CACHE_KEYS = {
  PACKAGE_DEPS: 'package_dependencies',
  FRAMEWORKS: 'frameworks_scan',
  PRD_CONTENT: 'prd_content',
  TEST_CONFIGS: 'test_configs',
  SCRIPT_SCAN: 'scripts_scan'
} as const;