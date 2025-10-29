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

const REQUIRED_SESSION_FIELDS: Array<keyof OnboardingSession> = [
  'projectVision',
  'targetAudience',
  'timelineConstraints',
  'qualityVsSpeed',
  'teamSize',
  'experienceLevel',
  'budgetConstraints',
  'deploymentRequirements',
  'securityRequirements',
  'scalabilityNeeds'
];

const FIELD_LABELS: Record<string, string> = {
  projectVision: 'project vision',
  targetAudience: 'target audience',
  timelineConstraints: 'timeline',
  qualityVsSpeed: 'quality vs speed preference',
  teamSize: 'team size',
  experienceLevel: 'experience level',
  budgetConstraints: 'budget',
  deploymentRequirements: 'deployment requirements',
  securityRequirements: 'security requirements',
  scalabilityNeeds: 'scalability needs'
};

function collectMissing(session: OnboardingSession): string[] {
  const have = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
  const missing: string[] = [];

  if (!have(session.projectVision ?? session.description)) {
    missing.push(FIELD_LABELS.projectVision);
  }

  for (const field of REQUIRED_SESSION_FIELDS.filter(f => f !== 'projectVision')) {
    const value = (session as any)[field];
    if (!have(value)) {
      missing.push(FIELD_LABELS[field] ?? field);
    }
  }

  return missing;
}

export function createForgeRosterTool(deps: Deps): ToolDefinition<ForgeRosterInput, ForgeRosterOutput> {
  return {
    name: 'forge_roster',
    description: 'Create droid definition files and manifest for the selected roster.',
    handler: async input => {
      const { repoRoot } = input;
      const session = await deps.sessionStore.loadActive(repoRoot);
      if (!session) {
        throw new Error('No active onboarding session found. Please run /forge-start first.');
      }

      const missing = collectMissing(session);
      if (missing.length > 0) {
        throw new Error(`Onboarding is incomplete. Please provide: ${missing.join(', ')}. Run /forge-start to continue.`);
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
        payload: { sessionId: session.sessionId, count: result.droids.length }
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
