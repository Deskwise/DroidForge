import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { writeFileAtomic, ensureDir } from '../fs.js';
import type { IStagingManager } from './staging.js';

/**
 * Result of a merge operation.
 */
export interface MergeResult {
  /**
   * Whether the merge was successful.
   */
  success: boolean;

  /**
   * List of files that had conflicts.
   */
  conflicts: string[];

  /**
   * List of files that were successfully merged.
   */
  mergedFiles?: string[];

  /**
   * Optional snapshot ID if a snapshot was created before merge.
   */
  snapshotId?: string;
}

/**
 * Represents a change to a file from a specific node.
 */
interface FileChange {
  nodeId: string;
  content: string;
  contentHash: string;
}

/**
 * Interface for merging changes from isolated staging directories back to the repository.
 */
export interface IExecutionMerger {
  /**
   * Merge completed node outputs into the repository.
   * Collects changes from all staging areas, detects conflicts, and applies changes atomically.
   * 
   * @param repoRoot - Root directory of the repository
   * @param executionId - Unique execution identifier
   * @param completedNodes - Array of node IDs that have completed
   * @param stagingManager - Staging manager to use for collecting changes
   * @returns Merge result with success status and any conflicts
   */
  merge(
    repoRoot: string,
    executionId: string,
    completedNodes: string[],
    stagingManager: IStagingManager
  ): Promise<MergeResult>;

  /**
   * Detect conflicts in a set of changes.
   * A conflict occurs when multiple nodes modify the same file with different contents.
   * 
   * @param repoRoot - Root directory of the repository
   * @param changes - Map of file paths to arrays of changes
   * @returns List of files that have conflicts
   */
  detectConflicts(
    repoRoot: string,
    changes: Map<string, FileChange[]>
  ): Promise<string[]>;
}

/**
 * Implementation of merge functionality for parallel execution.
 * Handles collecting changes from staging areas and merging them back to the repository.
 */
export class ExecutionMerger implements IExecutionMerger {
  /**
   * Calculate a hash of file content for conflict detection.
   */
  private hashContent(content: string): string {
    return createHash('sha256').update(content, 'utf-8').digest('hex');
  }

  /**
   * Get the staging path for a node.
   */
  private getStagingPath(repoRoot: string, executionId: string, nodeId: string): string {
    return join(repoRoot, '.droidforge', 'exec', executionId, 'staging', nodeId);
  }

  /**
   * Load the node state to get resource claims for a completed node.
   * This is a simplified version - in production, this would query the ExecutionManager.
   */
  private async getNodeResourceClaims(
    repoRoot: string,
    executionId: string,
    nodeId: string
  ): Promise<string[]> {
    // Try to read node metadata from execution state
    const statePath = join(repoRoot, '.droidforge', 'exec', executionId, 'state.json');
    try {
      const stateData = await fs.readFile(statePath, 'utf-8');
      const state = JSON.parse(stateData);
      const node = state.nodes?.find((n: any) => n.nodeId === nodeId);
      return node?.spec?.resourceClaims ?? [];
    } catch {
      // If we can't read the state, return an empty array
      // In production, this would be provided by the ExecutionManager
      return [];
    }
  }

  async merge(
    repoRoot: string,
    executionId: string,
    completedNodes: string[],
    stagingManager: IStagingManager
  ): Promise<MergeResult> {
    // Map of file path to list of changes
    const allChanges = new Map<string, FileChange[]>();

    // Collect all changes from staging areas
    for (const nodeId of completedNodes) {
      const stagingPath = this.getStagingPath(repoRoot, executionId, nodeId);
      
      // Check if staging directory exists
      try {
        await fs.access(stagingPath);
      } catch {
        // Staging directory doesn't exist, skip this node
        continue;
      }

      // Get resource claims for this node
      const resourceClaims = await this.getNodeResourceClaims(repoRoot, executionId, nodeId);
      
      // Collect changes from staging
      const changes = await stagingManager.collectChanges(repoRoot, stagingPath, resourceClaims);

      // Group changes by file
      for (const [filePath, content] of changes) {
        if (!allChanges.has(filePath)) {
          allChanges.set(filePath, []);
        }
        allChanges.get(filePath)!.push({
          nodeId,
          content,
          contentHash: this.hashContent(content)
        });
      }
    }

    // Detect conflicts
    const conflicts = await this.detectConflicts(repoRoot, allChanges);

    if (conflicts.length > 0) {
      return {
        success: false,
        conflicts
      };
    }

    // Apply all changes atomically
    const mergedFiles: string[] = [];
    for (const [filePath, changes] of allChanges) {
      const targetPath = join(repoRoot, filePath);
      // Use the first change (they're all identical if no conflicts)
      await writeFileAtomic(targetPath, changes[0].content);
      mergedFiles.push(filePath);
    }

    return {
      success: true,
      conflicts: [],
      mergedFiles
    };
  }

  async detectConflicts(
    repoRoot: string,
    changes: Map<string, FileChange[]>
  ): Promise<string[]> {
    const conflicts: string[] = [];

    for (const [filePath, fileChanges] of changes) {
      // If only one node modified this file, no conflict
      if (fileChanges.length <= 1) {
        continue;
      }

      // Check if all changes have the same content
      const uniqueHashes = new Set(fileChanges.map(c => c.contentHash));
      
      // If there are multiple different versions, it's a conflict
      if (uniqueHashes.size > 1) {
        conflicts.push(filePath);
      }
    }

    return conflicts;
  }
}
