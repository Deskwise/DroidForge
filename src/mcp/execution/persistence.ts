import { writeFile, readFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import type { 
  ExecutionStatus, 
  NodeStatus, 
  ResourceLockMode,
  ExecutionPlan,
  ExecutionPlanNode,
  TimelineEvent 
} from './manager.js';

export interface PersistedExecution {
  id: string;
  repoRoot: string;
  createdAt: string;
  status: ExecutionStatus;
  plan?: ExecutionPlan;
  concurrency: number;
  nodes: Array<{
    nodeId: string;
    spec: ExecutionPlanNode;
    status: NodeStatus;
    startedAt?: string;
    finishedAt?: string;
  }>;
  readyQueue: string[];
  runningNodes: string[];
  locks: Array<{ resource: string; mode: ResourceLockMode; owners: string[] }>;
}

/**
 * ExecutionPersistence handles saving and loading execution state to/from disk.
 * Enables crash recovery and state inspection.
 */
export class ExecutionPersistence {
  /**
   * Get the directory path for an execution.
   * 
   * @param repoRoot Repository root path
   * @param executionId Execution ID
   * @returns Directory path
   */
  private getExecutionDir(repoRoot: string, executionId: string): string {
    return join(repoRoot, '.droidforge', 'exec', executionId);
  }

  /**
   * Save execution state to disk.
   * 
   * @param repoRoot Repository root path
   * @param record Execution record
   * @param lockState Resource lock state
   */
  async save(
    repoRoot: string,
    record: any,
    lockState: Map<string, { mode: ResourceLockMode; owners: string[] }>
  ): Promise<void> {
    const dir = this.getExecutionDir(repoRoot, record.id);
    await mkdir(dir, { recursive: true });

    const data: PersistedExecution = {
      id: record.id,
      repoRoot: record.repoRoot,
      createdAt: record.createdAt,
      status: record.status,
      plan: record.plan,
      concurrency: record.concurrency,
      nodes: Array.from(record.nodes.entries()).map((entry: any) => {
        const [id, state] = entry;
        return {
          nodeId: id,
          spec: state.spec,
          status: state.status,
          startedAt: state.startedAt,
          finishedAt: state.finishedAt
        };
      }),
      readyQueue: [...record.readyQueue],
      runningNodes: [...record.runningNodes],
      locks: Array.from(lockState.entries()).map(([resource, lock]) => ({
        resource,
        mode: lock.mode,
        owners: lock.owners
      }))
    };

    await this.writeJsonAtomic(join(dir, 'state.json'), data);

    // Also append last timeline event if exists
    if (record.timeline && record.timeline.length > 0) {
      const lastEvent = record.timeline[record.timeline.length - 1];
      await this.appendTimeline(dir, lastEvent);
    }
  }

  /**
   * Load execution state from disk.
   * 
   * @param repoRoot Repository root path
   * @param executionId Execution ID
   * @returns Persisted execution state or null if not found
   */
  async load(repoRoot: string, executionId: string): Promise<PersistedExecution | null> {
    try {
      const dir = this.getExecutionDir(repoRoot, executionId);
      const data = await readFile(join(dir, 'state.json'), 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Append an event to the timeline log.
   * 
   * @param dir Execution directory
   * @param event Timeline event
   */
  async appendTimeline(dir: string, event: TimelineEvent): Promise<void> {
    const timelinePath = join(dir, 'timeline.jsonl');
    await writeFile(timelinePath, JSON.stringify(event) + '\n', { flag: 'a' });
  }

  /**
   * Load the complete timeline from disk.
   * 
   * @param repoRoot Repository root path
   * @param executionId Execution ID
   * @returns Array of timeline events
   */
  async loadTimeline(repoRoot: string, executionId: string): Promise<TimelineEvent[]> {
    try {
      const dir = this.getExecutionDir(repoRoot, executionId);
      const data = await readFile(join(dir, 'timeline.jsonl'), 'utf-8');
      return data
        .trim()
        .split('\n')
        .filter(line => line.length > 0)
        .map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }

  /**
   * List all execution IDs that have persisted state.
   * 
   * @param repoRoot Repository root path
   * @returns Array of execution IDs
   */
  async listExecutions(repoRoot: string): Promise<string[]> {
    try {
      const execDir = join(repoRoot, '.droidforge', 'exec');
      if (!existsSync(execDir)) {
        return [];
      }
      const entries = await readdir(execDir, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch {
      return [];
    }
  }

  /**
   * Write JSON atomically (write to temp file, then rename).
   * 
   * @param filePath Target file path
   * @param data Data to write
   */
  private async writeJsonAtomic(filePath: string, data: any): Promise<void> {
    const tempPath = `${filePath}.tmp`;
    await writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    
    // Use fs.rename for atomic operation
    const { rename } = await import('node:fs/promises');
    await rename(tempPath, filePath);
  }

  /**
   * Check if an execution has persisted state.
   * 
   * @param repoRoot Repository root path
   * @param executionId Execution ID
   * @returns true if state exists, false otherwise
   */
  exists(repoRoot: string, executionId: string): boolean {
    const dir = this.getExecutionDir(repoRoot, executionId);
    return existsSync(join(dir, 'state.json'));
  }

  /**
   * Delete persisted state for an execution.
   * 
   * @param repoRoot Repository root path
   * @param executionId Execution ID
   */
  async delete(repoRoot: string, executionId: string): Promise<void> {
    const dir = this.getExecutionDir(repoRoot, executionId);
    if (existsSync(dir)) {
      const { rm } = await import('node:fs/promises');
      await rm(dir, { recursive: true, force: true });
    }
  }
}
