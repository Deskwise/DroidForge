import path from 'node:path';
import { promises as fs } from 'node:fs';
import { copyRecursive, ensureDir, writeJsonAtomic } from '../fs.js';
import { appendLog } from '../logging.js';
import type { CreateSnapshotInput, CreateSnapshotOutput, ToolDefinition } from '../types.js';

interface SnapshotManifest {
  id: string;
  label?: string;
  createdAt: string;
}

export function createSnapshotTool(): ToolDefinition<CreateSnapshotInput, CreateSnapshotOutput> {
  return {
    name: 'create_snapshot',
    description: 'Copy current droid definitions into a timestamped backup directory.',
    handler: async input => {
      const { repoRoot, label } = input;
      const timestamp = new Date().toISOString().replace(/[:]/g, '-');
      const snapshotId = label ? `${timestamp}_${label.replace(/\s+/g, '-')}` : timestamp;
      const snapshotDir = path.join(repoRoot, '.droidforge', 'backups', snapshotId);

      try {
        await ensureDir(snapshotDir);
        const manifestSrc = path.join(repoRoot, '.droidforge', 'droids-manifest.json');
        const manifestDest = path.join(snapshotDir, 'droids-manifest.json');

        await fs.access(manifestSrc);
        await copyRecursive(path.join(repoRoot, '.droidforge', 'droids'), path.join(snapshotDir, 'droids'));
        await fs.copyFile(manifestSrc, manifestDest);

        const metadataPath = path.join(snapshotDir, 'snapshot.json');
        const metadata: SnapshotManifest = {
          id: snapshotId,
          label,
          createdAt: new Date().toISOString()
        };
        await writeJsonAtomic(metadataPath, metadata);

        await appendLog(repoRoot, {
          timestamp: new Date().toISOString(),
          event: 'create_snapshot',
          status: 'ok',
          payload: { snapshotId }
        });

        return {
          snapshotId,
          paths: [snapshotDir]
        };
      } catch (error) {
        await appendLog(repoRoot, {
          timestamp: new Date().toISOString(),
          event: 'create_snapshot',
          status: 'error',
          payload: { message: (error as Error).message }
        });
        throw error;
      }
    }
  };
}
