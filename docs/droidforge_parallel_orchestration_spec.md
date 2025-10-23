# 📘 DroidForge MCP Server — Parallel Orchestration Extension

---

## 1. Purpose & Scope

- Enable **df-orchestrator** to fan out work to multiple specialists concurrently while preserving the “one voice” user experience.
- Preserve compatibility with the existing MCP tools/prompts/guide generation defined in the base specification.
- Provide deterministic safety guarantees: **isolation, rollback, and conflict-free merges** before user-visible diffs materialize.
- Surface richer progress streaming so users see parallel progress without micromanaging individual droids.
- Define a migration path that does not break current single-task flows; when concurrency is disabled, behaviour matches the legacy mode.

Out of scope: Auto-splitting natural-language goals into graphs (the orchestrator still interprets requests); GUI timelines; multi-repo orchestration.

---

## 2. Architectural Overview

```
┌──────────────────────────────────────────────────────────┐
│ Droid CLI                                                │
│  • Receives orchestrator status streams                  │
│  • Presents numbered controls / slash commands           │
└──────────────▲───────────────────────────────────────────┘
               │ MCP (tools/prompts/resources)
┌──────────────┴───────────────────────────────────────────┐
│ DroidForge MCP Server                                    │
│  • Orchestrator runtime (task planner + scheduler)       │
│  • Parallel execution manager                            │
│    - Dependency graph + readiness evaluation             │
│    - Concurrency guards (file-claim locks, resource gates)│
│  • Session context (per-request execution model)         │
│  • Structured logging + timeline buffer                  │
│  • File ops layer (unchanged: atomic writes, snapshots)  │
└──────────────▲───────────────────────────────────────────┘
               │
┌──────────────┴───────────────────────────────────────────┐
│ Repo                                                     │
│  • .droidforge/droids…                                   │
│  • .droidforge/droids-manifest.json                      │
│  • .droidforge/exec/…  ← new parallel execution state    │
│  • docs/…, .factory/commands/… (unchanged)                │
└──────────────────────────────────────────────────────────┘
```

This document builds on the base MCP specification and only describes the additional behaviour required for parallel orchestration. Whenever an item is unchanged, implementers should follow the guidance in [`docs/droidforge_full_cli_spec.md`](./droidforge_full_cli_spec.md).

Key additions:
- **Parallel Execution Engine (PEE)** inside the MCP server that manages task DAGs, run slots, and conflict resolution.
- **Execution State Assets** under `.droidforge/exec/` to persist graph state, run metadata, and timeline logs for resumability.
- **Enhanced session context** to track multi-task runs beyond onboarding (per `/df` request).
- **Event bus** inside the MCP server to broadcast status updates back to Droid CLI (progress streaming).

---

## 3. Execution Model

### 3.1 Task Graph

`plan_execution` receives a JSON payload describing the graph:

```json
{
  "graph": {
    "nodes": [
      {
        "nodeId": "plan",
        "droidId": "df-orchestrator",
        "title": "Draft Windows build plan",
        "description": "Break the work into build/test/doc tasks",
        "mode": "read-only",
        "resourceClaims": [],
        "inputs": {},
        "outputs": {}
      },
      {
        "nodeId": "builder",
        "droidId": "df-builder",
        "title": "Compile Windows artifacts",
        "mode": "write",
        "resourceClaims": ["src/windows/**", "build/windows/**"],
        "inputs": {"planNode": "plan"},
        "outputs": {"artifactPath": "build/windows/installer.exe"}
      }
    ],
    "edges": [
      { "from": "plan", "to": "builder" },
      { "from": "plan", "to": "tester" }
    ]
  },
  "concurrency": 2
}
```

- Each orchestrator request (`/df …`) yields an **Execution Graph**: nodes represent droid tasks; edges encode dependencies (must-complete-before).
- Graph can be provided by df-orchestrator’s planner or injected via the CLI (future: user-specified).
- Nodes carry metadata:
  - `droidId`, `description`, `inputs`, expected outputs, `mode`, and `resourceClaims` (list of files/globs that must be locked before run).
  - Optional `timeout`, `retry` policy, and `validationHooks` for post-run checks.

