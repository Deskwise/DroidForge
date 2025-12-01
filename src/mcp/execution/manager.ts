import { randomUUID } from 'node:crypto';
import { ExecutionLock } from './synchronization.js';
import { LockManager } from './lockManager.js';
import { DeadlockDetector } from './deadlockDetector.js';
import { ExecutionPersistence } from './persistence.js';

export type ExecutionStatus = 'planned' | 'running' | 'paused' | 'completed' | 'aborted' | 'failed';
export type NodeStatus = 'pending' | 'ready' | 'running' | 'completed' | 'failed';
export type ResourceLockMode = 'read' | 'write' | 'analysis';

export interface ExecutionPlanNode {
  nodeId: string;
  droidId: string;
  title?: string;
  description?: string;
  mode?: ResourceLockMode;
  resourceClaims?: string[];
  metadata?: Record<string, unknown>;
}

export interface ExecutionPlanEdge {
  from: string;
  to: string;
}

export interface ExecutionPlan {
  nodes: ExecutionPlanNode[];
  edges: ExecutionPlanEdge[];
  concurrency?: number;
}

export interface TimelineEvent {
  timestamp: string;
  executionId: string;
  nodeId?: string;
  event: string;
  detail?: Record<string, unknown>;
}

interface NodeState {
  spec: ExecutionPlanNode;
  status: NodeStatus;
  dependents: string[];
  remainingDependencies: number;
  startedAt?: string;
  finishedAt?: string;
}

interface ExecutionRecord {
  id: string;
  repoRoot: string;
  createdAt: string;
  status: ExecutionStatus;
  plan?: ExecutionPlan;
  nodes: Map<string, NodeState>;
  readyQueue: string[];
  runningNodes: Set<string>;
  locks: Map<string, string>;
  requests: Array<{ droidId: string; request: string }>;
  timeline: TimelineEvent[];
  lastUpdated: string;
  concurrency: number;
}

export interface EnqueuePayload {
  executionId?: string;
  repoRoot: string;
  droidId: string;
  request: string;
}

export interface EnqueueResult {
  executionId: string;
}

export interface PollSnapshot {
  executionId: string;
  status: ExecutionStatus;
  timeline: TimelineEvent[];
  requests: Array<{ droidId: string; request: string }>;
  plan?: ExecutionPlan;
  nodes: Array<{
    nodeId: string;
    droidId: string;
    status: NodeStatus;
    startedAt?: string;
    finishedAt?: string;
  }>;
}

export interface NodeSchedule {
  nodeId: string;
  droidId: string;
  title?: string;
  description?: string;
  resourceClaims: string[];
}

export class ExecutionManager {
  private readonly executions = new Map<string, ExecutionRecord>();
  private readonly locks = new Map<string, ExecutionLock>();
  private readonly resourceLocks = new Map<string, LockManager>();
  private readonly deadlockDetector = new DeadlockDetector();
  private readonly persistence = new ExecutionPersistence();
  private readonly pendingPersists = new Set<Promise<void>>();

  /**
   * Get or create an execution lock for the given execution ID.
   * @param executionId The execution ID
   * @returns The execution lock
   */
  private getExecutionLock(executionId: string): ExecutionLock {
    if (!this.locks.has(executionId)) {
      this.locks.set(executionId, new ExecutionLock());
    }
    return this.locks.get(executionId)!;
  }

  /**
   * Get or create a resource lock manager for the given execution ID.
   * @param executionId The execution ID
   * @returns The resource lock manager
   */
  private getResourceLockManager(executionId: string): LockManager {
    if (!this.resourceLocks.has(executionId)) {
      this.resourceLocks.set(executionId, new LockManager());
    }
    return this.resourceLocks.get(executionId)!;
  }

  enqueue(payload: EnqueuePayload): EnqueueResult {
    let record: ExecutionRecord | undefined;
    if (payload.executionId) {
      record = this.executions.get(payload.executionId);
    }
    if (!record) {
      const executionId = payload.executionId ?? this.generateExecutionId();
      record = this.createRecord(executionId, payload.repoRoot);
      this.executions.set(executionId, record);
    }

    record.requests.push({ droidId: payload.droidId, request: payload.request });
    this.appendEvent(record, {
      event: 'request.received',
      detail: { droidId: payload.droidId, snippet: payload.request.slice(0, 120) }
    });

    return { executionId: record.id };
  }

