import { forgeDroids } from '../generation/droids.js';
import { appendLog } from '../logging.js';
import { SessionStore } from '../sessionStore.js';
import type {
  ForgeRosterInput,
  ForgeRosterOutput,
  ToolDefinition
} from '../types.js';

interface Deps {
  sessionStore: SessionStore;
}

export function createForgeRosterTool(deps: Deps): ToolDefinition<ForgeRosterInput, ForgeRosterOutput> {
  return {
    name: 'forge_roster',
    description: 'Create droid definition files and manifest for the selected roster.',
    handler: async input => {
      const { repoRoot, sessionId } = input;
      if (!sessionId) {
        throw new Error('forge_roster requires a sessionId');
      }
      const session = await deps.sessionStore.load(repoRoot, sessionId);
      if (!session) {
        throw new Error(`No active onboarding session for ${sessionId}`);
      }
      session.state = 'forging';
      session.selectedDroids = input.selected.map(item => item.id);
      session.customDroids = input.custom ?? [];
      await deps.sessionStore.save(repoRoot, session);

      const ctx = { repoRoot, methodology: session.methodology ?? null };
      const result = await forgeDroids(input, ctx);

      session.state = 'complete';
      await deps.sessionStore.save(repoRoot, session);

      const bootLog = result.droids.map(def =>
        `[BOOT] ${def.id} online. → Purpose: ${def.purpose}`
      );

      const manifestPath = result.filePaths[result.filePaths.length - 1];

      await appendLog(repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'forge_roster',
        status: 'ok',
        payload: { sessionId, count: result.droids.length }
      });

      return {
        bootLog,
        outputPaths: result.filePaths,
        manifestPath,
        manifest: result.manifest
      };
    }
  };
}
