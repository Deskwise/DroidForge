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
import { createRecordOnboardingDataTool } from './recordOnboardingData.js';
import { createListSnapshotsTool } from './listSnapshots.js';
import { createGetOnboardingProgressTool } from './getOnboardingProgress.js';
import { createRouteTools } from './routeRequests.js';
import { createPlanExecutionTool } from './planExecution.js';
import { createStartExecutionTool } from './startExecution.js';
import { createPollExecutionTool } from './pollExecution.js';
import { createPauseExecutionTool } from './pauseExecution.js';
import { createResumeExecutionTool } from './resumeExecution.js';
import { createAbortExecutionTool } from './abortExecution.js';
import { createMergeExecutionTool } from './mergeExecution.js';
import { createListExecutionsTool } from './listExecutions.js';
import { createNextExecutionTaskTool } from './nextExecutionTask.js';
import { createCompleteExecutionTaskTool } from './completeExecutionTask.js';

import type { ExecutionManager } from '../execution/manager.js';

export interface ToolFactoryDeps {
  sessionStore: SessionStore;
  executionManager: ExecutionManager;
}

export function createToolRegistry(deps: ToolFactoryDeps): Map<string, ToolDefinition<any, any>> {
  const registry = new Map<string, ToolDefinition<any, any>>();
  const { routeOrchestratorTool, routeSpecialistTool } = createRouteTools({
    manager: deps.executionManager
  });

  const tools: ToolDefinition<any, any>[] = [
    createSmartScanTool(deps),
    createRecordProjectGoalTool(deps),
    createRecordOnboardingDataTool(deps),
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
    createPlanExecutionTool(deps),
    createStartExecutionTool(deps),
    createPollExecutionTool(deps),
    createPauseExecutionTool(deps),
    createResumeExecutionTool(deps),
    createAbortExecutionTool(deps),
    createMergeExecutionTool(deps),
    createListExecutionsTool(deps),
    createFetchLogsTool(),
    createGetStatusTool(),
    createNextExecutionTaskTool(deps),
    createCompleteExecutionTaskTool(deps),
    routeOrchestratorTool,
    routeSpecialistTool
  ];

  for (const tool of tools) {
    registry.set(tool.name, tool);
  }
  return registry;
}
