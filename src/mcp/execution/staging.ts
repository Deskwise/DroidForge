import { join, relative } from 'node:path';
import { promises as fs } from 'node:fs';
import { globby } from 'globby';
import { ensureDir, removeIfExists } from '../fs.js';

/**
 * Interface for managing isolated staging directories for parallel execution.
 * Each node gets its own copy of the repository to work in isolation.
 */
export interface IStagingManager {
  /**
   * Create an isolated staging directory for a node.
   * Copies the repository to a staging area, excluding .droidforge directory.
   * 
   * @param repoRoot - Root directory of the repository
   * @param executionId - Unique execution identifier
   * @param nodeId - Node identifier for this task
   * @returns Path to the staging directory
   */
  createStaging(repoRoot: string, executionId: string, nodeId: string): Promise<string>;

  /**
   * Collect changes from a staging directory based on resource claims.
   * Reads files matching the resource claim patterns and returns their contents.
   * 
   * @param repoRoot - Root directory of the repository
   * @param stagingPath - Path to the staging directory
   * @param resourceClaims - Array of glob patterns for files to collect
   * @returns Map of relative file paths to their contents
   */
  collectChanges(
    repoRoot: string,
    stagingPath: string,
    resourceClaims: string[]
  ): Promise<Map<string, string>>;

  /**
   * Clean up a staging directory after work is complete.
   * Removes the staging directory and its contents.
   * 
   * @param repoRoot - Root directory of the repository
   * @param executionId - Unique execution identifier
   * @param nodeId - Node identifier for this task
   */
  cleanStaging(repoRoot: string, executionId: string, nodeId: string): Promise<void>;
}

/**
 * Implementation of staging directory management for isolated parallel execution.
 * Each droid works in its own copy of the repository to prevent conflicts.
 */
export class StagingManager implements IStagingManager {
  /**
   * Get the path to a staging directory for a specific node.
   */
  private getStagingPath(repoRoot: string, executionId: string, nodeId: string): string {
    return join(repoRoot, '.droidforge', 'exec', executionId, 'staging', nodeId);
  }

  /**
   * Check if a file should be copied to staging (exclude .droidforge directory).
   */
  private shouldCopy(srcPath: string, repoRoot: string): boolean {
    const rel = relative(repoRoot, srcPath);
    // Exclude .droidforge directory and hidden files/dirs at root level
    return !rel.startsWith('.droidforge') && rel !== '.git';
  }

  /**
   * Recursively copy directory contents, filtering out unwanted files.
   */
  private async copyDirectory(src: string, dest: string, repoRoot: string): Promise<void> {
    await ensureDir(dest);
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      if (!this.shouldCopy(srcPath, repoRoot)) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath, repoRoot);
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  async createStaging(repoRoot: string, executionId: string, nodeId: string): Promise<string> {
    const stagingPath = this.getStagingPath(repoRoot, executionId, nodeId);
    
    // Ensure staging directory exists
    await ensureDir(stagingPath);
    
    // Copy repository contents to staging, excluding .droidforge
    await this.copyDirectory(repoRoot, stagingPath, repoRoot);
    
    return stagingPath;
  }

  async collectChanges(
    repoRoot: string,
    stagingPath: string,
    resourceClaims: string[]
  ): Promise<Map<string, string>> {
    const changes = new Map<string, string>();
    
    // If no resource claims, return empty map
    if (!resourceClaims || resourceClaims.length === 0) {
      return changes;
    }

    // Use globby to find all matching files
    const files = await globby(resourceClaims, {
      cwd: stagingPath,
      absolute: true,
      onlyFiles: true,
      gitignore: false
    });

    // Read each file and store its contents
    for (const file of files) {
      try {
        const relPath = relative(stagingPath, file);
        const content = await fs.readFile(file, 'utf-8');
        changes.set(relPath, content);
      } catch (error) {
        // Skip files that can't be read (permissions, binary files, etc.)
        console.warn(`Failed to read file ${file}:`, error);
      }
    }

    return changes;
  }

  async cleanStaging(repoRoot: string, executionId: string, nodeId: string): Promise<void> {
    const stagingPath = this.getStagingPath(repoRoot, executionId, nodeId);
    await removeIfExists(stagingPath);
    
    // Try to clean up empty parent directories
    const stagingParent = join(repoRoot, '.droidforge', 'exec', executionId, 'staging');
    try {
      const entries = await fs.readdir(stagingParent);
      if (entries.length === 0) {
        await removeIfExists(stagingParent);
      }
    } catch {
      // Ignore errors if directory doesn't exist or can't be read
    }
  }
}
