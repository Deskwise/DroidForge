# 🚀 DroidForge Parallelization: From POC to AMAZING

## Vision: Production-Grade Parallel Orchestration System

Transform DroidForge into a **rock-solid, observable, fault-tolerant parallel execution engine** that can reliably coordinate 10+ droids simultaneously with zero race conditions, automatic recovery, and delightful UX.

---

## 🎯 Definition of "AMAZING"

1. **Zero Race Conditions** - Thread-safe for unlimited concurrent access
2. **Crash Recovery** - Resume from any point after server restart
3. **Deadlock-Free** - Provably safe lock ordering + detection
4. **Isolated Execution** - Droids never conflict on disk writes
5. **Observable** - Real-time insights into what's happening and why
6. **Performant** - Sub-100ms task scheduling latency
7. **Battle-Tested** - Comprehensive test suite proving correctness
8. **Production-Ready** - Monitoring, metrics, graceful degradation

---

## 📋 Implementation Roadmap

### **Phase 1: Synchronization Primitives** (Week 1) 🔴 CRITICAL

**Goal:** Eliminate all race conditions with proper concurrency control.

#### 1.1 Add AsyncMutex Library
```bash
npm install async-mutex
```

#### 1.2 Wrap All State Mutations
```typescript
// src/mcp/execution/synchronization.ts
import { Mutex, Semaphore } from 'async-mutex';

export class ExecutionLock {
  private readonly mutex = new Mutex();
  
  async runExclusive<T>(fn: () => Promise<T> | T): Promise<T> {
    return this.mutex.runExclusive(fn);
  }
  
  isLocked(): boolean {
    return this.mutex.isLocked();
  }
}

export class ExecutionSemaphore {
  private readonly semaphore: Semaphore;
  
  constructor(concurrency: number) {
    this.semaphore = new Semaphore(concurrency);
  }
  
  async acquire(): Promise<() => void> {
    const [, release] = await this.semaphore.acquire();
    return release;
  }
}
```

#### 1.3 Protect ExecutionManager Methods
```typescript
export class ExecutionManager {
  private readonly locks = new Map<string, ExecutionLock>();
  
  private getExecutionLock(executionId: string): ExecutionLock {
    if (!this.locks.has(executionId)) {
      this.locks.set(executionId, new ExecutionLock());
    }
    return this.locks.get(executionId)!;
  }
  
  async requestNext(executionId: string): Promise<NodeSchedule | null> {
    const lock = this.getExecutionLock(executionId);
    return lock.runExclusive(async () => {
      return this.requestNextUnsafe(executionId);
    });
  }
  
  async completeNode(executionId: string, nodeId: string, detail?: Record<string, unknown>): Promise<void> {
    const lock = this.getExecutionLock(executionId);
    return lock.runExclusive(async () => {
      return this.completeNodeUnsafe(executionId, nodeId, detail);
    });
  }
  
  // All internal methods renamed to *Unsafe() to make it clear they need locks
}
```

**Success Criteria:**
- ✅ All public methods protected by mutex
- ✅ No direct Map/Set mutations outside locked sections
- ✅ Race condition tests pass 1000+ iterations

**Files to Modify:**
- `src/mcp/execution/manager.ts` - Add mutex wrappers
- `src/mcp/execution/synchronization.ts` - New file with lock primitives

---

### **Phase 2: Read/Write Lock Modes** (Week 1-2) 🔴 CRITICAL

**Goal:** Support multiple readers or single writer per resource.

