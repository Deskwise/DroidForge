import { appendLog } from '../logging.js';
import type { ExecutionManager } from '../execution/manager.js';
import type { StartExecutionInput, StartExecutionOutput, ToolDefinition } from '../types.js';

interface Deps {
  executionManager: ExecutionManager;
}

export function createStartExecutionTool(deps: Deps): ToolDefinition<StartExecutionInput, StartExecutionOutput> {
  return {
    name: 'start_execution',
    description: 'Begin running an execution plan.',
    handler: async input => {
      const record = deps.executionManager.start(input.executionId);
      await appendLog(input.repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'start_execution',
        status: 'ok',
        payload: { executionId: record.id }
      });
      return {
        executionId: record.id,
        status: record.status
      };
    }
  };
}
