import path from 'node:path';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import { writeJsonAtomic, ensureDir, readJsonIfExists, writeFileAtomic } from '../fs.js';
import type { CustomDroidSeed, ForgeRosterInput } from '../types.js';
import type { DroidDefinition, DroidManifest } from '../../types.js';

const PRIMARY_DROID_DIR = '.factory/droids';
const LEGACY_DROID_DIR = '.droidforge/droids';

interface ForgeContext {
  repoRoot: string;
  methodology: string | null;
}

interface ManifestEntryInput {
  id: string;
  label: string;
  goal: string;
  abilities: string[];
  description?: string;
}

// Removed normalizeIdWithMethodology - methodology-specific droid already has correct ID from suggestions

async function buildDefinitionWithPreserve(
  entry: ManifestEntryInput,
  ctx: ForgeContext,
  primaryPath: string,
  legacyPath: string
): Promise<DroidDefinition> {
  const existing = await readJsonIfExists<DroidDefinition>(primaryPath)
    ?? await readJsonIfExists<DroidDefinition>(legacyPath);
  const definition = createDroidDefinition(entry, ctx);

  // Preserve uuid if present on existing definition
  if (existing && typeof existing.uuid === 'string' && existing.uuid.trim() !== '') {
    definition.uuid = existing.uuid;
  }

  // If an existing definition has a UUID, preserve its createdAt value
  // even if that value is undefined. This avoids introducing a new
  // timestamp for legacy files that already have a stable UUID but no
  // recorded createdAt. Otherwise, if existing.createdAt is a non-empty
  // string, preserve that timestamp.
  if (existing && typeof existing.uuid === 'string' && existing.uuid.trim() !== '') {
    // preserve createdAt as-is (may be undefined) to avoid backfilling
    // a new timestamp for legacy files that already have uuid
    // (assignment intentional per migration strategy)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore allow assigning possibly undefined createdAt to keep legacy state
    definition.createdAt = existing.createdAt;
  } else if (existing && typeof existing.createdAt === 'string' && existing.createdAt.trim() !== '') {
    definition.createdAt = existing.createdAt;
  }

  return definition;
}

function createDroidDefinition(input: ManifestEntryInput, ctx: ForgeContext): DroidDefinition {
  const now = new Date().toISOString();
  const uuid = crypto.randomUUID();
  return {
    id: input.id,
    uuid,
    version: '1.0',
    displayName: input.label,
    purpose: input.goal,
    abilities: input.abilities,
    tools: [
      { type: 'filesystem', paths: ['src/**', 'docs/**'] }
    ],
    createdAt: now,
    methodology: ctx.methodology,
    owner: 'droidforge'
  };
}

function createDroidMarkdown(definition: DroidDefinition): string {
  const frontmatter = `---
name: ${definition.id}
description: ${definition.purpose}
model: inherit
tools: all
version: ${definition.version}
---

You are a specialized AI assistant: ${definition.displayName}.

## Purpose
${definition.purpose}

## Expertise Areas
${definition.abilities.map(ability => `- ${ability}`).join('\n')}

## Methodology
Following ${definition.methodology || 'best practices'} development approach.

## Response Guidelines
When helping users:
1. Focus on your area of specialization
2. Provide practical, actionable solutions
3. Follow established patterns in the codebase
4. Ask clarifying questions when requirements are unclear
5. Suggest best practices and optimizations
6. Maintain consistency with the project's methodology

Always structure your responses with clear sections and detailed explanations.
`;

  return frontmatter;
}

interface ForgeResult {
  droids: DroidDefinition[];
  manifest: DroidManifest;
  filePaths: string[];
}

