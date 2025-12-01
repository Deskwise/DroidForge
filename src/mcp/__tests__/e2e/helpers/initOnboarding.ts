import { createConfirmMethodologyTool } from '../../../tools/confirmMethodology.js';
import { SessionStore } from '../../../sessionStore.js';
import { ExecutionManager } from '../../../execution/manager.js';

type Deps = { sessionStore: SessionStore; executionManager: ExecutionManager };

export async function completeOnboardingSetup(deps: Deps, repoRoot: string, sessionId: string, methodology = 'agile') {
  // Populate required discovery and delivery fields which many tools validate.
  // This helper intentionally does NOT run scan or record the goal so it can be
  // called after test code that already ran those steps without clobbering data.
  const sessionStore = deps.sessionStore;
  const session = await sessionStore.load(repoRoot, sessionId);
  if (session) {
    // Set legacy flat fields for backward compatibility
    session.targetAudience ||= 'Test users';
    session.timelineConstraints ||= '3 months';
    session.qualityVsSpeed ||= 'Balanced';
    session.teamSize ||= '3';
    session.experienceLevel ||= 'Mid-level';
    session.budgetConstraints ||= '$50k';
    session.deploymentRequirements ||= 'Cloud';
    session.securityRequirements ||= 'Standard';
    session.scalabilityNeeds ||= 'Medium';
    
    // Also populate nested onboarding structure (new format)
    if (!session.onboarding) {
      session.onboarding = {
        requiredData: {},
        collectionMetadata: {},
        methodology: {},
        team: {}
      };
    }
    
    session.onboarding.requiredData = {
      projectVision: { value: session.projectVision || 'Test project vision', confidence: 1.0, source: 'test' },
      targetAudience: { value: session.targetAudience, confidence: 1.0, source: 'test' },
      timelineConstraints: { value: session.timelineConstraints, confidence: 1.0, source: 'test' },
      qualityVsSpeed: { value: session.qualityVsSpeed, confidence: 1.0, source: 'test' },
      teamSize: { value: session.teamSize, confidence: 1.0, source: 'test' },
      experienceLevel: { value: session.experienceLevel, confidence: 1.0, source: 'test' },
      budgetConstraints: { value: session.budgetConstraints, confidence: 1.0, source: 'test' },
      deploymentRequirements: { value: session.deploymentRequirements, confidence: 1.0, source: 'test' },
      securityRequirements: { value: session.securityRequirements, confidence: 1.0, source: 'test' },
      scalabilityNeeds: { value: session.scalabilityNeeds, confidence: 1.0, source: 'test' }
    };
    
    await sessionStore.save(repoRoot, session);
  }

  // Confirm methodology (some flows expect this flag be set before selection).
  // Do NOT select methodology here so tests retain control over the explicit
  // selection step (selecting moves session to 'roster').
  const confirm = createConfirmMethodologyTool(deps);
  await confirm.handler({ repoRoot, sessionId, methodology });
}