#### 2.1 Resource Lock Manager
```typescript
// src/mcp/execution/resourceLocks.ts
export type LockMode = 'read' | 'write' | 'analysis';

interface ResourceLock {
  mode: LockMode;
  owners: Set<string>;  // nodeIds holding the lock
  queue: Array<{ nodeId: string; mode: LockMode; resolve: () => void }>;
}

export class ResourceLockManager {
  private locks = new Map<string, ResourceLock>();
  private mutex = new Mutex();
  
  async tryAcquire(resources: string[], mode: LockMode, nodeId: string): Promise<boolean> {
    return this.mutex.runExclusive(() => {
      // Sort resources for canonical ordering (prevents deadlock)
      const sorted = [...resources].sort();
      
      // Check if all can be acquired
      for (const resource of sorted) {
        if (!this.canAcquire(resource, mode, nodeId)) {
          return false;
        }
      }
      
      // Acquire all
      for (const resource of sorted) {
        this.acquire(resource, mode, nodeId);
      }
      return true;
    });
  }
  
  private canAcquire(resource: string, mode: LockMode, nodeId: string): boolean {
    const lock = this.locks.get(resource);
    if (!lock) return true;  // No lock exists
    
    if (lock.owners.has(nodeId)) return true;  // Already own it
    
    // Multiple readers allowed
    if (mode === 'read' && lock.mode === 'read') return true;
    if (mode === 'analysis' && (lock.mode === 'read' || lock.mode === 'analysis')) return true;
    
    return false;  // Write locks are exclusive
  }
  
  private acquire(resource: string, mode: LockMode, nodeId: string): void {
    if (!this.locks.has(resource)) {
      this.locks.set(resource, { mode, owners: new Set([nodeId]), queue: [] });
    } else {
      this.locks.get(resource)!.owners.add(nodeId);
    }
  }
  
  async release(resources: string[], nodeId: string): Promise<void> {
    return this.mutex.runExclusive(() => {
      for (const resource of resources) {
        const lock = this.locks.get(resource);
        if (lock) {
          lock.owners.delete(nodeId);
          if (lock.owners.size === 0) {
            this.locks.delete(resource);
          }
        }
      }
    });
  }
  
  getLockState(): Map<string, { mode: LockMode; owners: string[] }> {
    return new Map(
      Array.from(this.locks.entries()).map(([resource, lock]) => [
        resource,
        { mode: lock.mode, owners: Array.from(lock.owners) }
      ])
    );
  }
}
```

#### 2.2 Integrate with ExecutionManager
```typescript
export class ExecutionManager {
  private readonly resourceLocks = new Map<string, ResourceLockManager>();
  
  private getResourceLockManager(executionId: string): ResourceLockManager {
    if (!this.resourceLocks.has(executionId)) {
      this.resourceLocks.set(executionId, new ResourceLockManager());
    }
    return this.resourceLocks.get(executionId)!;
  }
  
  private async requestNextUnsafe(executionId: string): Promise<NodeSchedule | null> {
    const record = this.requireExecution(executionId);
    if (record.status !== 'running') return null;
    if (record.runningNodes.size >= record.concurrency) return null;
    
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
    
    return null;  // No ready node can acquire locks
  }
}
```

**Success Criteria:**
- ✅ Multiple droids can read same file simultaneously
- ✅ Write lock blocks all other access
- ✅ Lock upgrades/downgrades work correctly
- ✅ Lock state visible in timeline events

**Files to Create:**
- `src/mcp/execution/resourceLocks.ts`
- `src/mcp/execution/__tests__/resourceLocks.test.ts`

---

### **Phase 3: Deadlock Prevention** (Week 2) 🔴 CRITICAL

**Goal:** Provably deadlock-free execution with detection and recovery.

#### 3.1 Canonical Lock Ordering
Already implemented in Phase 2 via `.sort()` - resources always acquired in lexical order.

#### 3.2 Deadlock Detection
```typescript
// src/mcp/execution/deadlockDetector.ts
export interface DeadlockInfo {
  blockedNodes: string[];
  lockDependencies: Array<{ node: string; waitingFor: string[]; heldBy: string[] }>;
  cycle: string[] | null;
}

export class DeadlockDetector {
  detect(
    readyQueue: string[],
    runningNodes: Set<string>,
    nodes: Map<string, NodeState>,
    lockState: Map<string, { mode: LockMode; owners: string[] }>
  ): DeadlockInfo | null {
    // If nothing running and nothing can start -> deadlock
    if (runningNodes.size === 0 && readyQueue.length > 0) {
      const blockedNodes = [...readyQueue];
      const dependencies = this.analyzeDependencies(blockedNodes, nodes, lockState);
      const cycle = this.findCycle(dependencies);
      
      return {
        blockedNodes,
        lockDependencies: dependencies,
        cycle
      };
    }
    
    return null;
  }
  
  private analyzeDependencies(
    blockedNodes: string[],
    nodes: Map<string, NodeState>,
    lockState: Map<string, { mode: LockMode; owners: string[] }>
  ) {
    return blockedNodes.map(nodeId => {
      const nodeState = nodes.get(nodeId)!;
      const claims = nodeState.spec.resourceClaims ?? [];
      
      const waitingFor: string[] = [];
      const heldBy: string[] = [];
      
      for (const resource of claims) {
        const lock = lockState.get(resource);
        if (lock) {
          waitingFor.push(resource);
          heldBy.push(...lock.owners.filter(owner => owner !== nodeId));
        }
      }
      
      return { node: nodeId, waitingFor, heldBy: [...new Set(heldBy)] };
    });
  }
  
  private findCycle(dependencies: Array<{ node: string; heldBy: string[] }>): string[] | null {
    // Implement cycle detection in wait-for graph
    // Using DFS to find circular dependencies
    const graph = new Map<string, string[]>();
    for (const dep of dependencies) {
      graph.set(dep.node, dep.heldBy);
    }
    
    const visited = new Set<string>();
    const recStack = new Set<string>();
    
    const dfs = (node: string, path: string[]): string[] | null => {
      if (recStack.has(node)) {
        // Found cycle
        const cycleStart = path.indexOf(node);
        return path.slice(cycleStart);
      }
      if (visited.has(node)) return null;
      
      visited.add(node);
      recStack.add(node);
      path.push(node);
      
      const neighbors = graph.get(node) ?? [];
      for (const neighbor of neighbors) {
        const cycle = dfs(neighbor, [...path]);
        if (cycle) return cycle;
      }
      
      recStack.delete(node);
      return null;
    };
    
    for (const node of graph.keys()) {
      const cycle = dfs(node, []);
      if (cycle) return cycle;
    }
    
    return null;
  }
}
```

