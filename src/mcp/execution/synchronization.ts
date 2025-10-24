import { Mutex, Semaphore } from 'async-mutex';

/**
 * ExecutionLock provides exclusive access to critical sections.
 * Wraps the async-mutex Mutex for ergonomic usage.
 */
export class ExecutionLock {
  private readonly mutex = new Mutex();

  /**
   * Execute a function with exclusive access.
   * @param fn The function to execute exclusively
   * @returns The result of the function
   */
  async runExclusive<T>(fn: () => Promise<T> | T): Promise<T> {
    return this.mutex.runExclusive(fn);
  }

  /**
   * Check if the lock is currently held.
   * @returns true if locked, false otherwise
   */
  isLocked(): boolean {
    return this.mutex.isLocked();
  }
}

/**
 * ExecutionSemaphore limits concurrent access to a resource.
 * Useful for controlling concurrency levels.
 */
export class ExecutionSemaphore {
  private readonly semaphore: Semaphore;

  /**
   * Create a new semaphore with the given concurrency limit.
   * @param concurrency Maximum number of concurrent accesses
   */
  constructor(concurrency: number) {
    this.semaphore = new Semaphore(concurrency);
  }

  /**
   * Acquire access to the semaphore.
   * @returns A release function to call when done
   */
  async acquire(): Promise<() => void> {
    const [, release] = await this.semaphore.acquire();
    return release;
  }

  /**
   * Get the number of available permits.
   * @returns Number of available permits
   */
  getValue(): number {
    return this.semaphore.getValue();
  }

  /**
   * Check if the semaphore is fully acquired.
   * @returns true if no permits available, false otherwise
   */
  isLocked(): boolean {
    return this.semaphore.getValue() === 0;
  }
}
