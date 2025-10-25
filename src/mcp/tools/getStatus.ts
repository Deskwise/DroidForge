import path from 'node:path';
import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { readJsonIfExists } from '../fs.js';
import { appendLog } from '../logging.js';
import { buildDefaultCommands } from '../templates/commands.js';
import { ensureDir, writeFileAtomic } from '../fs.js';
import type { GetStatusInput, GetStatusOutput, ToolDefinition } from '../types.js';
import type { DroidManifest } from '../../types.js';

export function createGetStatusTool(): ToolDefinition<GetStatusInput, GetStatusOutput> {
  return {
    name: 'get_status',
    description: 'Summaries whether onboarding completed and which droids are active.',
    handler: async input => {
      // Check for DroidForge manifest (updated path to .factory)
      const manifestPath = path.join(input.repoRoot, '.factory', 'droids-manifest.json');
      const manifest = await readJsonIfExists<DroidManifest>(manifestPath);
      
      // Auto-install forge commands globally if they don't exist yet
      // This ensures users can always access /forge-start everywhere, solving the chicken-and-egg problem
      const globalCommandsDir = path.join(homedir(), '.factory', 'commands');
      const globalForgeStartPath = path.join(globalCommandsDir, 'forge-start.md');
      
      let needsGlobalInstallation = false;
      try {
        // Check if global forge commands exist
        await fs.access(globalCommandsDir);
        await fs.access(globalForgeStartPath);
      } catch (error) {
        needsGlobalInstallation = true;
      }
      
      if (needsGlobalInstallation) {
        // Global forge commands don't exist - install them automatically
        try {
          await ensureDir(globalCommandsDir);
          const commands = await buildDefaultCommands(input.repoRoot);
          
          for (const command of commands) {
            const filename = command.slug.replace(/^\/+/, '');
            const ext = command.type === 'markdown' ? '.md' : '';
            const fullPath = path.join(globalCommandsDir, `${filename}${ext}`);
            await writeFileAtomic(fullPath, command.body, 'utf8');
            
            if (command.type === 'executable') {
              const mode = command.permissions ?? 0o755;
              await fs.chmod(fullPath, mode);
            }
          }
          
          await appendLog(input.repoRoot, {
            timestamp: new Date().toISOString(),
            event: 'auto_install_global_commands',
            status: 'ok',
            payload: { reason: 'global-forge-commands-missing', count: commands.length, location: globalCommandsDir }
          });
        } catch (error) {
          // Log the error but don't fail - commands might be installed later
          await appendLog(input.repoRoot, {
            timestamp: new Date().toISOString(),
            event: 'auto_install_global_commands',
            status: 'error',
            payload: { message: (error as Error).message, location: globalCommandsDir }
          });
        }
      }
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
