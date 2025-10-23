import { globby } from 'globby';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import type { PRDContent } from '../types.js';

export async function scanRepo(root: string) {
  const exists = async (p: string) => !!(await fs.stat(p).catch(() => null));

  const prdPaths = await globby([
    'docs/**/prd/**/*.md',
    'docs/prd/**/*.md',
    'prd/**/*.md',
    'README.md'
  ], { cwd: root, gitignore: true });

  const pkgJsonPath = path.join(root, 'package.json');
  const hasNode = await exists(pkgJsonPath);

  const frameworks: string[] = [];
  if (hasNode) {
    const pkg = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8')) as {
      dependencies?: Record<string, unknown>;
      devDependencies?: Record<string, unknown>;
    };
    const deps: Record<string, unknown> = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };
    for (const k of Object.keys(deps)) {
      if (/react|next|vite|vue|svelte|angular|nuxt/i.test(k)) frameworks.push('frontend');
      if (/express|koa|fastify|hono|nestjs/i.test(k)) frameworks.push('backend');
      if (/jest|vitest|mocha|ava|playwright|cypress/i.test(k)) frameworks.push('testing');
      if (/framer-motion/i.test(k)) frameworks.push('motion');
    }
  }

  const testConfigs = await globby([
    '**/jest*.{js,ts,cjs,mjs}',
    '**/vitest*.{js,ts,cjs,mjs}',
    '**/playwright*.{js,ts,ts}',
    'cypress.config.*',
    '**/pytest.ini',
  ], { cwd: root, gitignore: true });

  // Parse PRD content from discovered markdown files
  const prdContent = await parsePrdContent(root, prdPaths);

  return {
    prdPaths,
    frameworks: Array.from(new Set(frameworks)),
    testConfigs,
    prdContent,
  };
}

async function parsePrdContent(root: string, prdPaths: string[]): Promise<PRDContent | null> {
  const results = await Promise.all(
    prdPaths.map(async (rel) => {
      try {
        const abs = path.join(root, rel);
        const raw = await fs.readFile(abs, 'utf8');
        const parsed = matter(raw);
        const content = parsed.content || '';

        const vision = extractSection(content, ['vision', 'goals', 'goal']);
        const featLines = extractList(content, ['features', 'feature list']);
        const critLines = extractList(content, ['acceptance criteria', 'criteria']);

        return {
          vision: vision ? vision.trim() : '',
          features: featLines,
          criteria: critLines,
        };
      } catch {
        return { vision: '', features: [], criteria: [] };
      }
    })
  );

  const visions = results.map(r => r.vision).filter(Boolean);
  const features = results.flatMap(r => r.features);
  const criteria = results.flatMap(r => r.criteria);

  if (!visions.length && !features.length && !criteria.length) return null;
  const mergedVision = visions.join('\n\n');
  return {
    vision: mergedVision,
    features: unique(features),
    acceptanceCriteria: unique(criteria),
  };
}

function unique<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

function extractSection(md: string, names: string[]): string | null {
  // Find the first matching heading and capture until next heading
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
    .filter(l => /^[-*]\s+/.test(l) || /^\d+[.)]\s+/.test(l))
    .map(l => l.replace(/^[-*]\s+/, '').replace(/^\d+[.)]\s+/, '').trim());
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