#### 3.3 Integrate Detection into Manager
```typescript
export class ExecutionManager {
  private readonly deadlockDetector = new DeadlockDetector();
  
  private async checkForDeadlock(executionId: string): Promise<void> {
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
          suggestion: 'Review resource claims or adjust task ordering'
        }
      });
    }
  }
}
```

**Success Criteria:**
- ✅ Zero deadlocks in stress tests
- ✅ Detector identifies when deadlock would occur
- ✅ User receives actionable deadlock report

**Files to Create:**
- `src/mcp/execution/deadlockDetector.ts`
- `src/mcp/execution/__tests__/deadlockDetector.test.ts`

---

### **Phase 4: State Persistence** (Week 2-3) 🔴 CRITICAL

**Goal:** Survive crashes and resume executions seamlessly.

#### 4.1 Persistence Layer
```typescript
// src/mcp/execution/persistence.ts
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { writeJsonAtomic } from '../fs.js';

export interface PersistedExecution {
  id: string;
  repoRoot: string;
  createdAt: string;
  status: ExecutionStatus;
  plan: ExecutionPlan;
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
  locks: Array<{ resource: string; mode: LockMode; owners: string[] }>;
}

export class ExecutionPersistence {
  private getExecutionDir(repoRoot: string, executionId: string): string {
    return join(repoRoot, '.droidforge', 'exec', executionId);
  }
  
  async save(repoRoot: string, record: ExecutionRecord, lockState: Map<string, any>): Promise<void> {
    const dir = this.getExecutionDir(repoRoot, record.id);
    await mkdir(dir, { recursive: true });
    
    const data: PersistedExecution = {
      id: record.id,
      repoRoot: record.repoRoot,
      createdAt: record.createdAt,
      status: record.status,
      plan: record.plan!,
      concurrency: record.concurrency,
      nodes: Array.from(record.nodes.entries()).map(([id, state]) => ({
        nodeId: id,
        spec: state.spec,
        status: state.status,
        startedAt: state.startedAt,
        finishedAt: state.finishedAt
      })),
      readyQueue: [...record.readyQueue],
      runningNodes: [...record.runningNodes],
      locks: Array.from(lockState.entries()).map(([resource, lock]) => ({
        resource,
        mode: lock.mode,
        owners: lock.owners
      }))
    };
    
    await writeJsonAtomic(join(dir, 'state.json'), data);
    
    // Also append to timeline
    await this.appendTimeline(dir, record.timeline.slice(-1)[0]);
  }
  
  async load(repoRoot: string, executionId: string): Promise<PersistedExecution | null> {
    try {
      const dir = this.getExecutionDir(repoRoot, executionId);
      const data = await readFile(join(dir, 'state.json'), 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  
  async appendTimeline(dir: string, event: TimelineEvent): Promise<void> {
    const timelinePath = join(dir, 'timeline.jsonl');
    await writeFile(timelinePath, JSON.stringify(event) + '\n', { flag: 'a' });
  }
  
  async loadTimeline(repoRoot: string, executionId: string): Promise<TimelineEvent[]> {
    try {
      const dir = this.getExecutionDir(repoRoot, executionId);
      const data = await readFile(join(dir, 'timeline.jsonl'), 'utf-8');
      return data.trim().split('\n').map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }
}
```

