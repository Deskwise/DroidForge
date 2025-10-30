#!/usr/bin/env node
import { mkdtempSync, rmSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createSelectMethodologyTool } from '../dist/mcp/tools/selectMethodology.js';
import { createForgeRosterTool } from '../dist/mcp/tools/forgeRoster.js';
import { createRecommendDroidsTool } from '../dist/mcp/tools/recommendDroids.js';
import { SessionStore } from '../dist/mcp/sessionStore.js';

const sessionStore = new SessionStore();
const repoRoot = mkdtempSync(path.join(tmpdir(), 'droidforge-uat-'));
const sessionId = 'uat-session';

const baseSession = {
  sessionId,
  repoRoot,
  createdAt: new Date().toISOString(),
  state: 'collecting-goal',
  projectVision: 'Wellness assistant that syncs with wearables',
  targetAudience: undefined,
  timelineConstraints: undefined,
  qualityVsSpeed: undefined,
  teamSize: undefined,
  experienceLevel: undefined,
  budgetConstraints: undefined,
  deploymentRequirements: undefined,
  securityRequirements: undefined,
  scalabilityNeeds: undefined
};

async function run() {
  await sessionStore.save(repoRoot, baseSession);

  const selectTool = createSelectMethodologyTool({ sessionStore });
  const recommendTool = createRecommendDroidsTool({ sessionStore });
  const forgeTool = createForgeRosterTool({ sessionStore });

  let gateErrorSeen = false;
  try {
    await selectTool.handler({ repoRoot, sessionId, choice: 'agile', otherText: '' });
  } catch (error) {
    gateErrorSeen = true;
    console.log('[Gate] Core discovery blocked as expected:', error.message);
  }
  if (!gateErrorSeen) {
    throw new Error('Expected select_methodology to block when Core 6 are incomplete.');
  }

  const readySession = {
    ...baseSession,
    targetAudience: 'Busy parents who want calm nudges',
    timelineConstraints: 'Pilot in 6 weeks',
    qualityVsSpeed: 'Quality over raw speed',
    teamSize: 'Solo with one UX collaborator',
    experienceLevel: 'Intermediate dev comfortable with TypeScript'
  };
  await sessionStore.save(repoRoot, readySession);

  const methodologyResult = await selectTool.handler({ repoRoot, sessionId, choice: '2', otherText: '' });
  console.log('[Methodology] Stored selection:', methodologyResult.methodology);

  let forgeBlocked = false;
  try {
    await forgeTool.handler({ repoRoot, sessionId });
  } catch (error) {
    forgeBlocked = true;
    console.log('[Forge Gate] Delivery requirements missing as expected:', error.message);
  }
  if (!forgeBlocked) {
    throw new Error('Expected forge_roster to block when delivery data is incomplete.');
  }

  const completeSession = {
    ...readySession,
    methodology: methodologyResult.methodology,
    state: 'collecting-goal',
    budgetConstraints: 'Bootstrapped budget, prefer low-cost tooling',
    deploymentRequirements: 'Start on Vercel, scale to AWS when adoption grows',
    securityRequirements: 'Needs HIPAA-style data handling',
    scalabilityNeeds: 'Expecting 5k weekly active users at peak'
  };
  await sessionStore.save(repoRoot, completeSession);

  const suggestions = await recommendTool.handler({ repoRoot, sessionId });
  console.log('[Roster] Suggested roles:', suggestions.suggestions.map(s => s.id).join(', '));

  const forgeResult = await forgeTool.handler({ repoRoot, sessionId });
  console.log('[Forge] Created files:', forgeResult.outputPaths.length);

  const manifestExists = await fs
    .access(path.join(repoRoot, '.factory', 'droids-manifest.json'))
    .then(() => true)
    .catch(() => false);
  if (!manifestExists) {
    throw new Error('Expected manifest to be created after forging.');
  }

  console.log('UAT check completed successfully.');
}

run()
  .catch(error => {
    console.error('UAT check failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });
