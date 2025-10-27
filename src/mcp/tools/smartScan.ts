import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { scanRepo } from '../../detectors/repoSignals.js';
import { scanScripts } from '../../detectors/scripts.js';
import type { SessionStore } from '../sessionStore.js';
import type { SmartScanInput, SmartScanOutput, ToolDefinition, OnboardingSession } from '../types.js';
import type { ScriptInventory } from '../../types.js';

interface SmartScanDeps {
  sessionStore: SessionStore;
}

function summarizeScan(
  repoRoot: string,
  frameworks: string[],
  scripts: ScriptInventory,
  prdPaths: string[],
  testConfigs: string[]
): string {
  const parts: string[] = [];
  const uniqueFrameworks = Array.from(new Set(frameworks));
  if (uniqueFrameworks.length > 0) {
    parts.push(`framework hints: ${uniqueFrameworks.join(', ')}`);
  }
  if (scripts.files.length + scripts.npmScripts.length > 0) {
    parts.push(`found ${scripts.files.length + scripts.npmScripts.length} automation script${scripts.files.length + scripts.npmScripts.length === 1 ? '' : 's'}`);
  }
  if (prdPaths.length > 0) {
    parts.push(`${prdPaths.length} PRD file${prdPaths.length === 1 ? '' : 's'} in docs`);
  }
  if (testConfigs.length > 0) {
    parts.push(`testing configured (${testConfigs.length} config${testConfigs.length === 1 ? '' : 's'})`);
  }
  if (parts.length === 0) {
    const repoName = path.basename(repoRoot);
    return `baseline scan for ${repoName}: no frameworks or scripts detected yet`;
  }
  return parts.join('; ');
}

function buildSignals(frameworks: string[], prdPaths: string[], testConfigs: string[], scripts: ScriptInventory): string[] {
  const signals: string[] = [];
  frameworks.forEach(f => signals.push(`framework:${f}`));
  if (prdPaths.length > 0) {
    signals.push(`prd:${prdPaths.length}`);
  }
  if (testConfigs.length > 0) {
    signals.push(`tests:${testConfigs.length}`);
  }
  if (scripts.files.length > 0) {
    signals.push(`scripts:${scripts.files.length}`);
  }
  if (scripts.npmScripts.length > 0) {
    signals.push(`npm:${scripts.npmScripts.length}`);
  }
  return signals;
}

export function createSmartScanTool(deps: SmartScanDeps): ToolDefinition<SmartScanInput, SmartScanOutput> {
  return {
    name: 'smart_scan',
    description: 'Analyze repository footprints to seed onboarding context. Generates sessionId if not provided.',
    handler: async input => {
      const { repoRoot, sessionId } = input;
      // Generate a sessionId if not provided
      const finalSessionId = sessionId || randomUUID();
      const [repoSignals, scripts] = await Promise.all([
        scanRepo(repoRoot),
        scanScripts(repoRoot)
      ]);

      const summary = summarizeScan(
        repoRoot,
        repoSignals.frameworks,
        scripts,
        repoSignals.prdPaths,
        repoSignals.testConfigs
      );

      const signals = buildSignals(repoSignals.frameworks, repoSignals.prdPaths, repoSignals.testConfigs, scripts);
      const hints: string[] = [];
      if (repoSignals.prdContent?.vision) {
        hints.push('Vision statement detected in PRD files.');
      }
      if (scripts.files.length > 0) {
        hints.push('Shell/Make scripts available for conversion into droids.');
      }
      if (repoSignals.testConfigs.length > 0) {
        hints.push('Testing frameworks configured.');
      }

      const session: OnboardingSession = {
        sessionId: finalSessionId,
        repoRoot,
        createdAt: new Date().toISOString(),
        state: 'collecting-goal',
        scan: {
          summary,
          frameworks: repoSignals.frameworks,
          testConfigs: repoSignals.testConfigs,
          prdPaths: repoSignals.prdPaths,
          scripts: [...scripts.files, ...scripts.npmScripts.map(s => s.path)],
          prdContent: repoSignals.prdContent ?? null
        }
      };

      await deps.sessionStore.save(repoRoot, session);

      return {
        summary,
        signals,
        primaryLanguage: null,
        hints,
        prdFiles: repoSignals.prdPaths
      };
    }
  };
}