### 3.2 Scheduler

- Maintains three sets: `ready`, `running (<= concurrency limit)`, `blocked` (waiting on deps or locks).
- Support configurable concurrency: default 2 parallel slots; override via manifest or command flag.
- `next_execution_task` dequeues the next ready node if slots available, returning its `resourceClaims` so callers can route to the appropriate droid.
- For each ready node dequeued via `next_execution_task`:
  1. Acquire resource locks (based on `resourceClaims`).
  2. Insert timeline event: `task.started`.
  3. Caller invokes `route_specialist` (or `route_orchestrator`) to actually run the task.
- `complete_execution_task` (success or failure) releases locks, persists artefacts, and marks dependents ready.
- On failure, execution transitions to `failed` until user retries or aborts; timeline logs emit `task.failed` and `execution.failed` events.
- When `/df <goal>` is invoked without an existing plan, the MCP server auto-generates a single-node plan that routes the request to `df-orchestrator`, captures the timeline, and returns an executionId so `/forge-status` can report progress.

### 3.3 Isolation & Merge

- Each node executes in an isolated staging area (copy-on-write). File commits happen only during orchestrated merge step.
- After all nodes succeed (or user approves partial success), orchestrator performs atomic merge:
  - Re-validate conflicts (diff vs repo HEAD + pending nodes).
  - If clean → apply to repo via existing write helpers (atomic rename).
  - If conflicts → prompt user with diff summary; provide auto-resolve options or partial revert.

### 3.4 Rollback

- On failure or abort, orchestrator can roll back by discarding per-node outputs.
- If merge already happened, rely on existing snapshot system (auto-create snapshot before merge; allow quick `restore_snapshot`).

---

## 4. Directory & File Additions

| Path | Purpose |
|------|---------|
| `.droidforge/exec/<executionId>/graph.json` | Persisted execution graph with status for resumability |
| `.droidforge/exec/<executionId>/timeline.jsonl` | Append-only event stream for streaming & debugging |
| `.droidforge/exec/<executionId>/staging/<nodeId>/` | Temporary workspace per node (copy-on-write) |
| `.droidforge/exec/<executionId>/locks.json` | Captured lock ownership for crash recovery (see schema below) |
| `.droidforge/exec/history.jsonl` | Summary of past executions (metadata only) |

Permissions/time-to-live: clean up when execution resolved (success/abort) or after configurable TTL.

---

## 5. MCP Capabilities (New/Updated)

### 5.1 Tools

| Tool | Status | Purpose |
|------|--------|---------|
| `plan_execution` | **New** | Accepts orchestrator plan (task graph). Validates structure, persists under `.droidforge/exec/…`, returns executionId. |
| `start_execution` | **New** | Kicks off scheduler loop for given executionId. Supports resume mode. |
| `poll_execution` | **New** | Returns live snapshot: running nodes, statuses, timeline tail. Used for streaming. |
| `pause_execution` | **New** | Gracefully pause after current nodes, releasing locks. |
| `resume_execution` | **New** | Opposite of pause. |
| `abort_execution` | **New** | Cancels outstanding nodes, discards staged outputs (unless `keepPartial` flag). |
| `merge_execution` | **New** | Applies staged changes if safe; auto-snapshot before merge. |
| `next_execution_task` | **New** | Dequeues the next ready node (includes resource claims) respecting concurrency limits. |
| `complete_execution_task` | **New** | Marks a node as succeeded or failed, releasing locks and promoting dependents. |
| `list_executions` | **New** | Lists active/recent execution IDs with statuses. |
| `route_orchestrator` | **Updated** | Accepts optional `executionId`. When none is supplied, auto-creates a single-node plan for the request and starts execution (yielding timeline + executionId). |
| `route_specialist` | **Updated** | Accepts `executionId` + `nodeId` for context; returns streaming updates + outputs. |
| `fetch_logs` | **Updated** | Optionally filter by `executionId`. |
| `create_snapshot` / `restore_snapshot` | **Updated** | Called automatically by `merge_execution`/`abort_execution` when needed. |

