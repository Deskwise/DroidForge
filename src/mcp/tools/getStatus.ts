import path from 'node:path';
import { readJsonIfExists } from '../fs.js';
import { appendLog } from '../logging.js';
import type { GetStatusInput, GetStatusOutput, ToolDefinition } from '../types.js';
import type { DroidManifest } from '../../types.js';

export function createGetStatusTool(): ToolDefinition<GetStatusInput, GetStatusOutput> {
  return {
    name: 'get_status',
    description: 'Summaries whether onboarding completed and which droids are active.',
    handler: async input => {
      const manifestPath = path.join(input.repoRoot, '.droidforge', 'droids-manifest.json');
      const manifest = await readJsonIfExists<DroidManifest>(manifestPath);
      if (!manifest) {
        await appendLog(input.repoRoot, {
          timestamp: new Date().toISOString(),
          event: 'get_status',
          status: 'ok',
          payload: { status: 'needs-onboarding' }
        });
        return {
          status: 'needs-onboarding',
          activeDroids: [],
          lastRun: null,
          methodology: null
        };
      }

      const activeDroids = manifest.droids.map(d => d.id).concat(manifest.customDroids.map(d => d.id));
      const result: GetStatusOutput = {
        status: 'ready',
        activeDroids,
        lastRun: manifest.updatedAt,
        methodology: manifest.methodology
      };

      await appendLog(input.repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'get_status',
        status: 'ok',
        payload: { status: result.status, count: activeDroids.length }
      });

      return result;
    }
  };
}
