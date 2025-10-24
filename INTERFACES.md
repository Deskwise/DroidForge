# 🔌 DroidForge Parallel Orchestration: Interface Contracts

## Purpose

This document defines the TypeScript interfaces that ALL workstreams MUST follow.
These are the contracts that enable parallel development without conflicts.

**CRITICAL:** Do NOT modify these interfaces without coordinating with all workstreams!

---

## Core Execution Types

```typescript
// src/mcp/execution/types.ts

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

export interface NodeSchedule {
  nodeId: string;
  droidId: string;
  title?: string;
  description?: string;
  resourceClaims: string[];
}
```

---

## ExecutionManager Interface (Workstream 1: CoreDev)

```typescript
export interface IExecutionManager {
  // Planning
  plan(repoRoot: string, plan: ExecutionPlan, executionId?: string): ExecutionRecord;
  
  // Execution control
  start(executionId: string): ExecutionRecord;
  pause(executionId: string): ExecutionRecord;
  resume(executionId: string): ExecutionRecord;
  abort(executionId: string): ExecutionRecord;
  
  // Task scheduling
  requestNext(executionId: string): Promise<NodeSchedule | null>;
  completeNode(executionId: string, nodeId: string, detail?: Record<string, unknown>): Promise<void>;
  failNode(executionId: string, nodeId: string, detail?: Record<string, unknown>): void;
  
  // Status
  poll(executionId: string): PollSnapshot;
  list(): ExecutionRecord[];
}
```

---

## ResourceLockManager Interface (Workstream 1: CoreDev)

```typescript
export interface IResourceLockManager {
  // Lock acquisition
  tryAcquire(resources: string[], mode: ResourceLockMode, nodeId: string): Promise<boolean>;
  
  // Lock release
  release(resources: string[], nodeId: string): Promise<void>;
  
  // Lock state
  getLockState(): Map<string, { mode: ResourceLockMode; owners: string[] }>;
  
  // Check if resource is locked
  isLocked(resource: string): boolean;
  
  // Get lock owner(s)
  getOwners(resource: string): string[];
}
```

---

## StagingManager Interface (Workstream 2: IsolationDev)

```typescript
export interface IStagingManager {
  // Create isolated staging directory for a node
  createStaging(repoRoot: string, executionId: string, nodeId: string): Promise<string>;
  
  // Collect changes from staging area
  collectChanges(
    repoRoot: string,
    stagingPath: string,
    resourceClaims: string[]
  ): Promise<Map<string, string>>;
  
  // Clean up staging directory
  cleanStaging(repoRoot: string, executionId: string, nodeId: string): Promise<void>;
}
```

---

## ExecutionMerger Interface (Workstream 2: IsolationDev)

```typescript
export interface IExecutionMerger {
  // Merge completed node outputs into repo
  merge(
    repoRoot: string,
    executionId: string,
    completedNodes: string[],
    stagingManager: IStagingManager
  ): Promise<MergeResult>;
  
  // Check for conflicts before merge
  detectConflicts(
    repoRoot: string,
    changes: Map<string, Array<{ nodeId: string; content: string }>>
  ): Promise<string[]>;
}

export interface MergeResult {
  success: boolean;
  conflicts: string[];
  mergedFiles?: string[];
  snapshotId?: string;
}
```

---

## EventBus Interface (Workstream 3: InfraDev)

```typescript
export interface IExecutionEventBus {
  // Emit event
  emit(event: ExecutionEvent): boolean;
  
  // Subscribe to all events
  onAny(listener: (event: ExecutionEvent) => void): this;
  
  // Subscribe to events for specific execution
  onExecution(executionId: string, listener: (event: ExecutionEvent) => void): this;
  
  // Unsubscribe
  off(event: string, listener: Function): this;
}

export interface ExecutionEvent {
  type: 'task.started' | 'task.completed' | 'task.failed' | 'execution.completed' | 'execution.deadlock';
  executionId: string;
  nodeId?: string;
  timestamp: string;
  payload?: any;
}
```

---

## ResourceMatcher Interface (Workstream 3: InfraDev)

```typescript
export interface IResourceMatcher {
  // Check if two resource claims overlap
  overlaps(claim1: string, claim2: string): boolean;
  
  // Expand glob patterns to actual files
  expandClaims(repoRoot: string, claims: string[]): Promise<string[]>;
  
  // Check if path is ancestor of another
  isAncestor(ancestor: string, descendant: string): boolean;
}
```

---

## MetricsCollector Interface (Workstream 3: InfraDev)

```typescript
export interface IMetricsCollector {
  // Record events
  recordTaskStart(executionId: string, nodeId: string): void;
  recordTaskComplete(executionId: string, nodeId: string, duration: number): void;
  recordLockContention(executionId: string): void;
  
  // Retrieve metrics
  getMetrics(executionId: string): ExecutionMetrics | null;
  getAllMetrics(): ExecutionMetrics[];
}

export interface ExecutionMetrics {
  executionId: string;
  startedAt: string;
  duration: number;
  nodeCount: number;
  completedNodes: number;
  failedNodes: number;
  averageNodeDuration: number;
  lockContentionEvents: number;
  peakConcurrency: number;
}
```

---

## Test Harness Interface (Workstream 4: TestDev)