  plan(repoRoot: string, plan: ExecutionPlan, executionId?: string): ExecutionRecord {
    let record: ExecutionRecord | undefined;
    if (executionId) {
      record = this.executions.get(executionId);
    }
    if (!record) {
      record = this.createRecord(executionId ?? this.generateExecutionId(), repoRoot);
      this.executions.set(record.id, record);
    }

    record.plan = plan;
    record.concurrency = Math.max(1, plan.concurrency ?? 2);
    this.initialiseNodes(record, plan);
    record.status = 'planned';
    this.appendEvent(record, { event: 'execution.planned', detail: { nodes: plan.nodes?.length ?? 0 } });
    return record;
  }

  start(executionId: string): ExecutionRecord {
    const record = this.requireExecution(executionId);
    if (record.status === 'completed' || record.status === 'failed' || record.status === 'aborted') {
      return record;
    }
    record.status = 'running';
    this.appendEvent(record, { event: 'execution.started' });
    this.promoteReady(record);
    return record;
  }

  async requestNext(executionId: string): Promise<NodeSchedule | null> {
    const lock = this.getExecutionLock(executionId);
    return lock.runExclusive(async () => {
      const task = await this.requestNextUnsafe(executionId);
      
      // Check for deadlock if no task could be scheduled
      if (!task) {
        this.checkForDeadlock(executionId);
      }
      
      return task;
    });
  }

  private async requestNextUnsafe(executionId: string): Promise<NodeSchedule | null> {
    const record = this.requireExecution(executionId);
    if (record.status !== 'running') {
      return null;
    }
    if (record.readyQueue.length === 0) {
      return null;
    }
    if (record.runningNodes.size >= record.concurrency) {
      return null;
    }

    const lockManager = this.getResourceLockManager(executionId);

    // Find first node that can acquire its locks
    for (let i = 0; i < record.readyQueue.length; i++) {
      const nodeId = record.readyQueue[i];
      const nodeState = record.nodes.get(nodeId)!;
      const claims = nodeState.spec.resourceClaims ?? [];
      const mode = nodeState.spec.mode ?? 'write';

      if (await lockManager.tryAcquire(claims, mode, nodeId)) {
        // Remove from queue
        record.readyQueue.splice(i, 1);

        // Mark running
        nodeState.status = 'running';
        nodeState.startedAt = new Date().toISOString();
        record.runningNodes.add(nodeId);

        this.appendEvent(record, {
          event: 'task.started',
          nodeId,
          detail: { droidId: nodeState.spec.droidId, mode, claims }
        });

        return {
          nodeId,
          droidId: nodeState.spec.droidId,
          title: nodeState.spec.title,
          description: nodeState.spec.description,
          resourceClaims: claims
        };
      }
    }

    return null; // No ready node can acquire locks
  }

  /**
   * Check for deadlock conditions and pause execution if detected.
   * 
   * @param executionId The execution ID
   */
  private checkForDeadlock(executionId: string): void {
    const record = this.requireExecution(executionId);
    const lockManager = this.getResourceLockManager(executionId);

    const deadlock = this.deadlockDetector.detect(
      record.readyQueue,
      record.runningNodes,
      record.nodes,
      lockManager.getLockState()
    );

    if (deadlock) {
      record.status = 'paused';
      this.appendEvent(record, {
        event: 'execution.deadlock',
        detail: {
          blockedNodes: deadlock.blockedNodes,
          cycle: deadlock.cycle,
          lockDependencies: deadlock.lockDependencies,
          suggestion: 'Review resource claims or adjust task ordering'
        }
      });
    }
  }

  /**
   * Persist execution state to disk.
   *
   * @param executionId The execution ID
   */
  private async persistState(executionId: string): Promise<void> {
    const record = this.requireExecution(executionId);
    const lockManager = this.getResourceLockManager(executionId);
    const persistPromise = this.persistence.save(record.repoRoot, record, lockManager.getLockState());
    this.pendingPersists.add(persistPromise);
    
    try {
      await persistPromise;
    } finally {
      this.pendingPersists.delete(persistPromise);
    }
  }
  
  /**
   * Shutdown the execution manager, waiting for all pending operations to complete.
   * This is crucial for tests to ensure clean teardown.
   */
  async shutdown(): Promise<void> {
    if (this.pendingPersists.size > 0) {
      await Promise.all(Array.from(this.pendingPersists));
    }
  }

  async completeNode(executionId: string, nodeId: string, detail?: Record<string, unknown>): Promise<void> {
    const lock = this.getExecutionLock(executionId);
    return lock.runExclusive(async () => {
      this.completeNodeUnsafe(executionId, nodeId, detail);
    });
  }

