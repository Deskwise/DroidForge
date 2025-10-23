import type { ExecutionPlan } from '../execution/manager.js';
import type { PromptScript } from './types.js';

interface ParallelContext {
  repoRoot: string;
  plan: ExecutionPlan;
}

export function createOrchestratorParallelScript(ctx: ParallelContext): PromptScript {
  if (!ctx.plan || !Array.isArray(ctx.plan.nodes)) {
    throw new Error('orchestrator_parallel prompt requires a plan with nodes.');
  }

  return {
    name: 'orchestrator_parallel',
    repoRoot: ctx.repoRoot,
    segments: [
      {
        kind: 'say',
        speaker: 'assistant',
        text: 'Scheduling your droid team to work in parallel…'
      },
      {
        kind: 'tool',
        name: 'plan_execution',
        input: {
          repoRoot: ctx.repoRoot,
          plan: ctx.plan
        }
      },
      {
        kind: 'tool',
        name: 'start_execution',
        input: {
          repoRoot: ctx.repoRoot,
          executionId: { fromTool: 'plan_execution.executionId' }
        }
      },
      {
        kind: 'tool',
        name: 'poll_execution',
        input: {
          repoRoot: ctx.repoRoot,
          executionId: { fromTool: 'plan_execution.executionId' }
        }
      },
      {
        kind: 'summary',
        title: 'Execution started',
        lines: [
          '• Use `/forge-status` to monitor live progress.',
          '• Use `/forge-logs --execution <id>` for detailed timeline events.',
          '• Use `/forge-guide` anytime for handbook updates.',
          '• Pause with `pause_execution` tool or resume with `resume_execution` if needed.'
        ]
      }
    ]
  };
}
