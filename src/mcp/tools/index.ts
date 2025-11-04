import type { SessionStore } from '../sessionStore.js';
import type { ToolDefinition } from '../types.js';
import { createSmartScanTool } from './smartScan.js';
import { createRecordProjectGoalTool } from './recordProjectGoal.js';
import { createSelectMethodologyTool } from './selectMethodology.js';
import { createRecommendDroidsTool } from './recommendDroids.js';
import { createForgeRosterTool } from './forgeRoster.js';
import { createGenerateUserGuideTool } from './generateUserGuide.js';
import { createInstallCommandsTool } from './installCommands.js';
import { createInstallGlobalCommandsTool } from './installGlobalCommands.js';
import { createCleanupRepoTool } from './cleanupRepo.js';
import { createSnapshotTool } from './createSnapshot.js';
import { createRestoreSnapshotTool } from './restoreSnapshot.js';
import { createFetchLogsTool } from './fetchLogs.js';
import { createGetStatusTool } from './getStatus.js';
import { createAddCustomDroidTool } from './addCustomDroid.js';
import { createConfirmMethodologyTool } from './confirmMethodology.js';
import { createRecordOnboardingDataTool } from './recordOnboardingData.js';
import { createListSnapshotsTool } from './listSnapshots.js';
import { createGetOnboardingProgressTool } from './getOnboardingProgress.js';
export interface ToolFactoryDeps {
  sessionStore: SessionStore;
}

export function createToolRegistry(deps: ToolFactoryDeps): Map<string, ToolDefinition<any, any>> {
  const registry = new Map<string, ToolDefinition<any, any>>();

  const tools: ToolDefinition<any, any>[] = [
    createSmartScanTool(deps),
    createRecordProjectGoalTool(deps),
    createRecordOnboardingDataTool(deps),
    createConfirmMethodologyTool(deps),
    createSelectMethodologyTool(deps),
    createRecommendDroidsTool(deps),
    createForgeRosterTool(deps),
    createGenerateUserGuideTool(deps),
    createAddCustomDroidTool(),
    createInstallCommandsTool(),
    createInstallGlobalCommandsTool(),
    createCleanupRepoTool(),
    createSnapshotTool(),
    createListSnapshotsTool(),
    createGetOnboardingProgressTool(deps),
    createRestoreSnapshotTool(),
    createFetchLogsTool(),
    createGetStatusTool()
  ];

  for (const tool of tools) {
    registry.set(tool.name, tool);
  }
  return registry;
}