  private async completeNodeUnsafe(executionId: string, nodeId: string, detail?: Record<string, unknown>): Promise<void> {
    const record = this.requireExecution(executionId);
    const nodeState = this.requireNode(record, nodeId);
    if (nodeState.status !== 'running') {
      throw new Error(`Node ${nodeId} is not running.`);
    }
    nodeState.status = 'completed';
    nodeState.finishedAt = new Date().toISOString();
    record.runningNodes.delete(nodeId);
    
    // Release resource locks
    const lockManager = this.getResourceLockManager(executionId);
    const claims = nodeState.spec.resourceClaims ?? [];
    await lockManager.release(claims, nodeId);
    
    this.appendEvent(record, { event: 'task.completed', nodeId, detail });
    this.notifyDependents(record, nodeId);
    this.promoteReady(record);
    this.checkCompletion(record);
    
    // Persist state after completing node
    await this.persistState(executionId);
  }

  async failNode(executionId: string, nodeId: string, detail?: Record<string, unknown>): Promise<void> {
    const lock = this.getExecutionLock(executionId);
    return lock.runExclusive(async () => {
      this.failNodeUnsafe(executionId, nodeId, detail);
    });
  }

  private async failNodeUnsafe(executionId: string, nodeId: string, detail?: Record<string, unknown>): Promise<void> {
    const record = this.requireExecution(executionId);
    const nodeState = this.requireNode(record, nodeId);
    nodeState.status = 'failed';
    nodeState.finishedAt = new Date().toISOString();
    record.runningNodes.delete(nodeId);
    
    // Release resource locks
    const lockManager = this.getResourceLockManager(executionId);
    const claims = nodeState.spec.resourceClaims ?? [];
    await lockManager.release(claims, nodeId);
    
    record.status = 'failed';
    this.appendEvent(record, { event: 'task.failed', nodeId, detail });
    
    // Persist state after failing node
    await this.persistState(executionId);
  }

  poll(executionId: string): PollSnapshot {
    const record = this.requireExecution(executionId);
    return {
      executionId: record.id,
      status: record.status,
      timeline: [...record.timeline],
      requests: [...record.requests],
      plan: record.plan,
      nodes: Array.from(record.nodes.values()).map(state => ({
        nodeId: state.spec.nodeId,
        droidId: state.spec.droidId,
        status: state.status,
        startedAt: state.startedAt,
        finishedAt: state.finishedAt
      }))
    };
  }