#### 4.2 Integrate Auto-Persist
```typescript
export class ExecutionManager {
  private readonly persistence = new ExecutionPersistence();
  
  private async persistState(executionId: string): Promise<void> {
    const record = this.requireExecution(executionId);
    const lockManager = this.getResourceLockManager(executionId);
    await this.persistence.save(record.repoRoot, record, lockManager.getLockState());
  }
  
  async completeNode(executionId: string, nodeId: string, detail?: Record<string, unknown>): Promise<void> {
    const lock = this.getExecutionLock(executionId);
    await lock.runExclusive(async () => {
      this.completeNodeUnsafe(executionId, nodeId, detail);
      await this.persistState(executionId);  // Auto-save after every state change
    });
  }
  
  async recoverAll(repoRoot: string): Promise<string[]> {
    // Called on server startup
    const execDir = join(repoRoot, '.droidforge', 'exec');
    const entries = await readdir(execDir, { withFileTypes: true });
    const recovered: string[] = [];
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const persisted = await this.persistence.load(repoRoot, entry.name);
        if (persisted && persisted.status === 'running') {
          // Mark as paused for user to resume
          persisted.status = 'paused';
          this.restoreFromPersisted(persisted);
          recovered.push(persisted.id);
        }
      }
    }
    
    return recovered;
  }
}
```

**Success Criteria:**
- ✅ State saved after every mutation
- ✅ Crash at any point can be recovered
- ✅ Timeline is append-only and never lost
- ✅ Lock state restored correctly

**Files to Create:**
- `src/mcp/execution/persistence.ts`
- `src/mcp/execution/__tests__/persistence.test.ts`

---

### **Phase 5: Staging Directory Isolation** (Week 3) 🔴 CRITICAL

**Goal:** Each node works in isolated sandbox, merged atomically at end.

#### 5.1 Staging Manager
```typescript
// src/mcp/execution/staging.ts
import { cp, rm, mkdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { glob } from 'glob';

export class StagingManager {
  async createStaging(repoRoot: string, executionId: string, nodeId: string): Promise<string> {
    const stagingPath = join(repoRoot, '.droidforge', 'exec', executionId, 'staging', nodeId);
    await mkdir(stagingPath, { recursive: true });
    
    // Copy repo to staging (excluding .droidforge itself)
    await cp(repoRoot, stagingPath, {
      recursive: true,
      filter: (src) => !src.includes('.droidforge')
    });
    
    return stagingPath;
  }
  
  async collectChanges(
    repoRoot: string,
    stagingPath: string,
    resourceClaims: string[]
  ): Promise<Map<string, string>> {
    const changes = new Map<string, string>();
    
    for (const claim of resourceClaims) {
      const files = await glob(claim, { cwd: stagingPath, absolute: true });
      for (const file of files) {
        const relPath = relative(stagingPath, file);
        const content = await readFile(file, 'utf-8');
        changes.set(relPath, content);
      }
    }
    
    return changes;
  }
  
  async cleanStaging(repoRoot: string, executionId: string, nodeId: string): Promise<void> {
    const stagingPath = join(repoRoot, '.droidforge', 'exec', executionId, 'staging', nodeId);
    await rm(stagingPath, { recursive: true, force: true });
  }
}
```

#### 5.2 Update Tool to Use Staging
```typescript
// src/mcp/tools/nextExecutionTask.ts
export function createNextExecutionTaskTool(deps: Deps): ToolDefinition<...> {
  return {
    handler: async input => {
      const task = await deps.executionManager.requestNext(input.executionId);
      
      if (task) {
        // Create staging directory for this task
        const stagingPath = await deps.stagingManager.createStaging(
          input.repoRoot,
          input.executionId,
          task.nodeId
        );
        
        return {
          executionId: input.executionId,
          task: {
            ...task,
            workingDirectory: stagingPath  // Droid works here instead of repoRoot!
          }
        };
      }
      
      return { executionId: input.executionId, task: null };
    }
  };
}
```

