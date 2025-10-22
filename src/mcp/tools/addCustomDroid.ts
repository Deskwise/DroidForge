import { addCustomDroid, loadManifest } from '../generation/droids.js';
import { appendLog } from '../logging.js';
import type { AddCustomDroidInput, AddCustomDroidOutput, CustomDroidSeed, ToolDefinition } from '../types.js';

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'custom';
  return base.startsWith('df-') ? base : `df-${base}`;
}

function inferSeed(description: string): CustomDroidSeed {
  const text = description.trim();
  const parts = text.split(/[—–:-]+/, 2);
  const nameRaw = parts[0]?.trim() || 'custom specialist';
  const goalRaw = parts[1]?.trim() || `Focuses on ${nameRaw.toLowerCase()}.`;
  const slug = slugify(nameRaw);
  return {
    slug,
    label: slug,
    goal: goalRaw,
    abilities: [`Primary focus: ${goalRaw}`],
    description: text
  };
}

export function createAddCustomDroidTool(): ToolDefinition<AddCustomDroidInput, AddCustomDroidOutput> {
  return {
    name: 'add_custom_droid',
    description: 'Create a new custom droid and update manifest/guide scaffolding.',
    handler: async input => {
      try {
        const existingManifest = await loadManifest(input.repoRoot);
        if (!existingManifest) {
          throw new Error('Cannot add a custom droid before running `/forge-start` once.');
        }
        const seed = inferSeed(input.description);
        const { definition, manifest, manifestPath } = await addCustomDroid(
          input.repoRoot,
          existingManifest.methodology,
          seed
        );

        await appendLog(input.repoRoot, {
          timestamp: new Date().toISOString(),
          event: 'add_custom_droid',
          status: 'ok',
          payload: { droidId: definition.id }
        });

        return {
          droidId: definition.id,
          manifest,
          manifestPath,
          guideHint: `${definition.displayName} ready: ${definition.purpose}`
        };
      } catch (error) {
        await appendLog(input.repoRoot, {
          timestamp: new Date().toISOString(),
          event: 'add_custom_droid',
          status: 'error',
          payload: { message: (error as Error).message }
        });
        throw error;
      }
    }
  };
}