```typescript
export interface ITestHarness {
  // Run concurrency tests
  testConcurrency(iterations: number): Promise<TestResult>;
  
  // Run lock contention tests
  testLockContention(): Promise<TestResult>;
  
  // Run deadlock detection tests
  testDeadlockDetection(): Promise<TestResult>;
  
  // Run integration tests
  testIntegration(): Promise<TestResult>;
}

export interface TestResult {
  passed: boolean;
  message: string;
  details?: any;
}
```

---

## File Structure Conventions

### Directory Structure
```
src/mcp/execution/
  ├── manager.ts           ← CoreDev (IExecutionManager)
  ├── synchronization.ts   ← CoreDev (Mutex wrappers)
  ├── resourceLocks.ts     ← CoreDev (IResourceLockManager)
  ├── deadlockDetector.ts  ← CoreDev (Deadlock detection)
  ├── persistence.ts       ← CoreDev (State persistence)
  ├── staging.ts           ← IsolationDev (IStagingManager)
  ├── merger.ts            ← IsolationDev (IExecutionMerger)
  ├── eventBus.ts          ← InfraDev (IExecutionEventBus)
  ├── resourceMatcher.ts   ← InfraDev (IResourceMatcher)
  ├── metrics.ts           ← InfraDev (IMetricsCollector)
  ├── healthCheck.ts       ← InfraDev (Health monitoring)
  └── __tests__/           ← TestDev (All tests)
      ├── manager.test.ts
      ├── concurrency.test.ts
      ├── resourceLocks.test.ts
      ├── deadlock.test.ts
      ├── staging.test.ts
      └── integration.test.ts
```

---

## Dependencies Between Interfaces

```
ExecutionManager
  ├─ depends on → ResourceLockManager
  ├─ depends on → StagingManager (via next_execution_task tool)
  ├─ depends on → EventBus (for notifications)
  └─ depends on → Persistence (for crash recovery)

ResourceLockManager
  └─ depends on → ResourceMatcher (for overlap detection)

StagingManager
  └─ depends on → ExecutionMerger (for final merge)

EventBus
  └─ no dependencies (standalone)

MetricsCollector
  └─ depends on → ExecutionManager (reads events)
```

---

## Integration Points

### Integration Point 1: ExecutionManager + StagingManager
**When:** CoreDev calls next_execution_task
**What:** Must create staging directory before returning task

```typescript
// In ExecutionManager.requestNext()
const task = await this.requestNextUnsafe(executionId);
if (task) {
  // Create staging for this task
  const stagingPath = await stagingManager.createStaging(
    repoRoot,
    executionId,
    task.nodeId
  );
  return { ...task, workingDirectory: stagingPath };
}
```

### Integration Point 2: ResourceLockManager + ResourceMatcher
**When:** Checking if locks can be acquired
**What:** Use ResourceMatcher to detect overlaps

```typescript
// In ResourceLockManager.canAcquire()
for (const [lockedResource, lock] of this.locks) {
  if (this.matcher.overlaps(resource, lockedResource)) {
    // Check mode compatibility
  }
}
```

### Integration Point 3: ExecutionManager + EventBus
**When:** Any state change
**What:** Emit events for subscribers

```typescript
// In ExecutionManager
private appendEvent(record: ExecutionRecord, event: TimelineEvent) {
  record.timeline.push(event);
  this.eventBus.emit({
    type: event.event as any,
    executionId: record.id,
    nodeId: event.nodeId,
    timestamp: event.timestamp,
    payload: event.detail
  });
}
```

---

## Error Handling Contracts

All async methods MUST:
- Throw specific error types
- Include helpful error messages
- Not swallow errors silently

```typescript
// Standard error types
export class ExecutionNotFoundError extends Error {
  constructor(executionId: string) {
    super(`Execution not found: ${executionId}`);
    this.name = 'ExecutionNotFoundError';
  }
}

export class NodeNotFoundError extends Error {
  constructor(nodeId: string, executionId: string) {
    super(`Node ${nodeId} not found in execution ${executionId}`);
    this.name = 'NodeNotFoundError';
  }
}

export class LockConflictError extends Error {
  constructor(resource: string, owner: string) {
    super(`Resource ${resource} is locked by ${owner}`);
    this.name = 'LockConflictError';
  }
}

export class MergeConflictError extends Error {
  constructor(conflicts: string[]) {
    super(`Merge conflicts in: ${conflicts.join(', ')}`);
    this.name = 'MergeConflictError';
    this.conflicts = conflicts;
  }
  conflicts: string[];
}
```

---

## Testing Contracts

Every workstream MUST:
- Write unit tests for their components
- Mock dependencies using these interfaces
- Achieve >85% code coverage
- Pass all tests before marking complete

Example mock:
```typescript
class MockStagingManager implements IStagingManager {
  async createStaging() { return '/tmp/staging'; }
  async collectChanges() { return new Map(); }
  async cleanStaging() {}
}
```

---

## Versioning

This interface document is versioned to track changes:

**Version:** 1.0.0
**Date:** 2024-10-23
**Status:** LOCKED (do not modify without team agreement)

### Change Process

1. Propose change in PROGRESS.md
2. Get agreement from all affected workstreams
3. Update this document
4. Increment version number
5. Notify all workstreams

---

## Questions?

If any interface is unclear:
1. Ask in PROGRESS.md under "Questions" section
2. All workstreams review and clarify
3. Update this document with clarification

**Remember:** These interfaces are the contract that makes parallel development possible. Respect them!
