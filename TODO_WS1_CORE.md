# ✅ TODO: Workstream 1 - Core Concurrency (CoreDev)

**Owner:** CoreDev  
**Phases:** 1-4  
**Priority:** CRITICAL_PATH  
**Status:** Not Started

---

## Phase 1: Synchronization Primitives

- [ ] Install async-mutex package (`npm install async-mutex`)
- [ ] Create `src/mcp/execution/synchronization.ts`
  - [ ] Implement ExecutionLock class (wraps Mutex)
  - [ ] Implement ExecutionSemaphore class
  - [ ] Export both classes
- [ ] Update `src/mcp/execution/manager.ts`
  - [ ] Add import for ExecutionLock
  - [ ] Add private locks map: `Map<string, ExecutionLock>`
  - [ ] Add getExecutionLock(executionId) method
  - [ ] Wrap all public methods with lock.runExclusive()
  - [ ] Rename internal methods to *Unsafe()
- [ ] Write tests in `__tests__/synchronization.test.ts`
  - [ ] Test race conditions (1000 iterations)
  - [ ] Test concurrent requestNext calls
  - [ ] Test lock isolation per execution
- [ ] Update PROGRESS.md: Phase 1 complete

---

## Phase 2: Read/Write Lock Modes

- [ ] Create `src/mcp/execution/resourceLocks.ts`
  - [ ] Define ResourceLock interface
  - [ ] Implement ResourceLockManager class
  - [ ] Implement tryAcquire(resources, mode, nodeId) method
  - [ ] Implement release(resources, nodeId) method
  - [ ] Implement getLockState() method
  - [ ] Implement canAcquire() helper (multi-reader logic)
  - [ ] Sort resources canonically (prevent deadlock)
- [ ] Update `src/mcp/execution/manager.ts`
  - [ ] Add resourceLocks map per execution
  - [ ] Integrate ResourceLockManager into requestNext()
  - [ ] Check locks before dequeuing node
  - [ ] Acquire locks atomically
  - [ ] Release locks in completeNode/failNode
- [ ] Write tests in `__tests__/resourceLocks.test.ts`
  - [ ] Test multi-reader (read locks don't conflict)
  - [ ] Test exclusive writer (write blocks all)
  - [ ] Test lock upgrades/downgrades
  - [ ] Test canonical ordering
- [ ] Update PROGRESS.md: Phase 2 complete

---

## Phase 3: Deadlock Detection

- [ ] Create `src/mcp/execution/deadlockDetector.ts`
  - [ ] Define DeadlockInfo interface
  - [ ] Implement DeadlockDetector class
  - [ ] Implement detect() method (finds cycles)
  - [ ] Implement analyzeDependencies() helper
  - [ ] Implement findCycle() DFS algorithm
- [ ] Update `src/mcp/execution/manager.ts`
  - [ ] Add deadlockDetector instance
  - [ ] Call checkForDeadlock() in requestNext()
  - [ ] If deadlock detected, pause execution
  - [ ] Emit execution.deadlock event
  - [ ] Log deadlock info to timeline
- [ ] Write tests in `__tests__/deadlock.test.ts`
  - [ ] Test circular dependencies detected
  - [ ] Test false positives avoided
  - [ ] Test deadlock resolution
- [ ] Update PROGRESS.md: Phase 3 complete

---

## Phase 4: State Persistence

- [ ] Create `src/mcp/execution/persistence.ts`
  - [ ] Define PersistedExecution interface
  - [ ] Implement ExecutionPersistence class
  - [ ] Implement save(repoRoot, record, lockState) method
  - [ ] Implement load(repoRoot, executionId) method
  - [ ] Implement appendTimeline(dir, event) method
  - [ ] Implement loadTimeline(repoRoot, executionId) method
- [ ] Create directory structure: `.droidforge/exec/<id>/`
  - [ ] state.json (execution state)
  - [ ] timeline.jsonl (event log)
  - [ ] locks.json (lock state)
- [ ] Update `src/mcp/execution/manager.ts`
  - [ ] Add persistence instance
  - [ ] Call persistState() after mutations
  - [ ] Implement recoverAll(repoRoot) method
  - [ ] Handle crashed executions on startup
- [ ] Write tests in `__tests__/persistence.test.ts`
  - [ ] Test state save/load round-trip
  - [ ] Test timeline append
  - [ ] Test recovery after crash
- [ ] Update PROGRESS.md: Phase 4 complete

---

## Integration Tasks

- [ ] Export IExecutionManager interface for IsolationDev
- [ ] Integrate EventBus (from InfraDev) into manager
- [ ] Integrate ResourceMatcher (from InfraDev) into locks
- [ ] Ensure all tests pass: `npm test`
- [ ] Ensure build works: `npm run build`
- [ ] Ensure lint passes: `npm run lint`

---

## Success Criteria

- [ ] All tasks above checked off
- [ ] All tests passing (>85% coverage)
- [ ] No race conditions in 1000-iteration tests
- [ ] Deadlock detection works correctly
- [ ] State persists and recovers
- [ ] Only owned files modified (see FILE_OWNERSHIP.md)
- [ ] PROGRESS.md updated with completion

---

## Notes

- Follow interfaces in INTERFACES.md
- Don't modify files owned by other workstreams
- Ask questions in PROGRESS.md if unclear
- Update this file as you complete tasks
