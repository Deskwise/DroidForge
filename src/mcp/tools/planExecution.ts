import { appendLog } from '../logging.js';
import type { ExecutionManager } from '../execution/manager.js';
import type { PlanExecutionInput, PlanExecutionOutput, ToolDefinition } from '../types.js';

interface Deps {
  executionManager: ExecutionManager;
}

export function createPlanExecutionTool(deps: Deps): ToolDefinition<PlanExecutionInput, PlanExecutionOutput> {
  return {
    name: 'plan_execution',
    description: 'Persist an execution plan and return the execution identifier.',
    handler: async input => {
      const record = deps.executionManager.plan(input.repoRoot, input.plan, input.executionId);
      await appendLog(input.repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'plan_execution',
        status: 'ok',
        payload: { executionId: record.id, nodes: input.plan.nodes?.length ?? 0 }
      });
      return {
        executionId: record.id,
        status: record.status
      };
    }
  };
}
