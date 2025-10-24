/**
 * Resource Matcher for intelligent resource claim overlap detection
 * Handles glob patterns and path hierarchies for resource locking
 */

import micromatch from 'micromatch';
import { normalize } from 'node:path';
import { globby } from 'globby';

/**
 * Resource matcher interface
 */
export interface IResourceMatcher {
  overlaps(claim1: string, claim2: string): boolean;
  expandClaims(repoRoot: string, claims: string[]): Promise<string[]>;
  isAncestor(ancestor: string, descendant: string): boolean;
}

/**
 * ResourceMatcher provides intelligent resource overlap detection
 * Supports glob patterns, path hierarchies, and file expansion
 */
export class ResourceMatcher implements IResourceMatcher {
  private expansionCache = new Map<string, string[]>();

  /**
   * Check if two resource claims overlap
   * Examples:
   *   'src/**' overlaps with 'src/api/server.ts' -> true
   *   'src/api/**' overlaps with 'src/**' -> true
   *   'tests/**' overlaps with 'src/**' -> false
   *   'src/file.ts' overlaps with 'src/file.ts' -> true
   *
   * @param claim1 First resource claim (may be a glob pattern)
   * @param claim2 Second resource claim (may be a glob pattern)
   * @returns true if the claims overlap, false otherwise
   */
  overlaps(claim1: string, claim2: string): boolean {
    const norm1 = this.normalizePath(claim1);
    const norm2 = this.normalizePath(claim2);

    // Exact match
    if (norm1 === norm2) {
      return true;
    }

    // Check if either is a glob pattern that matches the other
    if (this.isGlobPattern(norm1)) {
      if (micromatch.isMatch(norm2, norm1)) {
        return true;
      }
      // Also check if the non-glob could be under the glob's directory
      const baseDir = this.getBaseDirectory(norm1);
      if (this.isAncestor(baseDir, norm2)) {
        return true;
      }
    }

    if (this.isGlobPattern(norm2)) {
      if (micromatch.isMatch(norm1, norm2)) {
        return true;
      }
      // Also check if the non-glob could be under the glob's directory
      const baseDir = this.getBaseDirectory(norm2);
      if (this.isAncestor(baseDir, norm1)) {
        return true;
      }
    }

    // Check path hierarchy (one is ancestor of the other)
    if (this.isAncestor(norm1, norm2) || this.isAncestor(norm2, norm1)) {
      return true;
    }

    // Check if they're both globs that could overlap
    if (this.isGlobPattern(norm1) && this.isGlobPattern(norm2)) {
      const base1 = this.getBaseDirectory(norm1);
      const base2 = this.getBaseDirectory(norm2);
      
      // If base directories overlap, the globs might overlap
      if (base1 === base2 || this.isAncestor(base1, base2) || this.isAncestor(base2, base1)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if one path is an ancestor of another
   * @param ancestor Potential ancestor path
   * @param descendant Potential descendant path
   * @returns true if ancestor is a parent/grandparent/etc of descendant
   */
  isAncestor(ancestor: string, descendant: string): boolean {
    // Remove glob patterns for hierarchy check
    const cleanAncestor = this.removeGlobPatterns(ancestor);
    const cleanDescendant = this.removeGlobPatterns(descendant);

    // Normalize paths - use forward slashes for consistency
    const normAncestor = this.normalizePath(cleanAncestor).replace(/\\/g, '/');
    const normDescendant = this.normalizePath(cleanDescendant).replace(/\\/g, '/');

    // Root directory (. or empty) is ancestor of everything
    if (normAncestor === '.' || normAncestor === '' || normAncestor === '/') {
      return true;
    }

    // Check if descendant starts with ancestor path
    if (normDescendant === normAncestor) {
      return true;
    }

    // Ensure we're checking directory boundaries
    const ancestorWithSep = normAncestor.endsWith('/') ? normAncestor : `${normAncestor}/`;
    return normDescendant.startsWith(ancestorWithSep);
  }

  /**
   * Expand glob patterns to actual file paths
   * @param repoRoot Repository root directory
   * @param claims Array of resource claims (may include globs)
   * @returns Array of expanded file paths
   */
  async expandClaims(repoRoot: string, claims: string[]): Promise<string[]> {
    const expanded = new Set<string>();

    for (const claim of claims) {
      const cacheKey = `${repoRoot}:${claim}`;

      // Check cache first
      if (this.expansionCache.has(cacheKey)) {
        const cached = this.expansionCache.get(cacheKey)!;
        cached.forEach(f => expanded.add(f));
        continue;
      }

      // If not a glob, add as-is
      if (!this.isGlobPattern(claim)) {
        expanded.add(claim);
        this.expansionCache.set(cacheKey, [claim]);
        continue;
      }

      // Expand glob pattern
      try {
        const files = await globby(claim, {
          cwd: repoRoot,
          dot: true,
          onlyFiles: true,
          absolute: false
        });

        this.expansionCache.set(cacheKey, files);
        for (const f of files) {
          expanded.add(f);
        }
      } catch (error) {
        // If glob expansion fails, treat as literal path
        console.warn(`Failed to expand glob pattern ${claim}:`, error);
        expanded.add(claim);
        this.expansionCache.set(cacheKey, [claim]);
      }
    }

    return Array.from(expanded);
  }

  /**
   * Invalidate expansion cache for a repository
   * @param repoRoot Repository root directory
   */
  invalidateCache(repoRoot: string): void {
    for (const key of this.expansionCache.keys()) {
      if (key.startsWith(`${repoRoot}:`)) {
        this.expansionCache.delete(key);
      }
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.expansionCache.clear();
  }

  /**
   * Normalize a path for consistent comparison
   * @param path Path to normalize
   * @returns Normalized path
   */
  private normalizePath(path: string): string {
    // Remove leading ./ or .\
    let normalized = path.replace(/^\.[\\/]/, '');

    // Normalize separators
    normalized = normalize(normalized);

    return normalized;
  }

  /**
   * Check if a path contains glob patterns
   * @param path Path to check
   * @returns true if path contains glob patterns
   */
  private isGlobPattern(path: string): boolean {
    return /[*?[{]/u.test(path);
  }

  /**
   * Remove glob patterns from a path to get base directory
   * @param path Path with potential glob patterns
   * @returns Path with glob patterns removed
   */
  private removeGlobPatterns(path: string): string {
    // Find the first occurrence of a glob character
    const globIndex = path.search(/[*?\[{]/);
    
    if (globIndex === -1) {
      return path;
    }

    // Return everything before the glob pattern
    const basePath = path.substring(0, globIndex);
    
    // Remove trailing separator if present
    return basePath.replace(/[\\/]+$/, '');
  }

  /**
   * Get the base directory from a glob pattern
   * @param pattern Glob pattern
   * @returns Base directory path
   */
  private getBaseDirectory(pattern: string): string {
    const withoutGlobs = this.removeGlobPatterns(pattern);
    
    // If nothing left, it's the root
    if (!withoutGlobs) {
      return '.';
    }

    return withoutGlobs;
  }
}