  list(): ExecutionRecord[] {
    return Array.from(this.executions.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  pause(executionId: string): ExecutionRecord {
    const record = this.requireExecution(executionId);
    if (record.status === 'running') {
      record.status = 'paused';
      this.appendEvent(record, { event: 'execution.paused' });
    }
    return record;
  }

  resume(executionId: string): ExecutionRecord {
    const record = this.requireExecution(executionId);
    if (record.status === 'paused') {
      record.status = 'running';
      this.appendEvent(record, { event: 'execution.resumed' });
      this.promoteReady(record);
    }
    return record;
  }

  abort(executionId: string): ExecutionRecord {
    const record = this.requireExecution(executionId);
    record.status = 'aborted';
    record.runningNodes.clear();
    record.readyQueue.length = 0;
    record.locks.clear();
    this.appendEvent(record, { event: 'execution.aborted' });
    return record;
  }

  merge(executionId: string): ExecutionRecord {
    const record = this.requireExecution(executionId);
    if (record.status === 'running' || record.status === 'planned' || record.status === 'paused') {
      record.status = 'completed';
      this.appendEvent(record, { event: 'execution.completed' });
    }
    return record;
  }

  /**
   * Recover all executions from persisted state.
   * Called on server startup to restore crashed executions.
   * 
   * @param repoRoot Repository root path
   * @returns Array of recovered execution IDs
   */
  async recoverAll(repoRoot: string): Promise<string[]> {
    const executionIds = await this.persistence.listExecutions(repoRoot);
    const recovered: string[] = [];

    for (const executionId of executionIds) {
      const persisted = await this.persistence.load(repoRoot, executionId);
      if (persisted && persisted.status === 'running') {
        // Mark as paused for user to resume
        persisted.status = 'paused';
        this.restoreFromPersisted(persisted);
        recovered.push(persisted.id);
      }
    }

    return recovered;
  }

  /**
   * Restore an execution from persisted state.
   * 
   * @param persisted Persisted execution state
   */
  private restoreFromPersisted(persisted: any): void {
    const record = this.createRecord(persisted.id, persisted.repoRoot);
    record.createdAt = persisted.createdAt;
    record.status = persisted.status;
    record.plan = persisted.plan;
    record.concurrency = persisted.concurrency;

    // Restore nodes
    record.nodes.clear();
    for (const nodeData of persisted.nodes) {
      record.nodes.set(nodeData.nodeId, {
        spec: nodeData.spec,
        status: nodeData.status,
        dependents: [], // Will be rebuilt from plan
        remainingDependencies: 0,
        startedAt: nodeData.startedAt,
        finishedAt: nodeData.finishedAt
      });
    }

    // Restore queues
    record.readyQueue = [...persisted.readyQueue];
    record.runningNodes = new Set(persisted.runningNodes);

    // Restore resource locks
    const lockManager = this.getResourceLockManager(persisted.id);
    for (const lockData of persisted.locks) {
      for (const owner of lockData.owners) {
        lockManager.tryAcquire([lockData.resource], lockData.mode, owner);
      }
    }

    this.executions.set(persisted.id, record);
  }

  private initialiseNodes(record: ExecutionRecord, plan: ExecutionPlan): void {
    record.nodes.clear();
    record.readyQueue.length = 0;
    record.runningNodes.clear();
    record.locks.clear();

    const dependentsMap = new Map<string, string[]>();
    const dependencyCount = new Map<string, number>();

    for (const node of plan.nodes) {
      dependentsMap.set(node.nodeId, []);
      dependencyCount.set(node.nodeId, 0);
    }

    for (const edge of plan.edges ?? []) {
      dependentsMap.get(edge.from)?.push(edge.to);
      dependencyCount.set(edge.to, (dependencyCount.get(edge.to) ?? 0) + 1);
    }

    for (const node of plan.nodes) {
      const remaining = dependencyCount.get(node.nodeId) ?? 0;
      const state: NodeState = {
        spec: node,
        status: remaining === 0 ? 'ready' : 'pending',
        dependents: dependentsMap.get(node.nodeId) ?? [],
        remainingDependencies: remaining
      };
      record.nodes.set(node.nodeId, state);
      if (state.status === 'ready') {
        record.readyQueue.push(node.nodeId);
        this.appendEvent(record, { event: 'task.ready', nodeId: node.nodeId });
      }
    }
  }

  private notifyDependents(record: ExecutionRecord, nodeId: string) {
    const nodeState = this.requireNode(record, nodeId);
    for (const dependentId of nodeState.dependents) {
      const dependent = this.requireNode(record, dependentId);
      dependent.remainingDependencies -= 1;
      if (dependent.status === 'pending' && dependent.remainingDependencies <= 0) {
        dependent.status = 'ready';
        record.readyQueue.push(dependentId);
        this.appendEvent(record, { event: 'task.ready', nodeId: dependentId });
      }
    }
  }

  private promoteReady(record: ExecutionRecord) {
    // Emit readiness events (already done in initialise/notify). Ensure concurrency respected.
    if (record.status === 'running' && record.readyQueue.length === 0 && record.runningNodes.size === 0) {
      this.checkCompletion(record);
    }
  }

  private checkCompletion(record: ExecutionRecord) {
    const allDone = Array.from(record.nodes.values()).every(state => state.status === 'completed');
    if (allDone) {
      record.status = 'completed';
      this.appendEvent(record, { event: 'execution.completed' });
    }
  }



  private createRecord(id: string, repoRoot: string): ExecutionRecord {
    const now = new Date().toISOString();
    return {
      id,
      repoRoot,
      createdAt: now,
      status: 'planned',
      plan: undefined,
      nodes: new Map(),
      readyQueue: [],
      runningNodes: new Set(),
      locks: new Map(),
      requests: [],
      timeline: [],
      lastUpdated: now,
      concurrency: 2
    };
  }

  private appendEvent(record: ExecutionRecord, event: Omit<TimelineEvent, 'timestamp' | 'executionId'>) {
    const entry: TimelineEvent = {
      timestamp: new Date().toISOString(),
      executionId: record.id,
      ...event
    };
    record.timeline.push(entry);
    record.lastUpdated = entry.timestamp;
  }

  private generateExecutionId(): string {
    return `exec-${randomUUID()}`;
  }

  private requireExecution(executionId: string): ExecutionRecord {
    const record = this.executions.get(executionId);
    if (!record) {
      throw new Error(`Unknown execution: ${executionId}`);
    }
    return record;
  }

  private requireNode(record: ExecutionRecord, nodeId: string): NodeState {
    const node = record.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Unknown node ${nodeId} in execution ${record.id}`);
    }
    return node;
  }
}
