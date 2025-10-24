import { randomUUID } from 'node:crypto';
import { ExecutionLock } from './synchronization.js';

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
      return this.requestNextUnsafe(executionId);
    });
  }

  private requestNextUnsafe(executionId: string): NodeSchedule | null {
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
    const nodeId = record.readyQueue.shift()!;
    const nodeState = record.nodes.get(nodeId)!;
    this.acquireLocks(record, nodeState);
    nodeState.status = 'running';
    nodeState.startedAt = new Date().toISOString();
    record.runningNodes.add(nodeId);
    this.appendEvent(record, { event: 'task.started', nodeId, detail: { droidId: nodeState.spec.droidId } });
    return {
      nodeId,
      droidId: nodeState.spec.droidId,
      title: nodeState.spec.title,
      description: nodeState.spec.description,
      resourceClaims: nodeState.spec.resourceClaims ?? []
    };
  }

  async completeNode(executionId: string, nodeId: string, detail?: Record<string, unknown>): Promise<void> {
    const lock = this.getExecutionLock(executionId);
    return lock.runExclusive(async () => {
      this.completeNodeUnsafe(executionId, nodeId, detail);
    });
  }

  private completeNodeUnsafe(executionId: string, nodeId: string, detail?: Record<string, unknown>): void {
    const record = this.requireExecution(executionId);
    const nodeState = this.requireNode(record, nodeId);
    if (nodeState.status !== 'running') {
      throw new Error(`Node ${nodeId} is not running.`);
    }
    nodeState.status = 'completed';
    nodeState.finishedAt = new Date().toISOString();
    record.runningNodes.delete(nodeId);
    this.releaseLocks(record, nodeState);
    this.appendEvent(record, { event: 'task.completed', nodeId, detail });
    this.notifyDependents(record, nodeId);
    this.promoteReady(record);
    this.checkCompletion(record);
  }

  async failNode(executionId: string, nodeId: string, detail?: Record<string, unknown>): Promise<void> {
    const lock = this.getExecutionLock(executionId);
    return lock.runExclusive(async () => {
      this.failNodeUnsafe(executionId, nodeId, detail);
    });
  }

  private failNodeUnsafe(executionId: string, nodeId: string, detail?: Record<string, unknown>): void {
    const record = this.requireExecution(executionId);
    const nodeState = this.requireNode(record, nodeId);
    nodeState.status = 'failed';
    nodeState.finishedAt = new Date().toISOString();
    record.runningNodes.delete(nodeId);
    this.releaseLocks(record, nodeState);
    record.status = 'failed';
    this.appendEvent(record, { event: 'task.failed', nodeId, detail });
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

  private acquireLocks(record: ExecutionRecord, nodeState: NodeState) {
    const claims = nodeState.spec.resourceClaims ?? [];
    const mode = nodeState.spec.mode ?? 'write';
    for (const claim of claims) {
      const owner = record.locks.get(claim);
      if (owner && owner !== nodeState.spec.nodeId) {
        throw new Error(`Resource ${claim} is locked by ${owner}.`);
      }
    }
    for (const claim of claims) {
      record.locks.set(claim, nodeState.spec.nodeId);
    }
  }

  private releaseLocks(record: ExecutionRecord, nodeState: NodeState) {
    const claims = nodeState.spec.resourceClaims ?? [];
    for (const claim of claims) {
      const owner = record.locks.get(claim);
      if (owner === nodeState.spec.nodeId) {
        record.locks.delete(claim);
      }
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