Tool Input/Output extensions (select examples):
- `plan_execution` input: `{ executionId?: string, graph: { nodes: [...], edges: [...] }, repoRoot: string }` → returns `{ executionId, summary }`.
- `poll_execution` output: `{ executionId, status: 'running'|'paused'|'completed'|'failed', running: [...], queued: [...], completed: [...], timelineTail: [...] }`.
- `merge_execution` output: `{ merged: true, snapshotId, diffSummary }`.

### 5.2 Prompts

| Prompt | Status | Notes |
|--------|--------|-------|
| `orchestrator_parallel` | **New** | Wraps the full lifecycle: plan → confirm graph → start → stream updates → merge/abort decision. |
| `execution_status` | **New** | Quick view for `/forge-status` (optional command) listing live runs. |
| Existing prompts (onboarding, guide, cleanup…) | **Unchanged** | Continue functioning; they can include cross-links to parallel features. |

### 5.3 Resources

- `droidforge/templates/execution-status` – Markdown summary template for CLI streaming.
- `droidforge/snapshots/index` – Extended metadata (executionId associated with snapshot).
- `droidforge/executions/<id>/graph` – read-only resource for debugging tools.

---

## 6. Session & Execution State Extensions

### 6.1 Session Object

- Augment `OnboardingSession` with optional `activeExecutionId` for continuity.
- Introduce `ExecutionSession` persisted at `.droidforge/exec/<id>/state.json`:
  ```json
  {
    "executionId": "df-2024-09-25T12-04-33Z",
    "repoRoot": "/abs/path",
    "createdAt": "ISO8601",
    "status": "running|paused|completed|failed",
    "graph": { ... },
    "locks": { "src/user_auth.ts": "node-3" },
    "timelinePath": ".droidforge/exec/.../timeline.jsonl",
    "mergeSnapshotId": null
  }
  ```

### 6.2 Timeline Events

- Append-only JSONL with events such as `task.scheduled`, `task.started`, `task.stdout`, `task.completed`, `task.failed`, `execution.paused`, `execution.merged`.
- Each line is a JSON object:
  ```json
  {
    "timestamp": "2024-09-25T11:03:27.120Z",
    "executionId": "df-2024-09-25T12-04-33Z",
    "nodeId": "builder",
    "event": "task.stdout",
    "status": "ok",
    "payload": {
      "message": "Packaging Windows artifacts…"
    }
  }
  ```
- Used for incremental streaming to CLI; truncated tail provided by `poll_execution`. Clients may request full history via `/forge-logs --execution <id>`.

#### Lock File Snapshot

- Stored at `.droidforge/exec/<executionId>/locks.json`:
  ```json
  {
    "locks": {
      "src/windows/**": {
        "mode": "write",
        "nodeId": "builder",
        "acquiredAt": "2024-09-25T11:03:19.884Z"
      },
      "docs/**": {
        "mode": "read",
        "nodeId": "doc",
        "acquiredAt": "2024-09-25T11:03:20.112Z"
      }
    }
  }
  ```
- Restored on crash so the scheduler can cleanly resume or release stale locks before continuing.

---

## 7. Concurrency & Safety

### 7.1 Locking Strategy

- Resource lock map keyed by normalized file globs.
- Modes:
  - `read` – multiple readers allowed.
  - `write` – exclusive lock.
  - `analysis` – read-like but can consume CPU budgets (future hook).
- Lock acquisition order canonicalized (e.g., lexical) to avoid deadlocks.
- Deadlock detection: scheduler monitors stuck nodes; if all blocked on locks, prompt user with conflict summary.

### 7.2 Conflict Detection & Merge

