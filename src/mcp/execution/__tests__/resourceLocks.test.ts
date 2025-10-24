import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ResourceLockManager } from '../resourceLocks.js';
import { runConcurrently, sleep } from './helpers/testUtils.js';

describe('ResourceLockManager', () => {
  it('allows multiple readers to acquire read lock', async () => {
    const manager = new ResourceLockManager();

    const acquired1 = await manager.tryAcquire(['file.ts'], 'read', 'node1');
    assert.equal(acquired1, true);

    const acquired2 = await manager.tryAcquire(['file.ts'], 'read', 'node2');
    assert.equal(acquired2, true);

    const lockState = manager.getLockState();
    const fileLock = lockState.get('file.ts');
    assert.ok(fileLock);
    assert.equal(fileLock.mode, 'read');
    assert.equal(fileLock.owners.length, 2);
    assert.ok(fileLock.owners.includes('node1'));
    assert.ok(fileLock.owners.includes('node2'));
  });

  it('blocks write lock when read lock is held', async () => {
    const manager = new ResourceLockManager();

    await manager.tryAcquire(['file.ts'], 'read', 'node1');
    const acquired = await manager.tryAcquire(['file.ts'], 'write', 'node2');

    assert.equal(acquired, false);
  });

  it('blocks read lock when write lock is held', async () => {
    const manager = new ResourceLockManager();

    await manager.tryAcquire(['file.ts'], 'write', 'node1');
    const acquired = await manager.tryAcquire(['file.ts'], 'read', 'node2');

    assert.equal(acquired, false);
  });

  it('blocks write lock when another write lock is held', async () => {
    const manager = new ResourceLockManager();

    await manager.tryAcquire(['file.ts'], 'write', 'node1');
    const acquired = await manager.tryAcquire(['file.ts'], 'write', 'node2');

    assert.equal(acquired, false);
  });

  it('allows analysis mode with read locks', async () => {
    const manager = new ResourceLockManager();

    await manager.tryAcquire(['file.ts'], 'read', 'node1');
    const acquired = await manager.tryAcquire(['file.ts'], 'analysis', 'node2');

    assert.equal(acquired, true);
  });

  it('allows multiple analysis locks', async () => {
    const manager = new ResourceLockManager();

    await manager.tryAcquire(['file.ts'], 'analysis', 'node1');
    const acquired = await manager.tryAcquire(['file.ts'], 'analysis', 'node2');

    assert.equal(acquired, true);
  });

  it('blocks write lock when analysis lock is held', async () => {
    const manager = new ResourceLockManager();

    await manager.tryAcquire(['file.ts'], 'analysis', 'node1');
    const acquired = await manager.tryAcquire(['file.ts'], 'write', 'node2');

    assert.equal(acquired, false);
  });

  it('releases locks correctly', async () => {
    const manager = new ResourceLockManager();

    await manager.tryAcquire(['file.ts'], 'write', 'node1');
    assert.equal(manager.isLocked('file.ts'), true);

    await manager.release(['file.ts'], 'node1');
    assert.equal(manager.isLocked('file.ts'), false);

    // Should be able to acquire again
    const acquired = await manager.tryAcquire(['file.ts'], 'write', 'node2');
    assert.equal(acquired, true);
  });

  it('handles multiple resources with canonical ordering', async () => {
    const manager = new ResourceLockManager();

    // Acquire in different order - should still work due to canonical ordering
    await manager.tryAcquire(['file2.ts', 'file1.ts'], 'write', 'node1');

    const state = manager.getLockState();
    assert.equal(state.size, 2);
    assert.ok(state.has('file1.ts'));
    assert.ok(state.has('file2.ts'));
  });

  it('prevents deadlock through canonical ordering', async () => {
    const manager = new ResourceLockManager();

    // Node1 acquires file1, file2
    await manager.tryAcquire(['file1.ts', 'file2.ts'], 'write', 'node1');

    // Node2 tries to acquire file2, file1 (different order)
    // Should fail because both are locked, not deadlock
    const acquired = await manager.tryAcquire(['file2.ts', 'file1.ts'], 'write', 'node2');
    assert.equal(acquired, false);

    // Release and try again
    await manager.release(['file1.ts', 'file2.ts'], 'node1');
    const acquired2 = await manager.tryAcquire(['file2.ts', 'file1.ts'], 'write', 'node2');
    assert.equal(acquired2, true);
  });

  it('allows node to acquire lock it already owns', async () => {
    const manager = new ResourceLockManager();

    await manager.tryAcquire(['file.ts'], 'write', 'node1');
    const acquired = await manager.tryAcquire(['file.ts'], 'write', 'node1');

    assert.equal(acquired, true);
  });

  it('handles partial lock acquisition failure correctly', async () => {
    const manager = new ResourceLockManager();

    // Lock file1
    await manager.tryAcquire(['file1.ts'], 'write', 'node1');

    // Try to acquire both file1 and file2 - should fail without partial acquisition
    const acquired = await manager.tryAcquire(['file1.ts', 'file2.ts'], 'write', 'node2');
    assert.equal(acquired, false);

    // file2 should not be locked
    assert.equal(manager.isLocked('file2.ts'), false);
  });

  it('reports lock owners correctly', async () => {
    const manager = new ResourceLockManager();

    await manager.tryAcquire(['file.ts'], 'read', 'node1');
    await manager.tryAcquire(['file.ts'], 'read', 'node2');

    const owners = manager.getOwners('file.ts');
    assert.equal(owners.length, 2);
    assert.ok(owners.includes('node1'));
    assert.ok(owners.includes('node2'));
  });

  it('handles concurrent lock requests safely', async () => {
    const manager = new ResourceLockManager();
    let writeAcquired = 0;

    await runConcurrently(async () => {
      const acquired = await manager.tryAcquire(['file.ts'], 'write', `node-${Math.random()}`);
      if (acquired) {
        writeAcquired++;
        await sleep(10);
      }
    }, 10);

    // Only one should have acquired the write lock
    assert.equal(writeAcquired, 1);
  });

  it('maintains lock state consistency under concurrent operations', async () => {
    const manager = new ResourceLockManager();

    // Acquire and release concurrently
    await runConcurrently(async () => {
      const nodeId = `node-${Math.random()}`;
      const acquired = await manager.tryAcquire(['file1.ts', 'file2.ts'], 'write', nodeId);
      if (acquired) {
        await sleep(5);
        await manager.release(['file1.ts', 'file2.ts'], nodeId);
      }
    }, 20);

    // All locks should be released
    assert.equal(manager.getLockedResourceCount(), 0);
  });

  it('clears all locks', async () => {
    const manager = new ResourceLockManager();

    await manager.tryAcquire(['file1.ts'], 'write', 'node1');
    await manager.tryAcquire(['file2.ts'], 'read', 'node2');

    assert.equal(manager.getLockedResourceCount(), 2);

    manager.clear();

    assert.equal(manager.getLockedResourceCount(), 0);
    assert.equal(manager.isLocked('file1.ts'), false);
    assert.equal(manager.isLocked('file2.ts'), false);
  });

  it('handles empty resource list', async () => {
    const manager = new ResourceLockManager();

    const acquired = await manager.tryAcquire([], 'write', 'node1');
    assert.equal(acquired, true);

    await manager.release([], 'node1');
    assert.equal(manager.getLockedResourceCount(), 0);
  });
});
