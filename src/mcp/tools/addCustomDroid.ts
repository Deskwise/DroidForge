import { addCustomDroid, inferCustomSeed, loadManifest } from '../generation/droids.js';
import { appendLog } from '../logging.js';
import type { AddCustomDroidInput, AddCustomDroidOutput, ToolDefinition } from '../types.js';

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
        const seed = inferCustomSeed(input.description);
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
