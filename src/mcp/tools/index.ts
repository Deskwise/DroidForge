import type { SessionStore } from '../sessionStore.js';
import type { ToolDefinition } from '../types.js';
import { createSmartScanTool } from './smartScan.js';
import { createRecordProjectGoalTool } from './recordProjectGoal.js';
import { createSelectMethodologyTool } from './selectMethodology.js';
import { createRecommendDroidsTool } from './recommendDroids.js';
import { createForgeRosterTool } from './forgeRoster.js';
import { createGenerateUserGuideTool } from './generateUserGuide.js';
import { createInstallCommandsTool } from './installCommands.js';
import { createCleanupRepoTool } from './cleanupRepo.js';
import { createSnapshotTool } from './createSnapshot.js';
import { createRestoreSnapshotTool } from './restoreSnapshot.js';
import { createFetchLogsTool } from './fetchLogs.js';
import { createGetStatusTool } from './getStatus.js';
import { createAddCustomDroidTool } from './addCustomDroid.js';
import { createListSnapshotsTool } from './listSnapshots.js';
import { routeOrchestratorTool, routeSpecialistTool } from './routeRequests.js';

export interface ToolFactoryDeps {
  sessionStore: SessionStore;
}

export function createToolRegistry(deps: ToolFactoryDeps): Map<string, ToolDefinition<any, any>> {
  const registry = new Map<string, ToolDefinition<any, any>>();
  const tools: ToolDefinition<any, any>[] = [
    createSmartScanTool(deps),
    createRecordProjectGoalTool(deps),
    createSelectMethodologyTool(deps),
    createRecommendDroidsTool(deps),
    createForgeRosterTool(deps),
    createGenerateUserGuideTool(deps),
    createAddCustomDroidTool(),
    createInstallCommandsTool(),
    createCleanupRepoTool(),
    createSnapshotTool(),
    createListSnapshotsTool(),
    createRestoreSnapshotTool(),
    createFetchLogsTool(),
    createGetStatusTool(),
    routeOrchestratorTool,
    routeSpecialistTool
  ];

  for (const tool of tools) {
    registry.set(tool.name, tool);
  }
  return registry;
}
