import { forgeDroids, inferCustomSeed } from '../generation/droids.js';
import { buildSuggestions } from '../suggestions.js';
import { appendLog } from '../logging.js';
import { SessionStore } from '../sessionStore.js';
import type {
  CustomDroidSeed,
  ForgeRosterInput,
  ForgeRosterOutput,
  OnboardingSession,
  ToolDefinition
} from '../types.js';

interface Deps {
  sessionStore: SessionStore;
}

function buildDefaultSelection(session: OnboardingSession) {
  const suggestions = buildSuggestions(session);
  return suggestions.map(suggestion => ({
    id: suggestion.id,
    label: suggestion.label ?? suggestion.id,
    abilities: [],
    goal: suggestion.summary
  }));
}

function normaliseSelection(input: ForgeRosterInput, session: OnboardingSession) {
  if (input.selected && input.selected.length > 0) {
    return input.selected;
  }
  return buildDefaultSelection(session);
}

function normaliseCustom(input: ForgeRosterInput): CustomDroidSeed[] {
  if (input.custom && input.custom.length > 0) {
    return input.custom;
  }
  if (!input.customInput) {
    return [];
  }
  return input.customInput
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => inferCustomSeed(line));
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

      const selected = normaliseSelection(input, session);
      const custom = normaliseCustom(input);

      session.selectedDroids = selected.map(item => item.id);
      session.customDroids = custom;
      await deps.sessionStore.save(repoRoot, session);

      const ctx = { repoRoot, methodology: session.methodology ?? null };
      const result = await forgeDroids({ ...input, selected, custom }, ctx);

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
