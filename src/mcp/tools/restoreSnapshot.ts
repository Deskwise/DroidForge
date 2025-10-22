import path from 'node:path';
import { promises as fs } from 'node:fs';
import { copyRecursive, ensureDir } from '../fs.js';
import { appendLog } from '../logging.js';
import type { RestoreSnapshotInput, RestoreSnapshotOutput, ToolDefinition } from '../types.js';

export function createRestoreSnapshotTool(): ToolDefinition<RestoreSnapshotInput, RestoreSnapshotOutput> {
  return {
    name: 'restore_snapshot',
    description: 'Restore droid definitions and manifest from a snapshot directory.',
    handler: async input => {
      const baseDir = path.join(input.repoRoot, '.droidforge', 'backups', input.snapshotId);
      const stats = await fs.stat(baseDir).catch(() => null);
      if (!stats || !stats.isDirectory()) {
        throw new Error(`Snapshot not found: ${input.snapshotId}`);
      }

      try {
        const targetDroids = path.join(input.repoRoot, '.droidforge', 'droids');
        await fs.rm(targetDroids, { recursive: true, force: true });
        await ensureDir(targetDroids);
        await copyRecursive(path.join(baseDir, 'droids'), targetDroids);
        await fs.copyFile(
          path.join(baseDir, 'droids-manifest.json'),
          path.join(input.repoRoot, '.droidforge', 'droids-manifest.json')
        );

        await appendLog(input.repoRoot, {
          timestamp: new Date().toISOString(),
          event: 'restore_snapshot',
          status: 'ok',
          payload: { snapshotId: input.snapshotId }
        });

        return { restored: [targetDroids] };
      } catch (error) {
        await appendLog(input.repoRoot, {
          timestamp: new Date().toISOString(),
          event: 'restore_snapshot',
          status: 'error',
          payload: { snapshotId: input.snapshotId, message: (error as Error).message }
        });
        throw error;
      }
    }
  };
}