#### 5.3 Merge Logic
```typescript
// src/mcp/execution/merger.ts
export class ExecutionMerger {
  async merge(
    repoRoot: string,
    executionId: string,
    completedNodes: string[],
    stagingManager: StagingManager
  ): Promise<{ success: boolean; conflicts: string[] }> {
    const allChanges = new Map<string, Array<{ nodeId: string; content: string }>>();
    
    // Collect all changes from staging
    for (const nodeId of completedNodes) {
      const stagingPath = join(repoRoot, '.droidforge', 'exec', executionId, 'staging', nodeId);
      const record = // ... get node record
      const changes = await stagingManager.collectChanges(repoRoot, stagingPath, record.spec.resourceClaims ?? []);
      
      for (const [file, content] of changes) {
        if (!allChanges.has(file)) {
          allChanges.set(file, []);
        }
        allChanges.get(file)!.push({ nodeId, content });
      }
    }
    
    // Detect conflicts
    const conflicts: string[] = [];
    for (const [file, versions] of allChanges) {
      if (versions.length > 1) {
        // Multiple nodes modified same file
        const contents = new Set(versions.map(v => v.content));
        if (contents.size > 1) {
          conflicts.push(file);
        }
      }
    }
    
    if (conflicts.length > 0) {
      return { success: false, conflicts };
    }
    
    // Apply all changes atomically
    for (const [file, versions] of allChanges) {
      const targetPath = join(repoRoot, file);
      await writeFileAtomic(targetPath, versions[0].content);
    }
    
    return { success: true, conflicts: [] };
  }
}
```

**Success Criteria:**
- ✅ Each droid sees isolated workspace
- ✅ Concurrent writes don't conflict
- ✅ Merge detects overlapping changes
- ✅ Clean rollback on merge failure

**Files to Create:**
- `src/mcp/execution/staging.ts`
- `src/mcp/execution/merger.ts`
- `src/mcp/execution/__tests__/staging.test.ts`

---

### **Phase 6: Event-Driven Architecture** (Week 3-4) 🟡 IMPORTANT

**Goal:** Replace polling with push-based updates for instant feedback.

#### 6.1 Event Bus
```typescript
// src/mcp/execution/eventBus.ts
import { EventEmitter } from 'node:events';

export interface ExecutionEvent {
  type: 'task.started' | 'task.completed' | 'task.failed' | 'execution.completed' | 'execution.deadlock';
  executionId: string;
  nodeId?: string;
  timestamp: string;
  payload?: any;
}

export class ExecutionEventBus extends EventEmitter {
  emit(event: ExecutionEvent): boolean {
    return super.emit(event.type, event) && super.emit('*', event);
  }
  
  onAny(listener: (event: ExecutionEvent) => void): this {
    return this.on('*', listener);
  }
  
  onExecution(executionId: string, listener: (event: ExecutionEvent) => void): this {
    return this.onAny((event) => {
      if (event.executionId === executionId) {
        listener(event);
      }
    });
  }
}
```

#### 6.2 Integrate with Manager
```typescript
export class ExecutionManager {
  private readonly eventBus = new ExecutionEventBus();
  
  getEventBus(): ExecutionEventBus {
    return this.eventBus;
  }
  
  private appendEvent(record: ExecutionRecord, event: Omit<TimelineEvent, 'timestamp' | 'executionId'>) {
    const entry: TimelineEvent = {
      timestamp: new Date().toISOString(),
      executionId: record.id,
      ...event
    };
    record.timeline.push(entry);
    record.lastUpdated = entry.timestamp;
    
    // Emit event
    this.eventBus.emit({
      type: event.event as any,
      executionId: record.id,
      nodeId: event.nodeId,
      timestamp: entry.timestamp,
      payload: event.detail
    });
  }
}
```

#### 6.3 HTTP Server Streaming
```typescript
// src/mcp/http-server.ts - Add SSE endpoint
app.get('/api/executions/:id/stream', (req, res) => {
  const { id } = req.params;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const listener = (event: ExecutionEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };
  
  executionManager.getEventBus().onExecution(id, listener);
  
  req.on('close', () => {
    executionManager.getEventBus().off('*', listener);
  });
});
```

**Success Criteria:**
- ✅ Sub-100ms notification latency
- ✅ HTTP SSE streaming works
- ✅ No polling needed for updates
- ✅ Memory-safe (no listener leaks)

**Files to Modify:**
- `src/mcp/execution/eventBus.ts` - New
- `src/mcp/execution/manager.ts` - Add event emits
- `src/mcp/http-server.ts` - Add SSE endpoint

---

### **Phase 7: Intelligent Resource Matching** (Week 4) 🟡 IMPORTANT

**Goal:** Proper glob expansion and hierarchy detection for resource claims.

