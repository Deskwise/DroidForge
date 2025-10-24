# DroidForge Architecture

This document describes the technical architecture of DroidForge, including system design, component interactions, and key implementation details.

---

## Table of Contents

- [Overview](#overview)
- [System Components](#system-components)
- [Execution Model](#execution-model)
- [Parallel Orchestration](#parallel-orchestration)
- [Data Flow](#data-flow)
- [File Structure](#file-structure)
- [Key Abstractions](#key-abstractions)

---

## Overview

DroidForge is built as an **MCP (Model Context Protocol) server** that integrates with Factory.ai's Droid CLI. It operates in two main phases:

1. **Onboarding Phase:** Repository analysis, team formation, and setup
2. **Execution Phase:** Request processing, task delegation, and coordination

### Design Principles

- **Stateless MCP Tools:** Each tool invocation is independent
- **File-Based State:** Execution state persisted to `.droidforge/exec/`
- **Safe Concurrency:** Resource locking prevents conflicts
- **Isolated Execution:** Droids work in staging directories
- **Atomic Operations:** Changes merged atomically to prevent corruption

---

## System Components

```
┌─────────────────────────────────────────────────────────┐
│                     Factory.ai Droid CLI                 │
│                  (User Interface Layer)                  │
└────────────────────────┬────────────────────────────────┘
                         │ MCP Protocol
                         │
┌────────────────────────▼────────────────────────────────┐
│                  DroidForge MCP Server                   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │              Tools Layer (MCP Tools)                │ │
│ │  /forge-start  /forge-status  /df  /forge-logs     │ │
│ └───────┬──────────────────┬──────────────────────────┘ │
│         │                  │                             │
│ ┌───────▼─────────┐  ┌────▼──────────────────────────┐ │
│ │  Onboarding     │  │   Execution Manager           │ │
│ │  - SmartScan    │  │   - Plan creation             │ │
│ │  - Team forge   │  │   - Task delegation           │ │
│ │  - Setup        │  │   - Progress tracking         │ │
│ └─────────────────┘  └───────────────┬───────────────┘ │
│                                      │                   │
│         ┌────────────────────────────┼────────────────┐ │
│         │     Parallel Execution Subsystem           │ │
│         │  ┌──────────────┬──────────────┬─────────┐ │ │
│         │  │ Sync/Locks   │ Staging      │ Merger  │ │ │
│         │  │ Event Bus    │ Deadlock Det │ Metrics │ │ │
│         │  └──────────────┴──────────────┴─────────┘ │ │
│         └──────────────────────────────────────────── │ │
│                                                         │
└────────────────────────┬────────────────────────────────┘
                         │ Delegates to
                         │
┌────────────────────────▼────────────────────────────────┐
│              Individual Droid Instances                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ df-orch      │  │ frontend-    │  │ backend-     │  │
│  │ estrator     │  │ specialist   │  │ specialist   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 1. MCP Server (`src/mcp/server.ts`)

The main entry point that:
- Exposes MCP tools and prompts
- Handles tool invocations from Droid CLI
- Manages server lifecycle

**Key Exports:**
- `tools` - Available MCP tools
- `prompts` - Prompt handlers
- `sessionStore` - Session state management

### 2. Tools Layer (`src/mcp/tools/`)

MCP tools exposed to the Droid CLI:

| Tool | Purpose | Handler |
|------|---------|---------|
| `forge_start` | Initialize DroidForge | `onboarding.ts` |
| `forge_status` | Show execution status | `getStatus.ts` |
| `forge_logs` | View activity logs | `fetchLogs.ts` |
| `df_route` | Route to orchestrator | `routeRequests.ts` |
| `forge_snapshot` | Create backup | `createSnapshot.ts` |
| `forge_restore` | Restore backup | `restoreSnapshot.ts` |
| `forge_removeall` | Clean up | `cleanupRepo.ts` |

### 3. Execution Manager (`src/mcp/execution/manager.ts`)

Central coordination component that:
- Creates execution plans from user requests
- Manages execution lifecycle (planned → running → completed)
- Tracks node (task) dependencies
- Delegates work to specialist droids
- Coordinates parallel execution

**Core Data Structures:**

```typescript
interface ExecutionRecord {
  id: string;
  status: ExecutionStatus;  // planned | running | paused | completed | ...
  createdAt: string;
  plan: ExecutionPlan;
  nodes: Map<string, NodeState>;
}

interface NodeState {
  id: string;
  status: NodeStatus;  // pending | ready | running | completed | failed
  droidId: string;
  request: string;
  dependencies: string[];
  resourceClaims: string[];
}
```

### 4. Parallel Execution Subsystem (`src/mcp/execution/`)

Components for safe concurrent execution:

#### Synchronization (`synchronization.ts`)
- **ExecutionLock:** Mutex for exclusive access
- **ExecutionSemaphore:** Concurrency limiting

#### Staging Manager (`staging.ts`)
- Creates isolated work directories for each droid
- Copies repository contents (excluding `.droidforge/`)
- Provides clean workspace for modifications

#### Resource Locking (`resourceLocks.ts`)
- **ResourceLockManager:** Glob-aware file locking
- Prevents conflicting writes
- Supports read/write modes
- Deadlock prevention

#### Merger (`merger.ts`)
- **ExecutionMerger:** Atomic result merging
- Collects changes from staging areas
- Detects conflicts via content hashing
- Applies changes atomically

#### Event Bus (`eventBus.ts`)
- **ExecutionEventBus:** Pub/sub for coordination
- Real-time event notifications
- Task lifecycle events
- Execution state changes

#### Deadlock Detection (`deadlockDetector.ts`)
- **DeadlockDetector:** Cycle detection in dependency graph
- Identifies circular waits
- Suggests resolution strategies

#### Metrics & Health (`metrics.ts`, `healthCheck.ts`)
- Performance tracking
- Resource utilization
- System health monitoring

### 5. Repository Analysis (`src/detectors/`)

Scans the codebase to extract signals:

```typescript
interface RepoSignals {
  languages: LanguageSignal[];      // TypeScript, Python, etc.
  frameworks: FrameworkSignal[];    // React, Express, Django, etc.
  architecture: ArchitectureSignal; // Monorepo, MVC, microservices
  techStack: TechStackSignal[];     // Databases, tools, etc.
  projectType: string;              // web-app, api, cli, library
}
```

**Implementation:** `src/detectors/repoSignalsOptimized.ts`

---

## Execution Model

### 1. Request Flow

```
User Request (/df "Add authentication")
    ↓
df-orchestrator receives request
    ↓
ExecutionManager.enqueue()
    ↓
Plan created with nodes & dependencies
    ↓
ExecutionManager.start()
    ↓
Nodes scheduled based on dependencies
    ↓
Specialist droids execute tasks
    ↓
Results collected & merged
    ↓
Status reported to user
```

### 2. Execution Plan

An execution plan is a directed acyclic graph (DAG) of tasks:

```typescript
interface ExecutionPlan {
  rootNodeId: string;
  nodes: ExecutionNode[];
  estimatedDuration?: string;
}

interface ExecutionNode {
  id: string;
  droidId: string;           // Who executes this
  request: string;           // What to do
  dependencies: string[];    // Wait for these nodes first
  resourceClaims: string[];  // Files this node modifies
}
```

**Example Plan:**

```
Node 1: backend-specialist - "Create User model"
  dependencies: []
  claims: ["src/models/User.ts"]

Node 2: backend-specialist - "Create authentication endpoints"
  dependencies: ["node-1"]
  claims: ["src/routes/auth.ts", "src/controllers/auth.ts"]

Node 3: frontend-specialist - "Create login form"
  dependencies: []  // Can run in parallel with Node 1 & 2
  claims: ["src/components/Login.tsx"]

Node 4: test-specialist - "Write integration tests"
  dependencies: ["node-2", "node-3"]
  claims: ["tests/integration/auth.test.ts"]
```

### 3. Task Scheduling

The ExecutionManager schedules tasks using:

1. **Dependency Resolution:** Only schedule nodes when dependencies are completed
2. **Resource Availability:** Check if required resources are locked
3. **Concurrency Limits:** Respect semaphore limits
4. **Priority Ordering:** Higher priority nodes scheduled first

**Scheduling Algorithm:**

```typescript
async requestNext(executionId: string): Promise<NodeSchedule | null> {
  const record = this.requireExecution(executionId);
  
  // Find ready nodes (dependencies met, resources available)
  const readyNodes = this.findReadyNodes(record);
  
  if (readyNodes.length === 0) {
    return null;  // Nothing to schedule
  }
  
  // Acquire resource locks
  for (const node of readyNodes) {
    const locked = await this.tryLockResources(node);
    if (locked) {
      node.status = 'running';
      return {
        nodeId: node.id,
        droidId: node.droidId,
        request: node.request,
        stagingPath: await this.staging.createStaging(...)
      };
    }
  }
  
  return null;  // Resources not available
}
```

---

## Parallel Orchestration

### Resource Locking

DroidForge prevents conflicts using glob-aware resource locks:

```typescript
class ResourceLockManager {
  // Lock resources for exclusive access
  async acquire(
    executionId: string,
    nodeId: string,
    claims: string[],
    mode: 'read' | 'write'
  ): Promise<boolean>
  
  // Release resources
  release(executionId: string, nodeId: string): void
  
  // Check if claims overlap with existing locks
  private overlaps(claim1: string, claim2: string): boolean
}
```

**Overlap Detection:**

```
"src/models/**"  overlaps with  "src/models/User.ts"  → true
"src/api/**"     overlaps with  "src/tests/**"        → false
"src/file.ts"    overlaps with  "src/file.ts"         → true
```

### Staging Directories

Each droid works in isolation:

```
.droidforge/exec/<execution-id>/staging/<node-id>/
  ├── src/          (copy of repo)
  ├── tests/
  ├── package.json
  └── ...
```

**Workflow:**

1. Create staging directory
2. Copy repository (excluding `.droidforge/`)
3. Droid makes changes in staging
4. Collect changes matching resource claims
5. Merge atomically back to repo
6. Clean up staging

### Atomic Merging

The merger ensures safe multi-droid coordination:

```typescript
async merge(
  repoRoot: string,
  executionId: string,
  completedNodes: string[]
): Promise<MergeResult> {
  // 1. Collect changes from each staging area
  const allChanges = await this.collectAllChanges(...);
  
  // 2. Detect conflicts (same file modified differently)
  const conflicts = this.detectConflicts(allChanges);
  
  if (conflicts.length > 0) {
    return { success: false, conflicts };
  }
  
  // 3. Create snapshot before merging
  const snapshot = await this.createSnapshot(...);
  
  // 4. Apply changes atomically
  for (const [file, content] of allChanges) {
    await writeFileAtomic(file, content);
  }
  
  return { success: true, conflicts: [], snapshotId: snapshot };
}
```

**Conflict Detection:**

```typescript
// Hash file contents to detect conflicts
const hash1 = createHash('sha256').update(content1).digest('hex');
const hash2 = createHash('sha256').update(content2).digest('hex');

if (hash1 !== hash2) {
  conflicts.push({ file, node1, node2 });
}
```

### Deadlock Prevention

The deadlock detector identifies circular dependencies:

```
Node A waits for Node B's resource
Node B waits for Node C's resource
Node C waits for Node A's resource
→ DEADLOCK
```

**Detection Algorithm:**

```typescript
detectDeadlock(executionId: string): DeadlockInfo | null {
  // Build dependency graph
  const graph = this.buildDependencyGraph(executionId);
  
  // Find cycles using DFS
  const cycle = this.findCycle(graph);
  
  if (cycle) {
    return {
      detected: true,
      cycle,
      suggestion: "Reorder node execution or split resources"
    };
  }
  
  return null;
}
```

---

## Data Flow

### Onboarding Flow

```
1. User runs /forge-start
2. MCP tool 'forge_start' invoked
3. Check if .droidforge/ exists
   - Yes → Show returning user dashboard
   - No → Start onboarding
4. SmartScan repository
   - Detect languages, frameworks
   - Identify project type
5. Prompt for project goal
6. Select methodology
7. Generate droid roster
8. Create droid definitions
9. Write manifest and commands
10. Generate user guide
11. Show completion message
```

### Execution Flow

```
1. User runs /df "Add feature X"
2. MCP tool 'df_route' invoked
3. ExecutionManager.enqueue(request)
4. Create execution plan
   - Analyze request
   - Break into tasks (nodes)
   - Determine dependencies
   - Identify resource claims
5. ExecutionManager.start()
6. Schedule ready nodes
7. For each node:
   a. Acquire resource locks
   b. Create staging directory
   c. Delegate to specialist droid
   d. Droid executes in staging
   e. Complete node, release locks
8. When all nodes complete:
   a. Collect changes
   b. Detect conflicts
   c. Merge atomically
9. Report results to user
```

---

## File Structure

### Generated Files

```
repository/
├── .droidforge/
│   ├── droids/
│   │   ├── df-orchestrator.json
│   │   ├── frontend-specialist.json
│   │   ├── backend-specialist.json
│   │   └── test-specialist.json
│   ├── manifest.json
│   └── exec/
│       └── <execution-id>/
│           ├── state.json        # Execution state
│           ├── locks.json        # Active resource locks
│           ├── staging/
│           │   ├── node-1/       # Staging for node 1
│           │   └── node-2/       # Staging for node 2
│           └── snapshots/
│               └── <timestamp>/
├── .factory/
│   └── commands/
│       ├── forge-start.md
│       ├── forge-status.md
│       ├── df.md
│       └── ...
└── docs/
    └── DroidForge_user_guide_en.md
```

### State Persistence

Execution state is persisted to JSON:

```typescript
// .droidforge/exec/<execution-id>/state.json
{
  "id": "exec-123",
  "status": "running",
  "createdAt": "2024-10-24T10:00:00Z",
  "plan": {
    "rootNodeId": "node-1",
    "nodes": [...]
  },
  "nodes": {
    "node-1": {
      "status": "completed",
      "startedAt": "...",
      "completedAt": "..."
    },
    "node-2": {
      "status": "running",
      "startedAt": "..."
    }
  }
}
```

---

## Key Abstractions

### 1. Execution Record

Represents a single execution (triggered by `/df`):

```typescript
interface ExecutionRecord {
  id: string;
  status: ExecutionStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  plan: ExecutionPlan;
  nodes: Map<string, NodeState>;
}
```

### 2. Node State

Represents a single task within an execution:

```typescript
interface NodeState {
  id: string;
  status: NodeStatus;
  droidId: string;          // Who executes this
  request: string;          // What to do
  dependencies: string[];   // Wait for these first
  resourceClaims: string[]; // Files to modify
  startedAt?: string;
  completedAt?: string;
  error?: string;
}
```

### 3. Resource Lock

Tracks which resources are currently locked:

```typescript
interface ResourceLock {
  executionId: string;
  nodeId: string;
  claims: string[];
  mode: 'read' | 'write';
  acquiredAt: string;
}
```

### 4. Execution Event

Pub/sub events for coordination:

```typescript
interface ExecutionEvent {
  type: ExecutionEventType;
  executionId: string;
  nodeId?: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

// Event types:
// - task.started, task.completed, task.failed
// - execution.planned, execution.started, execution.completed
// - execution.deadlock
```

---

## Extension Points

DroidForge is designed to be extensible:

### 1. Custom Tools

Add new MCP tools in `src/mcp/tools/`:

```typescript
export function buildMyTool(): Tool {
  return {
    name: 'my_tool',
    description: 'Does something useful',
    inputSchema: { ... },
    handler: async (input) => {
      // Implementation
      return { result: 'success' };
    }
  };
}
```

### 2. Custom Detectors

Add repository detectors in `src/detectors/`:

```typescript
export function detectMyFramework(
  repoRoot: string
): FrameworkSignal | null {
  // Check for framework presence
  // Return signal if found
}
```

### 3. Custom Merge Strategies

Extend the merger with custom conflict resolution:

```typescript
class CustomMerger extends ExecutionMerger {
  protected async resolveConflict(
    file: string,
    changes: FileChange[]
  ): Promise<string> {
    // Custom resolution logic
  }
}
```

---

## Performance Considerations

### Optimization Strategies

1. **Resource Lock Caching:** Glob matches are cached to avoid repeated computation
2. **Lazy Staging Creation:** Staging directories created only when needed
3. **Incremental Merging:** Only modified files are written
4. **Event Batching:** Events are batched to reduce overhead
5. **Parallel Scanning:** Repository analysis runs checks in parallel

### Scalability Limits

Current limitations:

- **Max Concurrent Droids:** ~10 (limited by resource contention)
- **Max Execution Nodes:** ~100 (limited by memory)
- **Staging Directory Size:** Same as repository size
- **Merge Complexity:** O(n*m) where n=nodes, m=files

Future improvements:

- Incremental staging (copy only claimed files)
- Distributed execution across machines
- Persistent execution state database
- Smart node batching

---

## Testing Architecture

DroidForge has comprehensive test coverage:

```
src/mcp/execution/__tests__/
├── manager.test.ts          # ExecutionManager tests
├── synchronization.test.ts  # Lock/semaphore tests
├── staging.test.ts          # Staging manager tests
├── merger.test.ts           # Merge operation tests
├── resourceLocks.test.ts    # Resource locking tests
├── resourceMatcher.test.ts  # Glob matching tests
├── deadlock.test.ts         # Deadlock detection tests
├── eventBus.test.ts         # Event bus tests
├── concurrency.test.ts      # Parallel execution tests
├── integration.test.ts      # End-to-end tests
└── helpers/
    └── testUtils.ts         # Test utilities
```

**Test Categories:**

- **Unit Tests:** Individual component behavior
- **Integration Tests:** Component interaction
- **Concurrency Tests:** Parallel execution scenarios
- **Edge Cases:** Error handling, deadlocks, conflicts

---

## Security Architecture

Security measures:

1. **Resource Isolation:** Droids can only access claimed resources
2. **Input Validation:** All user inputs sanitized
3. **Path Traversal Prevention:** File paths are normalized and validated
4. **Atomic Operations:** Prevent partial writes
5. **Snapshot Rollback:** Recover from failures

See [../deployment/SECURITY.md](../deployment/SECURITY.md) for details.

---

## Related Documentation

- [CLI_SPEC.md](CLI_SPEC.md) - Complete command reference
- [PARALLEL_ORCHESTRATION.md](PARALLEL_ORCHESTRATION.md) - Concurrency details
- [../CONTRIBUTING.md](../CONTRIBUTING.md) - Development guidelines
- [../deployment/QUICKSTART.md](../deployment/QUICKSTART.md) - Deployment guide

---

*This architecture document is maintained as the system evolves. Last updated: October 2024.*
