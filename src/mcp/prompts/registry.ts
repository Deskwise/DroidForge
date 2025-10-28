import { SessionStore } from '../sessionStore.js';
import type { ExecutionManager, ExecutionPlan, ExecutionStatus } from '../execution/manager.js';
import { createAddDroidScript } from './addDroid.js';
import { createCleanupScript } from './cleanup.js';
import { createHelpScript } from './help.js';
import { createLogsScript } from './logs.js';
import { createOnboardingScript } from './onboarding.js';
import { createIntelligentOnboardingScript } from './onboarding-intelligent.js';
import { createRestoreSnapshotScript } from './restoreSnapshot.js';
import { createResumeOnboardingScript } from './resumeOnboarding.js';
import { createReturningUserScript } from './returningUser.js';
import { createShowGuideScript } from './showGuide.js';
import { createOrchestratorParallelScript } from './orchestratorParallel.js';
import type { PromptScript } from './types.js';

export interface PromptBuilderContext {
  repoRoot: string;
  sessionId?: string;
  params?: Record<string, unknown>;
}

export type PromptBuilder = (ctx: PromptBuilderContext) => Promise<PromptScript>;

export function createPromptRegistry(deps: { sessionStore: SessionStore; executionManager?: ExecutionManager }): Map<string, PromptBuilder> {
  const registry = new Map<string, PromptBuilder>();

  registry.set('droidforge.onboarding', async ctx => {
    if (!ctx.sessionId) {
      throw new Error('onboarding prompt requires a sessionId');
    }
    return createIntelligentOnboardingScript(ctx.sessionId, ctx.repoRoot);
  });

  registry.set('droidforge.onboarding_basic', async ctx => {
    if (!ctx.sessionId) {
      throw new Error('onboarding_basic prompt requires a sessionId');
    }
    return createOnboardingScript(ctx.sessionId, ctx.repoRoot);
  });

  registry.set('droidforge.resume_onboarding', async ctx => {
    if (!ctx.sessionId) {
      throw new Error('resume_onboarding prompt requires a sessionId');
    }
    const session = await deps.sessionStore.load(ctx.repoRoot, ctx.sessionId);
    const state = session?.state ?? 'collecting-goal';
    return createResumeOnboardingScript(ctx.sessionId, ctx.repoRoot, state);
  });

  registry.set('droidforge.orchestrator_parallel', async ctx => {
    if (!ctx.params?.plan) {
      throw new Error('orchestrator_parallel prompt requires a plan parameter.');
    }
    return createOrchestratorParallelScript({
      repoRoot: ctx.repoRoot,
      plan: ctx.params.plan as ExecutionPlan
    });
  });

  registry.set('droidforge.returning_user', async ctx => {
    return createReturningUserScript(ctx.repoRoot);
  });

  registry.set('droidforge.cleanup', async ctx => createCleanupScript(ctx.repoRoot));

  registry.set('droidforge.add_droid', async ctx => {
    if (!ctx.sessionId) {
      throw new Error('add_droid prompt requires a sessionId');
    }
    return createAddDroidScript(ctx.sessionId, ctx.repoRoot);
  });

  registry.set('droidforge.show_guide', async ctx => createShowGuideScript(ctx.repoRoot));

  registry.set('droidforge.restore_snapshot', async ctx => createRestoreSnapshotScript(ctx.repoRoot));

  registry.set('droidforge.execution_status', async ctx => {
    const execs = deps.executionManager?.list() ?? [];
    return {
      name: 'execution_status',
      repoRoot: ctx.repoRoot,
      segments: [
        {
          kind: 'summary',
          title: 'Active & recent executions',
          lines: execs.length === 0
            ? ['(none)']
            : execs.map(ex => `• ${ex.id} — ${ex.status} (requests: ${ex.requests.length})`)
        }
      ]
    };
  });

  registry.set('droidforge.logs', async ctx => {
    const limit = typeof ctx.params?.limit === 'number' ? ctx.params.limit : 10;
    return createLogsScript(ctx.repoRoot, limit);
  });

  registry.set('droidforge.help', async () => createHelpScript());

  return registry;
}