#### 7.1 Resource Matcher
```typescript
// src/mcp/execution/resourceMatcher.ts
import micromatch from 'micromatch';
import { normalize } from 'node:path';

export class ResourceMatcher {
  /**
   * Check if two resource claims overlap
   * Examples:
   *   'src/**' overlaps with 'src/api/server.ts'
   *   'src/api/**' overlaps with 'src/**'
   *   'tests/**' does NOT overlap with 'src/**'
   */
  overlaps(claim1: string, claim2: string): boolean {
    const norm1 = normalize(claim1);
    const norm2 = normalize(claim2);
    
    // Exact match
    if (norm1 === norm2) return true;
    
    // Check if one is a glob that matches the other
    if (micromatch.isMatch(norm1, norm2) || micromatch.isMatch(norm2, norm1)) {
      return true;
    }
    
    // Check path hierarchy
    if (this.isAncestor(norm1, norm2) || this.isAncestor(norm2, norm1)) {
      return true;
    }
    
    return false;
  }
  
  private isAncestor(ancestor: string, descendant: string): boolean {
    // Remove glob patterns for hierarchy check
    const cleanAncestor = ancestor.replace(/\/\*\*.*$/, '');
    const cleanDescendant = descendant.replace(/\/\*\*.*$/, '');
    
    return cleanDescendant.startsWith(cleanAncestor + '/') || cleanDescendant === cleanAncestor;
  }
  
  /**
   * Expand glob patterns to actual files at scheduling time
   */
  async expandClaims(repoRoot: string, claims: string[]): Promise<string[]> {
    const expanded = new Set<string>();
    
    for (const claim of claims) {
      if (claim.includes('*')) {
        const files = await glob(claim, { cwd: repoRoot });
        files.forEach(f => expanded.add(f));
      } else {
        expanded.add(claim);
      }
    }
    
    return Array.from(expanded);
  }
}
```

#### 7.2 Use in Lock Manager
```typescript
export class ResourceLockManager {
  private matcher = new ResourceMatcher();
  
  private canAcquire(resource: string, mode: LockMode, nodeId: string): boolean {
    // Check all existing locks for overlaps
    for (const [lockedResource, lock] of this.locks) {
      if (lock.owners.has(nodeId)) continue;  // Already own it
      
      if (this.matcher.overlaps(resource, lockedResource)) {
        // Conflict unless both are reads
        if (mode === 'read' && lock.mode === 'read') continue;
        if (mode === 'analysis' && (lock.mode === 'read' || lock.mode === 'analysis')) continue;
        return false;
      }
    }
    
    return true;
  }
}
```

**Success Criteria:**
- ✅ `src/**` conflicts with `src/api/server.ts`
- ✅ `tests/**` doesn't conflict with `src/**`
- ✅ Glob expansion happens once at plan time
- ✅ Normalized paths (no `./` confusion)

**Files to Create:**
- `src/mcp/execution/resourceMatcher.ts`
- `src/mcp/execution/__tests__/resourceMatcher.test.ts`

---

### **Phase 8: Comprehensive Test Suite** (Week 4-5) 🔴 CRITICAL

**Goal:** Prove correctness with stress tests and race condition detection.

#### 8.1 Concurrency Stress Tests
```typescript
// src/mcp/execution/__tests__/concurrency.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('ExecutionManager Concurrency', () => {
  it('handles 100 concurrent requestNext calls without race conditions', async () => {
    const manager = new ExecutionManager();
    const plan: ExecutionPlan = {
      nodes: Array.from({ length: 50 }, (_, i) => ({
        nodeId: `node-${i}`,
        droidId: `droid-${i}`
      })),
      edges: [],
      concurrency: 10
    };
    
    const record = manager.plan('/repo', plan);
    manager.start(record.id);
    
    // 100 threads trying to get tasks
    const promises = Array.from({ length: 100 }, async () => {
      return manager.requestNext(record.id);
    });
    
    const results = await Promise.all(promises);
    const tasks = results.filter(t => t !== null);
    
    // Should get exactly 10 tasks (concurrency limit)
    assert.equal(tasks.length, 10);
    
    // All tasks should be unique
    const nodeIds = new Set(tasks.map(t => t!.nodeId));
    assert.equal(nodeIds.size, 10);
  });
  
  it('prevents lock conflicts under concurrent load', async () => {
    const manager = new ExecutionManager();
    const plan: ExecutionPlan = {
      nodes: [
        { nodeId: 'write1', droidId: 'droid1', resourceClaims: ['src/file.ts'], mode: 'write' },
        { nodeId: 'write2', droidId: 'droid2', resourceClaims: ['src/file.ts'], mode: 'write' },
        { nodeId: 'read1', droidId: 'droid3', resourceClaims: ['src/file.ts'], mode: 'read' },
      ],
      edges: [],
      concurrency: 3
    };
    
    const record = manager.plan('/repo', plan);
    manager.start(record.id);
    
    const task1 = await manager.requestNext(record.id);
    const task2 = await manager.requestNext(record.id);
    
    // Only one should get the write lock
    assert.equal([task1, task2].filter(t => t !== null).length, 1);
  });
  
  it('handles 1000 iterations without corruption', async () => {
    for (let i = 0; i < 1000; i++) {
      const manager = new ExecutionManager();
      const plan: ExecutionPlan = {
        nodes: [
          { nodeId: 'a', droidId: 'da' },
          { nodeId: 'b', droidId: 'db' },
          { nodeId: 'c', droidId: 'dc' },
        ],
        edges: [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }],
        concurrency: 2
      };
      
      const record = manager.plan('/repo', plan);
      manager.start(record.id);
      
      let task;
      while ((task = await manager.requestNext(record.id))) {
        await manager.completeNode(record.id, task.nodeId);
      }
      
      const snapshot = manager.poll(record.id);
      assert.equal(snapshot.status, 'completed');
      assert.equal(snapshot.nodes.filter(n => n.status === 'completed').length, 3);
    }
  });
});
```

