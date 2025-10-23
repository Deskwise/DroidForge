import { appendLog } from '../logging.js';
import type { ExecutionManager } from '../execution/manager.js';
import type { PauseExecutionInput, PauseExecutionOutput, ToolDefinition } from '../types.js';

interface Deps {
  executionManager: ExecutionManager;
}

export function createPauseExecutionTool(deps: Deps): ToolDefinition<PauseExecutionInput, PauseExecutionOutput> {
  return {
    name: 'pause_execution',
    description: 'Pause a running execution after its current tasks finish.',
    handler: async input => {
      const record = deps.executionManager.pause(input.executionId);
      await appendLog(input.repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'pause_execution',
        status: 'ok',
        payload: { executionId: record.id, status: record.status }
      });
      return {
        executionId: record.id,
        status: record.status
      };
    }
  };
}
