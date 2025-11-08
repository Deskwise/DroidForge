import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { LockManager } from '../lockManager.js';

/**
 * Tests for async lock queuing and timeout functionality.
 * 
 * These tests target the future acquireLock() method that will:
 * - Queue requests when locks are busy
 * - Resolve promises when locks become available
 * - Reject with timeout errors when locks aren't released in time
 * - Clean up timed-out requests from queues
 * 
 * Reference: docs/specifications/lock-queue-design.md
 */
describe('LockManager - Queuing and Timeouts', () => {
  /**
   * Scenario 1: Lock Available Immediately
   * When resources are free, acquireLock should resolve right away
   */
  it('acquires lock immediately when resource is free', async () => {
    const manager = new LockManager();
    
    // This will fail until acquireLock() is implemented
    await assert.doesNotReject(async () => {
      // @ts-expect-error - acquireLock() doesn't exist yet
      await manager.acquireLock(['file.ts'], 'write', 'node1', 5000);
    });
    
    // Verify lock was actually acquired
    assert.equal(manager.isLocked('file.ts'), true);
    assert.deepEqual(manager.getOwners('file.ts'), ['node1']);
  });
  
  /**
   * Scenario 2: Queued Acquisition (Success)
   * When a lock is busy, the request should wait and resolve after release
   */
  it('queues request and resolves after conflicting lock is released', async () => {
    const manager = new LockManager();
    
    // Node1 acquires lock first
    await manager.tryAcquire(['file.ts'], 'write', 'node1');
    
    const startTime = Date.now();
    
    // Node2 tries to acquire - will wait in queue
    const acquirePromise = (async () => {
      // @ts-expect-error - acquireLock() doesn't exist yet
      await manager.acquireLock(['file.ts'], 'write', 'node2', 5000);
    })();
    
    // Release after 100ms
    setTimeout(async () => {
      await manager.release(['file.ts'], 'node1');
    }, 100);
    
    // Wait for promise to resolve
    await acquirePromise;
    
    const elapsed = Date.now() - startTime;
    
    // Should have waited ~100ms
    assert.ok(elapsed >= 90 && elapsed < 200, `Expected ~100ms wait, got ${elapsed}ms`);
    
    // Node2 should now own the lock
    assert.deepEqual(manager.getOwners('file.ts'), ['node2']);
  });
  
  /**
   * Scenario 3: Timeout Rejection
   * When a lock isn't released in time, the promise should reject with LockTimeoutError
   */
  it('rejects with timeout error when lock is not released in time', async () => {
    const manager = new LockManager();
    
    // Mock timers to control time
    mock.timers.enable({ apis: ['setTimeout'], now: 0 });
    
    try {
      // Node1 holds the lock
      await manager.tryAcquire(['file.ts'], 'write', 'node1');
      
      // Node2 tries to acquire with 2 second timeout
      const acquirePromise = (async () => {
        // @ts-expect-error - acquireLock() doesn't exist yet
        await manager.acquireLock(['file.ts'], 'write', 'node2', 2000);
      })();
      
      // Advance time past timeout WITHOUT releasing lock
      mock.timers.tick(2100);
      
      // Should reject with timeout error
      await assert.rejects(
        acquirePromise,
        (err: Error) => {
          assert.equal(err.name, 'LockTimeoutError');
          // @ts-expect-error - error properties not typed yet
          assert.equal(err.nodeId, 'node2');
          // @ts-expect-error
          assert.deepEqual(err.resources, ['file.ts']);
          return true;
        }
      );
      
      // Node1 should still own the lock
      assert.deepEqual(manager.getOwners('file.ts'), ['node1']);
    } finally {
      mock.timers.reset();
    }
  });
  
  /**
   * Scenario 4: Multiple Resources Wait
   * When waiting for multiple resources, all must be free before acquiring
   */
  it('waits for all resources to be released before acquiring', async () => {
    const manager = new LockManager();
    
    // Node B holds file1 and file3
    await manager.tryAcquire(['file1.ts'], 'write', 'nodeB');
    await manager.tryAcquire(['file3.ts'], 'write', 'nodeB');
    
    // Node A wants file1, file2, file3
    const acquirePromise = (async () => {
      // @ts-expect-error - acquireLock() doesn't exist yet
      await manager.acquireLock(['file1.ts', 'file2.ts', 'file3.ts'], 'write', 'nodeA', 5000);
    })();
    
    // Release file1 after 50ms
    setTimeout(async () => {
      await manager.release(['file1.ts'], 'nodeB');
    }, 50);
    
    // Release file3 after 150ms (100ms after file1)
    setTimeout(async () => {
      await manager.release(['file3.ts'], 'nodeB');
    }, 150);
    
    const startTime = Date.now();
    await acquirePromise;
    const elapsed = Date.now() - startTime;
    
    // Should wait for BOTH locks (~150ms total)
    assert.ok(elapsed >= 140 && elapsed < 250, `Expected ~150ms wait, got ${elapsed}ms`);
    
    // Node A should own all three locks
    assert.deepEqual(manager.getOwners('file1.ts'), ['nodeA']);
    assert.deepEqual(manager.getOwners('file2.ts'), ['nodeA']);
    assert.deepEqual(manager.getOwners('file3.ts'), ['nodeA']);
  });
  
  /**
   * Scenario 5: Queue Cleanup on Timeout
   * When a queued request times out, it should be removed from the queue
   * without affecting other queued requests
   */
  it('removes timed-out request from queue without affecting others', async () => {
    const manager = new LockManager();
    
    mock.timers.enable({ apis: ['setTimeout'], now: 0 });
    
    try {
      // Node1 holds the lock
      await manager.tryAcquire(['file.ts'], 'write', 'node1');
      
      // Queue 3 requests with different timeouts
      const request1 = (async () => {
        // @ts-expect-error
        await manager.acquireLock(['file.ts'], 'write', 'node2', 5000);
      })();
      
      const request2 = (async () => {
        // @ts-expect-error - This one will timeout
        await manager.acquireLock(['file.ts'], 'write', 'node3', 1000);
      })();
      
      const request3 = (async () => {
        // @ts-expect-error
        await manager.acquireLock(['file.ts'], 'write', 'node4', 5000);
      })();
      
      // Advance time to trigger timeout for request2 only
      mock.timers.tick(1100);
      
      // Request2 should have rejected
      await assert.rejects(request2, (err: Error) => err.name === 'LockTimeoutError');
      
      // Now release the lock
      await manager.release(['file.ts'], 'node1');
      mock.timers.tick(10);
      
      // Request1 should acquire successfully (was first in queue)
      await assert.doesNotReject(request1);
      assert.deepEqual(manager.getOwners('file.ts'), ['node2']);
      
      // Release and request3 should acquire next
      await manager.release(['file.ts'], 'node2');
      mock.timers.tick(10);
      
      await assert.doesNotReject(request3);
      assert.deepEqual(manager.getOwners('file.ts'), ['node4']);
    } finally {
      mock.timers.reset();
    }
  });
});