- Pre-run: `route_specialist` receives staging path; should write under that root only.
- Post-run validation: diff vs repo HEAD + other staged outputs. If conflicts detected, mark node as `conflict`, pause execution, prompt user.
- Merge step re-validates; uses `git apply`-style dry-run to ensure clean apply before final rename.

### 7.3 Rollback

- On abort/failure, staging dirs deleted; manifest unchanged.
- If merge already happened, rely on auto snapshot (ID returned to user) for easy `restore_snapshot`.
- Support partial approvals: user can accept success nodes only; scheduler discards others.

### 7.4 Resilience

- MCP server crash mid-run: execution state persisted → on startup, scheduler can resume or prompt user.
- CLI disconnect: timeline stored; `poll_execution` retrieves history.

---

## 8. User Flows

### 8.1 Orchestrator Parallel Flow (`/df Build Windows installer`)  
**High-level CLI sequence**

1. User: `/df Build Windows installer with tests`.
2. Prompt `orchestrator_parallel` runs:
   - `plan_execution` generates graph (e.g., nodes: plan, builder, tester, doc, analyzer).
   - CLI displays graph summary and asks for confirmation (numbered options: run, edit, cancel).
3. On confirm: `start_execution` begins scheduler; CLI enters streaming mode.
4. `poll_execution` runs in background (2s interval) to display updates, e.g.:
   ```
   [11:03:12] ✓ plan  → orchestration blueprint ready
   [11:03:19] ▶ builder • building Windows artifacts (slot 1)
   [11:03:19] ▶ tester  • writing regression harness (slot 2)
   [11:03:27] builder stdout: "Binary packaged to staging/windows/build_001"
   [11:03:33] tester stdout: "Added tests/windows_build.test.ts"
   ```
5. If `tester` finishes first, scheduler starts `doc` immediately (assuming no conflicts).
6. Once all nodes complete, CLI prompts: `Merge results? (1 Yes, snapshot + merge; 2 Review diffs; 3 Abort & discard)`.
7. On `1`, `merge_execution` executes – auto snapshot, apply changes, log success.
8. CLI closes with summary + next steps.

### 8.2 Failure Case

- Suppose `builder` fails (missing dependency). Timeline shows failure; scheduler pauses others. CLI offers numbered actions: `1) Retry node, 2) Edit staging output, 3) Abort execution.`
- On retry, scheduler reacquires locks and reruns `builder`.

### 8.3 Resume Flow

- If CLI disconnects mid-run, user runs `/forge-status`. Prompt lists active execution(s); selecting one triggers `resume_execution` followed by streaming updates from timeline tail.

### 8.4 Serial Fallback Example

If the planner submits a single-node graph (or the user opts into `--serial`), execution collapses to the legacy behaviour:
```
User: /df Fix the README typo
[df-orchestrator] Running in serial mode (1 task)
[11:05:12] ▶ docfix • updating README.md
[11:05:14] ✓ docfix • committed change
Ready to merge? (1 Yes  2 Review diff  3 Abort)
```
The merge prompt mirrors the existing single-task flow and no scheduler state is created under `.droidforge/exec/`.

### 8.5 Merge-Conflict Recovery Example

If a node produces changes that conflict with repo HEAD:
```
[11:22:04] ⚠ merge block • builder output conflicts with src/api/server.ts
Options:
 1 Retry builder after sync
 2 Open diff summary
 3 Abort execution (keeps snapshot df-2024-09-25T11-22-04Z)
```
Choosing option 2 triggers a prompt that shows the conflicting hunks and allows the user to edit the staging file before retrying `merge_execution`.

---

## 9. CLI & Slash Commands

| Command | Update |
|---------|--------|
| `/df <goal>` | Automatically creates a minimal execution plan (single node by default) and routes to df-orchestrator. Legacy serial mode still available via `--serial`. |
| `/forge-status` | **New**; lists live/recent executions using `list_executions` prompt. |
| `/forge-resume` | Extended: lists paused executions alongside onboarding sessions. |
| `/forge-guide`, `/forge-add-droid`, `/forge-removeall`, `/forge-restore`, `/forge-logs` | Continue to work; prompts reference parallel features where relevant. |

