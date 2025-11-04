import { createConfirmMethodologyTool } from '../../../tools/confirmMethodology.js';
import { createSelectMethodologyTool } from '../../../tools/selectMethodology.js';
import { SessionStore } from '../../../sessionStore.js';
import { ExecutionManager } from '../../../execution/manager.js';
import { createSmartScanTool } from '../../../tools/smartScan.js';
import { createRecordProjectGoalTool } from '../../../tools/recordProjectGoal.js';

type Deps = { sessionStore: SessionStore; executionManager: ExecutionManager };

export async function completeOnboardingSetup(deps: Deps, repoRoot: string, sessionId: string, methodology = 'agile') {
  // Populate required discovery and delivery fields which many tools validate.
  // This helper intentionally does NOT run scan or record the goal so it can be
  // called after test code that already ran those steps without clobbering data.
  const sessionStore = deps.sessionStore;
  const session = await sessionStore.load(repoRoot, sessionId);
  if (session) {
    session.targetAudience ||= 'Test users';
    session.timelineConstraints ||= '3 months';
    session.qualityVsSpeed ||= 'Balanced';
    session.teamSize ||= '3';
    session.experienceLevel ||= 'Mid-level';
    session.budgetConstraints ||= '$50k';
    session.deploymentRequirements ||= 'Cloud';
    session.securityRequirements ||= 'Standard';
    session.scalabilityNeeds ||= 'Medium';
    await sessionStore.save(repoRoot, session);
  }

  // Confirm methodology (some flows expect this flag be set before selection).
  // Do NOT select methodology here so tests retain control over the explicit
  // selection step (selecting moves session to 'roster').
  const confirm = createConfirmMethodologyTool(deps as any);
  await confirm.handler({ repoRoot, sessionId, methodology });
}
