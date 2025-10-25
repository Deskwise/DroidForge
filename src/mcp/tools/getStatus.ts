import path from 'node:path';
import { promises as fs } from 'node:fs';
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
      
      // Auto-install forge commands if they don't exist yet
      // This ensures users can always access /forge-start, even before onboarding
      const commandsDir = path.join(input.repoRoot, '.factory', 'commands');
      const forgeStartPath = path.join(commandsDir, 'forge-start.md');
      
      let needsInstallation = false;
      try {
        // Check if commands directory and forge-start command exist
        await fs.access(commandsDir);
        await fs.access(forgeStartPath);
        console.error(`[DroidForge] Commands already exist at: ${commandsDir}`);
      } catch (error) {
        needsInstallation = true;
        console.error(`[DroidForge] Commands not found, will install: ${(error as Error).message}`);
      }
      
      if (needsInstallation) {
        // Forge commands don't exist - install them automatically
        try {
          console.error(`[DroidForge] Auto-installing forge commands to: ${commandsDir}`);
          await ensureDir(commandsDir);
          const commands = await buildDefaultCommands(input.repoRoot);
          console.error(`[DroidForge] Generated ${commands.length} commands`);
          
          for (const command of commands) {
            const filename = command.slug.replace(/^\/+/, '');
            const ext = command.type === 'markdown' ? '.md' : '';
            const fullPath = path.join(commandsDir, `${filename}${ext}`);
            await writeFileAtomic(fullPath, command.body, 'utf8');
            
            if (command.type === 'executable') {
              const mode = command.permissions ?? 0o755;
              await fs.chmod(fullPath, mode);
            }
          }
          
          await appendLog(input.repoRoot, {
            timestamp: new Date().toISOString(),
            event: 'auto_install_commands',
            status: 'ok',
            payload: { reason: 'forge-commands-missing', count: commands.length }
          });
        } catch (error) {
          // Log the error but don't fail - commands might be installed later
          await appendLog(input.repoRoot, {
            timestamp: new Date().toISOString(),
            event: 'auto_install_commands',
            status: 'error',
            payload: { message: (error as Error).message }
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