Slash command templates updated via `install_commands` to include `/forge-status` and references to parallel workflow inside quick actions.

---

## 10. Logging & Telemetry Enhancements

- Every new tool logs `event`, `status`, `executionId`, `nodeId` (where applicable).
- Timeline JSONL acts as fine-grained log; `fetch_logs` summarises high-level events.
- On merge, log includes diff summary (file counts, tests run).

---

## 11. Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Lock contention (two nodes claim same write resource) | Scheduler queues second node; if deadlock detected, execution pauses and prompts user with conflicting nodes. |
| Node failure | Mark node as failed, stop dependents, prompt for retry/abort. |
| Merge conflict with repo HEAD | Pause; prompt user to sync repo (pull/rebase) or snapshot for later. |
| Crash mid-run | On restart, orphaned locks cleared; executions with status `running` set to `paused` pending user input. |
| Missing manifest | `plan_execution` rejects plan (first run must forge team). |
| CLI disconnect | Execution continues server-side; timeline retains updates for reconnection. |

---

## 12. Testing Strategy

- **Unit Tests**
  - Graph validation (cycles, missing deps)
  - Lock manager (concurrency scenarios, starvation)
  - Merge/rollback operations (atomicity).
- **Integration Tests**
  - Happy path: plan + 2 parallel nodes + merge.
  - Failure path: node error + retry.
  - Resume path: start → pause → resume.
  - Merge conflict detection.
- **Load/Stress**
  - Many small nodes (10+) to ensure scheduler fairness.
  - Long-running node + quick nodes verifying streaming remains responsive.
  - Timeline truncation tests: verify `poll_execution` tail remains bounded and pagination works for >1k events.
- **CLI Simulation**
  - Mock prompts to ensure streaming text matches spec (friendly, numbered options, no pattern matching).
  - Crash/restart harness: kill MCP mid-run, restart, call `list_executions`, and resume.

---

## 13. Effort & Risk Estimate

| Workstream | Estimated Effort | Notes |
|------------|------------------|-------|
| Scheduler & execution state layer | 2–3 weeks | Core complexity: lock management, persistence, resume logic. |
| Tool implementation (`plan_execution`, `start/poll/pause/...`) | 1–2 weeks | Requires asynchronous processing, integration with logging. |
| Prompt & CLI streaming updates | 1 week | Ensure friendly tone, numbered options, progress streaming. |
| Testing & resilience | 1–2 weeks | Extensive harness for concurrency & failure. |
| Documentation & migration notes | 2–3 days | Update spec/README, mention new commands. |

**Risks**
- Deadlock/starvation if lock ordering or dependency resolution is buggy.
- Merge conflicts or partial writes if isolation layer fails.
- Increased resource usage (staging areas) on large repos; need cleanup policies.
- UX overwhelm if streaming becomes noisy; must tune frequency and summarisation.

Mitigations: thorough tests, incremental rollout, ability to fall back to serial mode.

---

## 14. Appendix — Example Timeline Output

```
Execution df-2024-09-25T12:04:33Z  (status: running)
──────────────────────────────────────────────
11:02:11  plan           ✓ blueprint ready (5 tasks)
11:02:18  builder        ▶ started • staging/builder
11:02:19  tester         ▶ started • staging/tester
11:02:27  builder        … stdout: "Packaging Windows artifacts…"
11:02:31  tester         … stdout: "Added tests/windows_build.test.ts"
11:02:39  builder        ✓ completed (duration: 21s)
11:02:41  doc            ▶ started • staging/doc
11:02:51  tester         ✓ completed (duration: 32s)
11:03:05  analyzer       ▶ started • staging/analyzer
```

CLI displays tail every poll; users can request full timeline via `/forge-logs --execution <id>`.

---