#### 8.2 Deadlock Detection Tests
```typescript
describe('Deadlock Detection', () => {
  it('detects circular lock dependencies', async () => {
    const manager = new ExecutionManager();
    const plan: ExecutionPlan = {
      nodes: [
        { nodeId: 'a', droidId: 'da', resourceClaims: ['file1', 'file2'] },
        { nodeId: 'b', droidId: 'db', resourceClaims: ['file2', 'file1'] },  // Opposite order!
      ],
      edges: [],
      concurrency: 2
    };
    
    // This should never deadlock due to canonical ordering
    // But test the detector works
  });
});
```

#### 8.3 Crash Recovery Tests
```typescript
describe('Crash Recovery', () => {
  it('recovers running executions after crash', async () => {
    const manager1 = new ExecutionManager();
    const record = manager1.plan('/repo', samplePlan());
    manager1.start(record.id);
    
    const task = await manager1.requestNext(record.id);
    // Simulate crash - don't complete task
    
    // New manager simulates restart
    const manager2 = new ExecutionManager();
    const recovered = await manager2.recoverAll('/repo');
    
    assert.equal(recovered.length, 1);
    assert.equal(recovered[0], record.id);
    
    const snapshot = manager2.poll(record.id);
    assert.equal(snapshot.status, 'paused');  // Auto-paused for safety
  });
});
```

**Success Criteria:**
- ✅ 1000+ iterations pass without failures
- ✅ Concurrent access doesn't violate invariants
- ✅ Deadlock tests cover all scenarios
- ✅ >90% code coverage on execution paths

**Files to Create:**
- `src/mcp/execution/__tests__/concurrency.test.ts`
- `src/mcp/execution/__tests__/deadlock.test.ts`
- `src/mcp/execution/__tests__/recovery.test.ts`

---

### **Phase 9: Observability Layer** (Week 5) 🟡 IMPORTANT

**Goal:** Production monitoring, metrics, and debugging tools.

#### 9.1 Metrics Collector
```typescript
// src/mcp/execution/metrics.ts
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

export class MetricsCollector {
  private metrics = new Map<string, ExecutionMetrics>();
  
  recordTaskStart(executionId: string, nodeId: string): void {
    // Track metrics
  }
  
  recordTaskComplete(executionId: string, nodeId: string, duration: number): void {
    // Update metrics
  }
  
  recordLockContention(executionId: string): void {
    const m = this.metrics.get(executionId);
    if (m) m.lockContentionEvents++;
  }
  
  getMetrics(executionId: string): ExecutionMetrics | null {
    return this.metrics.get(executionId) ?? null;
  }
  
  getAllMetrics(): ExecutionMetrics[] {
    return Array.from(this.metrics.values());
  }
}
```

#### 9.2 Health Checks
```typescript
// src/mcp/execution/healthCheck.ts
export interface HealthStatus {
  healthy: boolean;
  activeExecutions: number;
  pausedExecutions: number;
  stalledExecutions: Array<{ id: string; reason: string }>;
  memoryUsage: NodeJS.MemoryUsage;
}

export class HealthChecker {
  check(manager: ExecutionManager): HealthStatus {
    const executions = manager.list();
    const active = executions.filter(e => e.status === 'running');
    const paused = executions.filter(e => e.status === 'paused');
    
    const stalled = active.filter(e => {
      const lastUpdate = new Date(e.lastUpdated).getTime();
      const now = Date.now();
      return now - lastUpdate > 5 * 60 * 1000;  // 5 min timeout
    });
    
    return {
      healthy: stalled.length === 0,
      activeExecutions: active.length,
      pausedExecutions: paused.length,
      stalledExecutions: stalled.map(e => ({
        id: e.id,
        reason: 'No activity for >5 minutes'
      })),
      memoryUsage: process.memoryUsage()
    };
  }
}
```

