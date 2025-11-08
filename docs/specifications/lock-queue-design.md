# Lock Queue & Timeout Design

## Problem
Current `LockManager` only supports `tryAcquire()` which fails immediately if a lock is busy. For Phase 2 parallel execution, droids need to wait for locks to become available.

## Solution
Add an async `acquireLock()` method that queues waiting requests with timeout support.

## API Design

### New Public Method
```typescript
/**
 * Acquire locks on resources, waiting if necessary.
 * @param resources - Array of resource paths to lock
 * @param mode - Lock mode: 'read', 'write', or 'analysis'
 * @param nodeId - ID of the node requesting the lock
 * @param timeoutMs - Maximum milliseconds to wait (default: 30000)
 * @returns Promise that resolves when locks are acquired
 * @throws TimeoutError if locks cannot be acquired within timeout
 */
async acquireLock(
  resources: string[],
  mode: ResourceLockMode,
  nodeId: string,
  timeoutMs: number = 30000
): Promise<void>
```

### Error Type
```typescript
export class LockTimeoutError extends Error {
  constructor(
    public readonly nodeId: string,
    public readonly resources: string[],
    public readonly waitedMs: number
  ) {
    super(`Lock acquisition timed out for node ${nodeId} after ${waitedMs}ms`);
    this.name = 'LockTimeoutError';
  }
}
```

## Behavior Specification

### Scenario 1: Lock Available Immediately
- **Given:** Resources are not locked
- **When:** `acquireLock()` is called
- **Then:** Promise resolves immediately, locks are acquired

### Scenario 2: Queued Acquisition (Success)
- **Given:** Resources are locked by another node
- **When:** `acquireLock()` is called with timeout=5000ms
- **And:** The conflicting lock is released within 3000ms
- **Then:** Promise resolves after ~3000ms, locks are acquired

### Scenario 3: Timeout Rejection
- **Given:** Resources are locked by another node
- **When:** `acquireLock()` is called with timeout=2000ms
- **And:** The conflicting lock is NOT released within 2000ms
- **Then:** Promise rejects with `LockTimeoutError`
- **And:** The request is removed from the queue

### Scenario 4: Multiple Resources Wait
- **Given:** Node A wants [file1.ts, file2.ts, file3.ts]
- **And:** file1.ts and file3.ts are locked by Node B
- **When:** `acquireLock()` is called for Node A
- **Then:** Node A waits for BOTH locks to be free
- **When:** Node B releases file1.ts but still holds file3.ts
- **Then:** Node A continues waiting
- **When:** Node B releases file3.ts
- **Then:** Node A's promise resolves and all 3 locks are acquired

### Scenario 5: Queue Cleanup on Timeout
- **Given:** 3 nodes are queued waiting for a lock
- **When:** The middle request times out
- **Then:** It is removed from the queue
- **And:** The remaining 2 requests stay queued in order

## Implementation Notes

1. **Existing `queue` field**: The `ResourceLock` interface already has a `queue: LockQueueEntry[]` field that's currently unused.

2. **Use that queue**: When `acquireLock()` can't acquire immediately:
   - Create a deferred promise
   - Push `{nodeId, mode, resolve}` onto the resource's queue
   - Set up timeout with `setTimeout`
   - Return the promise

3. **Process queue on release**: When `release()` is called:
   - Check if queued requests can now proceed
   - Resolve their promises
   - Remove them from queue

4. **Timeout cleanup**: When timeout fires:
   - Reject the promise with `LockTimeoutError`
   - Remove entry from all resource queues

## Test Strategy

Create `src/mcp/execution/__tests__/lockManager.test.ts` with:

1. **Test: Immediate acquisition** - No wait needed
2. **Test: Queued then granted** - Wait, release, acquire
3. **Test: Timeout rejection** - Use fake timers to advance time
4. **Test: Multi-resource wait** - Wait for multiple locks
5. **Test: Queue cleanup** - Verify timed-out requests are removed

## References
- **PRD Section 9.4**: "Enforce resource-level locks with read/write semantics"
- **PRD Section 10**: "Reliability: detect deadlocks and surface actionable errors"
- **Current Implementation**: `src/mcp/execution/lockManager.ts`
- **Existing Tests**: `src/mcp/execution/__tests__/resourceLocks.test.ts`
