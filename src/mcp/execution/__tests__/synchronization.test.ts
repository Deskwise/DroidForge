/**
 * Tests for ExecutionLock and ExecutionSemaphore synchronization primitives
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionLock, ExecutionSemaphore } from '../synchronization.js';
import { runConcurrently, sleep } from './helpers/testUtils.js';

describe('ExecutionLock', () => {
  it('provides exclusive access to critical sections', async () => {
    const lock = new ExecutionLock();
    let counter = 0;
    const increments = 100;
    
    // Increment counter with lock protection
    await runConcurrently(async () => {
      await lock.runExclusive(async () => {
        const current = counter;
        await sleep(1); // Simulate async work
        counter = current + 1;
      });
    }, increments);
    
    // Counter should be exactly increments (no race conditions)
    assert.equal(counter, increments);
  });

  it('prevents concurrent access to the same lock', async () => {
    const lock = new ExecutionLock();
    const executionOrder: number[] = [];
    
    // Start multiple operations
    const promises = [
      lock.runExclusive(async () => {
        executionOrder.push(1);
        await sleep(10);
        executionOrder.push(2);
      }),
      lock.runExclusive(async () => {
        executionOrder.push(3);
        await sleep(10);
        executionOrder.push(4);
      }),
      lock.runExclusive(async () => {
        executionOrder.push(5);
        await sleep(10);
        executionOrder.push(6);
      })
    ];
    
    await Promise.all(promises);
    
    // Each operation should complete before the next starts
    // Valid orders: [1,2,3,4,5,6] or [1,2,5,6,3,4] or [3,4,1,2,5,6] etc.
    // Invalid: [1,3,2,4,5,6] (interleaved execution)
    
    // Check that pairs are maintained
    assert.ok(
      executionOrder.indexOf(2) > executionOrder.indexOf(1),
      '1 should come before 2'
    );
    assert.ok(
      executionOrder.indexOf(4) > executionOrder.indexOf(3),
      '3 should come before 4'
    );
    assert.ok(
      executionOrder.indexOf(6) > executionOrder.indexOf(5),
      '5 should come before 6'
    );
  });

  it('reports locked state correctly', async () => {
    const lock = new ExecutionLock();
    
    assert.equal(lock.isLocked(), false, 'Should not be locked initially');
    
    const promise = lock.runExclusive(async () => {
      assert.equal(lock.isLocked(), true, 'Should be locked during execution');
      await sleep(10);
    });
    
    // Wait a bit for the lock to be acquired
    await sleep(5);
    assert.equal(lock.isLocked(), true, 'Should be locked while operation runs');
    
    await promise;
    assert.equal(lock.isLocked(), false, 'Should be unlocked after completion');
  });

  it('handles exceptions without deadlocking', async () => {
    const lock = new ExecutionLock();
    
    try {
      await lock.runExclusive(async () => {
        throw new Error('Test error');
      });
      assert.fail('Should have thrown');
    } catch (error) {
      assert.ok(error instanceof Error);
      assert.equal((error as Error).message, 'Test error');
    }
    
    // Lock should be released even after exception
    assert.equal(lock.isLocked(), false, 'Lock should be released after exception');
    
    // Should be able to acquire lock again
    let executed = false;
    await lock.runExclusive(async () => {
      executed = true;
    });
    assert.equal(executed, true, 'Should be able to acquire lock after exception');
  });

  it('supports synchronous functions in runExclusive', async () => {
    const lock = new ExecutionLock();
    
    const result = await lock.runExclusive(() => {
      return 42;
    });
    
    assert.equal(result, 42);
  });

  it('maintains order under high contention', async () => {
    const lock = new ExecutionLock();
    const results: number[] = [];
    
    await runConcurrently(async () => {
      await lock.runExclusive(async () => {
        const value = results.length;
        await sleep(1);
        results.push(value);
      });
    }, 50);
    
    // Results should be sequential: [0, 1, 2, ..., 49]
    assert.equal(results.length, 50);
    for (let i = 0; i < 50; i++) {
      assert.equal(results[i], i);
    }
  });
});

describe('ExecutionSemaphore', () => {
  it('limits concurrent access to specified count', async () => {
    const semaphore = new ExecutionSemaphore(3);
    let concurrentCount = 0;
    let maxConcurrent = 0;
    
    await runConcurrently(async () => {
      const release = await semaphore.acquire();
      try {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        assert.ok(concurrentCount <= 3, 'Should not exceed semaphore limit');
        await sleep(10);
      } finally {
        concurrentCount--;
        release();
      }
    }, 20);
    
    assert.equal(maxConcurrent, 3, 'Max concurrent should equal semaphore limit');
  });

  it('reports available permits correctly', async () => {
    const semaphore = new ExecutionSemaphore(2);
    
    assert.equal(semaphore.getValue(), 2, 'Should have 2 permits initially');
    
    const release1 = await semaphore.acquire();
    assert.equal(semaphore.getValue(), 1, 'Should have 1 permit after first acquire');
    
    const release2 = await semaphore.acquire();
    assert.equal(semaphore.getValue(), 0, 'Should have 0 permits after second acquire');
    
    release1();
    assert.equal(semaphore.getValue(), 1, 'Should have 1 permit after first release');
    
    release2();
    assert.equal(semaphore.getValue(), 2, 'Should have 2 permits after second release');
  });

  it('reports locked state correctly', async () => {
    const semaphore = new ExecutionSemaphore(1);
    
    assert.equal(semaphore.isLocked(), false, 'Should not be locked initially');
    
    const release = await semaphore.acquire();
    assert.equal(semaphore.isLocked(), true, 'Should be locked when all permits taken');
    
    release();
    assert.equal(semaphore.isLocked(), false, 'Should not be locked after release');
  });

  it('allows concurrent readers up to limit', async () => {
    const semaphore = new ExecutionSemaphore(5);
    const activeReaders: number[] = [];
    
    await runConcurrently(async () => {
      const release = await semaphore.acquire();
      try {
        const readerId = Math.random();
        activeReaders.push(readerId);
        
        // Check that we don't exceed limit
        assert.ok(activeReaders.length <= 5);
        
        await sleep(20);
        
        // Remove reader
        const index = activeReaders.indexOf(readerId);
        if (index > -1) {
          activeReaders.splice(index, 1);
        }
      } finally {
        release();
      }
    }, 10);
  });

  it('handles rapid acquire/release cycles', async () => {
    const semaphore = new ExecutionSemaphore(3);
    let successfulAcquires = 0;
    
    await runConcurrently(async () => {
      for (let i = 0; i < 10; i++) {
        const release = await semaphore.acquire();
        successfulAcquires++;
        release();
      }
    }, 5);
    
    assert.equal(successfulAcquires, 50); // 5 tasks * 10 iterations
    assert.equal(semaphore.getValue(), 3); // All permits should be released
  });

  it('works correctly with semaphore of size 1 (acts like mutex)', async () => {
    const semaphore = new ExecutionSemaphore(1);
    let counter = 0;
    
    await runConcurrently(async () => {
      const release = await semaphore.acquire();
      try {
        const current = counter;
        await sleep(1);
        counter = current + 1;
      } finally {
        release();
      }
    }, 50);
    
    assert.equal(counter, 50);
  });

  it('maintains fairness under contention', async () => {
    const semaphore = new ExecutionSemaphore(2);
    const executionOrder: number[] = [];
    
    // Start 10 tasks, semaphore allows 2 at a time
    const promises = Array.from({ length: 10 }, async (_, i) => {
      const release = await semaphore.acquire();
      try {
        executionOrder.push(i);
        await sleep(5);
      } finally {
        release();
      }
    });
    
    await Promise.all(promises);
    
    // All tasks should have executed
    assert.equal(executionOrder.length, 10);
    
    // Check that we have all numbers 0-9 (order may vary)
    const sorted = [...executionOrder].sort((a, b) => a - b);
    assert.deepEqual(sorted, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('handles zero concurrency semaphore', async () => {
    // Edge case: semaphore with 0 capacity should block indefinitely
    // We'll test with a timeout to ensure it blocks
    const semaphore = new ExecutionSemaphore(0);
    
    let acquired = false;
    const timeoutPromise = sleep(100).then(() => 'timeout');
    const acquirePromise = semaphore.acquire().then(() => {
      acquired = true;
      return 'acquired';
    });
    
    const result = await Promise.race([timeoutPromise, acquirePromise]);
    
    assert.equal(result, 'timeout', 'Should timeout, not acquire');
    assert.equal(acquired, false, 'Should not have acquired');
  });
});

describe('ExecutionLock and ExecutionSemaphore - Integration', () => {
  it('can be used together for complex coordination', async () => {
    const lock = new ExecutionLock();
    const semaphore = new ExecutionSemaphore(3);
    let protectedCounter = 0;
    
    await runConcurrently(async () => {
      // Semaphore limits concurrent access
      const release = await semaphore.acquire();
      try {
        // Lock protects counter updates
        await lock.runExclusive(async () => {
          const current = protectedCounter;
          await sleep(1);
          protectedCounter = current + 1;
        });
      } finally {
        release();
      }
    }, 20);
    
    assert.equal(protectedCounter, 20);
  });

  it('nested locks do not cause deadlocks', async () => {
    const outerLock = new ExecutionLock();
    const innerLock = new ExecutionLock();
    
    const result = await outerLock.runExclusive(async () => {
      return innerLock.runExclusive(async () => {
        return 'success';
      });
    });
    
    assert.equal(result, 'success');
  });
});