#### 9.3 Debug Endpoint
```typescript
// src/mcp/http-server.ts
app.get('/api/executions/:id/debug', (req, res) => {
  const { id } = req.params;
  const snapshot = executionManager.poll(id);
  const metrics = metricsCollector.getMetrics(id);
  const lockState = // Get from lock manager
  
  res.json({
    snapshot,
    metrics,
    lockState,
    timeline: snapshot.timeline.slice(-50)  // Last 50 events
  });
});

app.get('/api/health', (req, res) => {
  const health = healthChecker.check(executionManager);
  res.status(health.healthy ? 200 : 503).json(health);
});
```

**Success Criteria:**
- ✅ Metrics track all key stats
- ✅ Health endpoint detects stalls
- ✅ Debug info helps troubleshoot issues
- ✅ Performance overhead <1%

**Files to Create:**
- `src/mcp/execution/metrics.ts`
- `src/mcp/execution/healthCheck.ts`

---

### **Phase 10: Performance Optimization** (Week 5-6) 🟢 NICE-TO-HAVE

**Goal:** Handle 100+ concurrent droids with <100ms latency.

#### 10.1 Profiling and Bottlenecks
- Profile with `node --prof` under load
- Identify hot paths in lock manager
- Optimize JSON serialization (use msgpack?)
- Cache glob expansions

#### 10.2 Optimizations
```typescript
// Cache resource expansions
export class ResourceCache {
  private cache = new Map<string, string[]>();
  
  async getOrExpand(repoRoot: string, claim: string): Promise<string[]> {
    const key = `${repoRoot}:${claim}`;
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    
    const expanded = await glob(claim, { cwd: repoRoot });
    this.cache.set(key, expanded);
    return expanded;
  }
  
  invalidate(repoRoot: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(repoRoot)) {
        this.cache.delete(key);
      }
    }
  }
}
```

#### 10.3 Stress Testing
```typescript
// Load test with 100 parallel droids
const plan: ExecutionPlan = {
  nodes: Array.from({ length: 100 }, (_, i) => ({
    nodeId: `node-${i}`,
    droidId: `droid-${i}`,
    resourceClaims: [`src/file-${i % 10}.ts`]  // Some overlap
  })),
  edges: [],
  concurrency: 50
};
```

**Success Criteria:**
- ✅ Handle 100 droids at <100ms P99 latency
- ✅ Memory usage scales linearly
- ✅ No performance degradation over time
- ✅ Lock manager remains fast under contention

---

## 📊 Success Metrics

| Metric | Target | Critical? |
|--------|--------|-----------|
| **Zero race conditions** | 0 failures in 10k iterations | ✅ Yes |
| **Crash recovery** | 100% state restored | ✅ Yes |
| **Lock correctness** | No conflicts in 10k runs | ✅ Yes |
| **Deadlock prevention** | Zero deadlocks in stress tests | ✅ Yes |
| **Task scheduling latency** | <100ms P99 | 🟡 Important |
| **Event notification latency** | <50ms P99 | 🟡 Important |
| **Concurrent droids supported** | 50+ simultaneously | 🟢 Nice |
| **Memory overhead** | <50MB per execution | 🟢 Nice |
| **Test coverage** | >90% for execution/* | ✅ Yes |

---

## 🚀 Go-Live Checklist

Before declaring "AMAZING":

- [ ] All Phase 1-5 implemented and tested
- [ ] 10,000 iteration stress test passes
- [ ] Crash recovery test passes
- [ ] Lock contention tests pass
- [ ] Deadlock detection verified
- [ ] Code review by 2+ developers
- [ ] Performance benchmarks meet targets
- [ ] Documentation updated
- [ ] Demo video showing 10 droids working simultaneously
- [ ] Integration with Factory.ai validated

---

## 🎉 What Makes This AMAZING

1. **Bulletproof Concurrency** - Formally verified lock ordering, mutex-protected state
2. **Fault Tolerance** - Survives any crash, resume from any point
3. **Observable** - See exactly what's happening in real-time
4. **Fast** - Sub-100ms scheduling, instant notifications
5. **Battle-Tested** - 10k+ iterations prove correctness
6. **Developer-Friendly** - Clear error messages, debug tools
7. **Production-Ready** - Metrics, health checks, graceful degradation

This system will **scale from 1 to 100 droids** without breaking a sweat, recover from crashes instantly, and never lose work. The Factory.ai founders will be impressed. 🔥
