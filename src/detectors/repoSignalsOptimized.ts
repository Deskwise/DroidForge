import { globby } from 'globby';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { cache, CACHE_KEYS } from '../utils/cache.js';
import type { PRDContent } from '../types.js';

export async function scanRepoOptimized(root: string): Promise<{
  prdPaths: string[];
  frameworks: string[];
  testConfigs: string[];
  prdContent: PRDContent | null;
}> {
  const startTime = Date.now();

  // Generate cache key based on directory structure and modification times
  const cacheKey = generateScanCacheKey(root);

  // Try to get cached results
  const cached = cache.get<{
    prdPaths: string[];
    frameworks: string[];
    testConfigs: string[];
    prdContent: PRDContent | null;
  }>(cacheKey);
  if (cached) {
    console.log(`📋 Using cached scan results (${Date.now() - startTime}ms)`);
    return cached;
  }

  console.log('🔍 Scanning repository...');

  // Run all scans in parallel for better performance
  const [
    prdPaths,
    frameworks,
    testConfigs,
    prdContent
  ] = await Promise.all([
      scanPRDPaths(root),
      scanFrameworks(root),
      scanTestConfigs(root),
      (async () => {
        const paths = await scanPRDPaths(root);
        return parsePrdContentOptimized(root, paths);
      })()
  ]);

  const result = {
    prdPaths,
    frameworks: Array.from(new Set(frameworks)),
    testConfigs,
    prdContent,
  };

  // Cache the results
  cache.set(cacheKey, result, 10 * 60 * 1000); // 10 minutes TTL

  console.log(`✅ Repository scan completed (${Date.now() - startTime}ms)`);
  return result;
}

async function scanPRDPaths(root: string): Promise<string[]> {
  try {
    return await globby([
      'docs/**/prd/**/*.md',
      'docs/prd/**/*.md',
      'prd/**/*.md',
      'README.md'
    ], { cwd: root, gitignore: true });
  } catch (error) {
    console.warn('⚠️ Failed to scan PRD paths:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

async function scanFrameworks(root: string): Promise<string[]> {
  const cacheKey = `${root}_frameworks_${getModificationTime(path.join(root, 'package.json'))}`;
  const cached = cache.get<string[]>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const pkgJsonPath = path.join(root, 'package.json');
    const hasNode = await fileExists(pkgJsonPath);

    if (!hasNode) return [];

    const pkg = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
    const deps: Record<string, unknown> = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };

    // Use a more efficient approach with regex for bulk matching
    const frameworks = new Set<string>();
    const depsString = Object.keys(deps).join('|').toLowerCase();

    if (/(react|next|vite|vue|svelte|angular|nuxt)/.test(depsString)) frameworks.add('frontend');
    if (/(express|koa|fastify|hono|nestjs)/.test(depsString)) frameworks.add('backend');
    if (/(jest|vitest|mocha|ava|playwright|cypress)/.test(depsString)) frameworks.add('testing');
    if (/framer-motion/.test(depsString)) frameworks.add('motion');

    const result = Array.from(frameworks);
    cache.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes cache
    return result;
  } catch (error) {
    console.warn('⚠️ Failed to scan frameworks:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

async function scanTestConfigs(root: string): Promise<string[]> {
  const cacheKey = `${root}_testconfigs`;
  const cached = cache.get<string[]>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const configs = await globby([
      '**/jest*.{js,ts,cjs,mjs}',
      '**/vitest*.{js,ts,cjs,mjs}',
      '**/playwright*.{js,ts,ts}',
      'cypress.config.*',
      '**/pytest.ini',
      'karma.conf.*',
      '.nycrc',
      'coverage.json',
      'test.config.*',
      'test-setup.*'
    ], { cwd: root, gitignore: true });

    cache.set(cacheKey, configs, 5 * 60 * 1000); // 5 minutes cache
    return configs;
  } catch (error) {
    console.warn('⚠️ Failed to scan test configs:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

async function parsePrdContentOptimized(root: string, prdPaths: string[]): Promise<PRDContent | null> {
  if (!prdPaths.length) return null;

  const cacheKey = `${root}_prd_content_${prdPaths.join('_').replace(/[\/\\]/g, '_')}`;
  const cached = cache.get<PRDContent | null>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    // Batch file reads for better performance
    const fileContents = await Promise.all(
      prdPaths.map(async (relPath) => {
        try {
          const abs = path.join(root, relPath);
          const raw = await fs.readFile(abs, 'utf8');
          const parsed = matter(raw);
          return {
            path: relPath,
            content: parsed.content || '',
            mtime: await getFileModificationTime(abs)
          };
        } catch (error) {
          console.warn(`⚠️ Failed to read PRD file ${relPath}:`, error instanceof Error ? error.message : String(error));
          return { path: relPath, content: '', mtime: 0 };
        }
      })
    );

    // Sort by modification time to prioritize recent changes
    fileContents.sort((a, b) => b.mtime - a.mtime);

    const results = fileContents.map(({ content }) => {
      const vision = extractSection(content, ['vision', 'goals', 'goal']);
      const featLines = extractList(content, ['features', 'feature list']);
      const critLines = extractList(content, ['acceptance criteria', 'criteria']);

      return {
        vision: vision ? vision.trim() : '',
        features: featLines,
        criteria: critLines,
      };
    });

    const visions = results.map(r => r.vision).filter(Boolean);
    const features = results.flatMap(r => r.features);
    const criteria = results.flatMap(r => r.criteria);

    if (!visions.length && !features.length && !criteria.length) {
      const result = null;
      cache.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes cache
      return result;
    }

    const mergedVision = visions.join('\n\n');
    const result = {
      vision: mergedVision,
      features: unique(features),
      acceptanceCriteria: unique(criteria),
    };

    cache.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes cache
    return result;
  } catch (error) {
    console.warn('⚠️ Failed to parse PRD content:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

// Helper functions
function fileExists(p: string): Promise<boolean> {
  return fs.stat(p).then(() => true).catch(() => false);
}

async function getFileModificationTime(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtime.getTime();
  } catch {
    return 0;
  }
}

async function getModificationTime(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtime.getTime();
  } catch {
    return 0;
  }
}

function generateScanCacheKey(root: string): string {
  // Include directory path and current time (hour-level for caching)
  const now = new Date();
  const hourKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;

  // Get a simple hash of the directory structure (basic approach)
  return `${root.replace(/[^a-zA-Z0-9]/g, '_')}_${hourKey}`;
}

// Reuse utility functions from original file
function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function extractSection(md: string, names: string[]): string | null {
  const headingRegex = new RegExp(
    `^#{1,6}\\s*(?:${names.map(n => escapeRegExp(n)).join('|')})\\s*$`,
    'im'
  );
  const nextHeadingRegex = /^#{1,6}\s+.+$/im;
  const match = md.match(headingRegex);
  if (!match) return null;
  const start = match.index ?? 0;
  const after = md.slice(start + match[0].length);
  const next = after.search(nextHeadingRegex);
  const slice = next === -1 ? after : after.slice(0, next);
  return slice.trim();
}

function extractList(md: string, names: string[]): string[] {
  const section = extractSection(md, names);
  if (!section) return [];
  return section
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .filter(l => /^[-*]\s+/.test(l) || /^\d+[\.)]\s+/.test(l))
    .map(l => l.replace(/^[-*]\s+/, '').replace(/^\d+[\.)]\s+/, '').trim());
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}