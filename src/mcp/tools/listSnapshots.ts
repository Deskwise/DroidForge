import path from 'node:path';
import { promises as fs } from 'node:fs';
import { appendLog } from '../logging.js';
import type { ListSnapshotsInput, ListSnapshotsOutput, SnapshotInfo, ToolDefinition } from '../types.js';

export function createListSnapshotsTool(): ToolDefinition<ListSnapshotsInput, ListSnapshotsOutput> {
  return {
    name: 'list_snapshots',
    description: 'Return metadata for stored DroidForge snapshots.',
    handler: async input => {
      const baseDir = path.join(input.repoRoot, '.droidforge', 'backups');
      const entries: SnapshotInfo[] = [];
      try {
        const dirs = await fs.readdir(baseDir, { withFileTypes: true });
        for (const dir of dirs) {
          if (!dir.isDirectory()) continue;
          const id = dir.name;
          const metadataPath = path.join(baseDir, id, 'snapshot.json');
          let createdAt = new Date().toISOString();
          let label: string | undefined;
          try {
            const raw = await fs.readFile(metadataPath, 'utf8');
            const parsed = JSON.parse(raw) as { createdAt?: string; label?: string };
            createdAt = parsed.createdAt ?? createdAt;
            label = parsed.label;
          } catch {
            createdAt = new Date((await fs.stat(path.join(baseDir, id))).mtimeMs).toISOString();
          }
          entries.push({ id, createdAt, label });
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }

      entries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

      await appendLog(input.repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'list_snapshots',
        status: 'ok',
        payload: { count: entries.length }
      });

      return { snapshots: entries };
    }
  };
}
