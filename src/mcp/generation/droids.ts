import path from 'node:path';
import { promises as fs } from 'node:fs';
import { writeJsonAtomic, ensureDir } from '../fs.js';
import type { CustomDroidSeed, ForgeRosterInput } from '../types.js';
import type { DroidDefinition, DroidManifest } from '../../types.js';

const DROID_DIR = '.droidforge/droids';

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

function createDroidDefinition(input: ManifestEntryInput, ctx: ForgeContext): DroidDefinition {
  const now = new Date().toISOString();
  return {
    id: input.id,
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
  const droidDir = path.join(ctx.repoRoot, DROID_DIR);
  await ensureDir(droidDir);

  for (const entry of allEntries) {
    const definition = createDroidDefinition(entry, ctx);
    const filePath = path.join(droidDir, `${entry.id}.json`);
    await writeJsonAtomic(filePath, definition);
    droids.push(definition);
    filePaths.push(filePath);
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

  const manifestPath = path.join(ctx.repoRoot, '.droidforge', 'droids-manifest.json');
  await writeJsonAtomic(manifestPath, manifest);
  filePaths.push(manifestPath);

  return { droids, manifest, filePaths };
}

export async function loadManifest(repoRoot: string): Promise<DroidManifest | null> {
  const manifestPath = path.join(repoRoot, '.droidforge', 'droids-manifest.json');
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

  const definition = createDroidDefinition(entry, ctx);
  const droidDir = path.join(repoRoot, DROID_DIR);
  await ensureDir(droidDir);
  const filePath = path.join(droidDir, `${entry.id}.json`);
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

  const manifestPath = path.join(repoRoot, '.droidforge', 'droids-manifest.json');
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