export async function forgeDroids(input: ForgeRosterInput, ctx: ForgeContext): Promise<ForgeResult> {
  const mandatory: ManifestEntryInput = {
    id: 'df-orchestrator',
    label: 'df-orchestrator',
    goal: 'Coordinate specialists, track progress, and interface with the user.',
    abilities: [
      'Route tasks across the forged team',
      'Validate outputs before reporting back to the user',
      'Maintain shared context and surface progress updates'
    ]
  };

  const entries: ManifestEntryInput[] = [mandatory];
  const selected = input.selected ?? [];
  for (const item of selected) {
    entries.push({
      id: item.id,
      label: item.label,
      goal: item.goal,
      abilities: item.abilities
    });
  }

  const custom = (input.custom ?? []).map<ManifestEntryInput>((seed: CustomDroidSeed) => ({
    id: seed.slug,
    label: seed.label,
    goal: seed.goal,
    abilities: seed.abilities,
    description: seed.description
  }));

  const allEntries = [...entries, ...custom];
  const droids: DroidDefinition[] = [];
  const filePaths: string[] = [];
  const now = new Date().toISOString();
  const primaryDir = path.join(ctx.repoRoot, PRIMARY_DROID_DIR);
  const legacyDir = path.join(ctx.repoRoot, LEGACY_DROID_DIR);
  await ensureDir(primaryDir);
  await ensureDir(legacyDir);

  for (const entry of allEntries) {
    // Create DroidForge internal JSON definition
    const primaryJsonPath = path.join(primaryDir, `${entry.id}.json`);
    const legacyJsonPath = path.join(legacyDir, `${entry.id}.json`);
    const legacyMdPath = path.join(legacyDir, `${entry.id}.md`);
    const definition = await buildDefinitionWithPreserve(entry, ctx, primaryJsonPath, legacyJsonPath);
    await writeJsonAtomic(primaryJsonPath, definition);
    
    // Create Droid CLI compatible markdown file
    const primaryMdPath = path.join(primaryDir, `${entry.id}.md`);
    const markdown = createDroidMarkdown(definition);
    await writeFileAtomic(primaryMdPath, markdown);
    await writeJsonAtomic(legacyJsonPath, definition);
    await writeFileAtomic(legacyMdPath, markdown);
    
    droids.push(definition);
    filePaths.push(primaryJsonPath, primaryMdPath, legacyJsonPath, legacyMdPath);
  }

  const manifest: DroidManifest = {
    methodology: ctx.methodology,
    createdAt: now,
    updatedAt: now,
    primaryCommand: '/df',
    droids: entries.map(entry => ({
      id: entry.id,
      role: 'specialist',
      status: 'active',
      description: entry.goal
    })),
    customDroids: custom.map(entry => ({
      id: entry.id,
      role: 'custom',
      status: 'active',
      description: entry.goal
    })),
    snapshots: []
  };

  const manifestPathPrimary = path.join(ctx.repoRoot, '.factory', 'droids-manifest.json');
  const manifestPathLegacy = path.join(ctx.repoRoot, '.droidforge', 'droids-manifest.json');
  await ensureDir(path.dirname(manifestPathLegacy));
  await writeJsonAtomic(manifestPathPrimary, manifest);
  await writeJsonAtomic(manifestPathLegacy, manifest);
  filePaths.push(manifestPathPrimary, manifestPathLegacy);

  return { droids, manifest, filePaths };
}

export async function loadManifest(repoRoot: string): Promise<DroidManifest | null> {
  const manifestPath = path.join(repoRoot, '.factory', 'droids-manifest.json');
  try {
    const raw = await fs.readFile(manifestPath, 'utf8');
    return JSON.parse(raw) as DroidManifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function addCustomDroid(
  repoRoot: string,
  methodology: string | null,
  seed: CustomDroidSeed
): Promise<{ definition: DroidDefinition; manifest: DroidManifest; manifestPath: string }> {
  const manifest = await loadManifest(repoRoot);
  if (!manifest) {
    throw new Error('Cannot add a custom droid before the initial forge.');
  }

  const ctx: ForgeContext = { repoRoot, methodology };
  const entry: ManifestEntryInput = {
    id: seed.slug,
    label: seed.label,
    goal: seed.goal,
    abilities: seed.abilities,
    description: seed.description
  };

  const droidDir = path.join(repoRoot, PRIMARY_DROID_DIR);
  await ensureDir(droidDir);
  const filePath = path.join(droidDir, `${entry.id}.json`);
  const legacyFilePath = path.join(repoRoot, LEGACY_DROID_DIR, `${entry.id}.json`);
  const definition = await buildDefinitionWithPreserve(entry, ctx, filePath, legacyFilePath);
  await writeJsonAtomic(filePath, definition);

  const customIndex = manifest.customDroids.findIndex(d => d.id === entry.id);
  const manifestEntry = {
    id: entry.id,
    role: 'custom' as const,
    status: 'active' as const,
    description: entry.goal
  };

  if (customIndex >= 0) {
    manifest.customDroids[customIndex] = manifestEntry;
  } else {
    manifest.customDroids.push(manifestEntry);
  }

  manifest.updatedAt = new Date().toISOString();

  const manifestPath = path.join(repoRoot, '.factory', 'droids-manifest.json');
  await writeJsonAtomic(manifestPath, manifest);

  return { definition, manifest, manifestPath };
}

export function inferCustomSeed(description: string): CustomDroidSeed {
  const text = description.trim();
  const [maybeName, maybeGoal] = text.split(/[—–:-]+/, 2);
  const nameRaw = (maybeName ?? 'custom specialist').trim();
  const goalRaw = (maybeGoal ?? `Focuses on ${nameRaw.toLowerCase()}.`).trim();
  const slugBase = nameRaw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'custom';
  const slug = slugBase.startsWith('df-') ? slugBase : `df-${slugBase}`;

  return {
    slug,
    label: slug,
    goal: goalRaw,
    abilities: [`Primary focus: ${goalRaw}`],
    description: text
  };
}
