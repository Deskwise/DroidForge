import { appendLog } from '../logging.js';
import type { ExecutionManager } from '../execution/manager.js';
import type { ResumeExecutionInput, ResumeExecutionOutput, ToolDefinition } from '../types.js';

interface Deps {
  executionManager: ExecutionManager;
}

export function createResumeExecutionTool(deps: Deps): ToolDefinition<ResumeExecutionInput, ResumeExecutionOutput> {
  return {
    name: 'resume_execution',
    description: 'Resume a paused execution.',
    handler: async input => {
      const record = deps.executionManager.resume(input.executionId);
      await appendLog(input.repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'resume_execution',
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
