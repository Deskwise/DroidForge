/**
 * Tests for ResourceMatcher
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ResourceMatcher } from '../resourceMatcher.js';

describe('ResourceMatcher', () => {
  describe('overlaps()', () => {
    it('should detect exact matches', () => {
      const matcher = new ResourceMatcher();

      assert.ok(matcher.overlaps('src/file.ts', 'src/file.ts'));
      assert.ok(matcher.overlaps('tests/test.ts', 'tests/test.ts'));
    });

    it('should detect glob pattern matches', () => {
      const matcher = new ResourceMatcher();

      // Glob matches specific file
      assert.ok(matcher.overlaps('src/**', 'src/api/server.ts'));
      assert.ok(matcher.overlaps('src/api/server.ts', 'src/**'));
      
      // Different patterns
      assert.ok(matcher.overlaps('src/*.ts', 'src/file.ts'));
      assert.ok(matcher.overlaps('src/**/*.ts', 'src/api/handler.ts'));
    });

    it('should detect hierarchical overlaps', () => {
      const matcher = new ResourceMatcher();

      // Directory contains file
      assert.ok(matcher.overlaps('src', 'src/api/server.ts'));
      assert.ok(matcher.overlaps('src/api/server.ts', 'src'));
      
      // Nested directories
      assert.ok(matcher.overlaps('src', 'src/api'));
      assert.ok(matcher.overlaps('src/api', 'src'));
    });

    it('should not detect overlaps for disjoint paths', () => {
      const matcher = new ResourceMatcher();

      assert.ok(!matcher.overlaps('src/**', 'tests/**'));
      assert.ok(!matcher.overlaps('src/api', 'src/lib'));
      assert.ok(!matcher.overlaps('src/file1.ts', 'src/file2.ts'));
    });

    it('should handle overlapping glob patterns', () => {
      const matcher = new ResourceMatcher();

      // Both globs cover same area
      assert.ok(matcher.overlaps('src/**', 'src/**/*.ts'));
      assert.ok(matcher.overlaps('src/api/**', 'src/**'));
    });

    it('should handle paths with ./ prefix', () => {
      const matcher = new ResourceMatcher();

      assert.ok(matcher.overlaps('./src/file.ts', 'src/file.ts'));
      assert.ok(matcher.overlaps('src/file.ts', './src/file.ts'));
    });

    it('should handle normalized paths', () => {
      const matcher = new ResourceMatcher();

      assert.ok(matcher.overlaps('src/api/../file.ts', 'src/file.ts'));
    });
  });

  describe('isAncestor()', () => {
    it('should detect direct parent-child relationship', () => {
      const matcher = new ResourceMatcher();

      assert.ok(matcher.isAncestor('src', 'src/file.ts'));
      assert.ok(matcher.isAncestor('src', 'src/api'));
    });

    it('should detect nested hierarchies', () => {
      const matcher = new ResourceMatcher();

      assert.ok(matcher.isAncestor('src', 'src/api/handlers/user.ts'));
      assert.ok(matcher.isAncestor('src/api', 'src/api/handlers/user.ts'));
    });

    it('should not detect non-ancestor relationships', () => {
      const matcher = new ResourceMatcher();

      assert.ok(!matcher.isAncestor('src/api', 'src/lib'));
      assert.ok(!matcher.isAncestor('tests', 'src/file.ts'));
    });

    it('should handle paths with glob patterns', () => {
      const matcher = new ResourceMatcher();

      assert.ok(matcher.isAncestor('src/**', 'src/api/file.ts'));
      assert.ok(matcher.isAncestor('src', 'src/**/*.ts'));
    });

    it('should handle same path', () => {
      const matcher = new ResourceMatcher();

      assert.ok(matcher.isAncestor('src', 'src'));
      assert.ok(matcher.isAncestor('src/file.ts', 'src/file.ts'));
    });

    it('should handle root paths', () => {
      const matcher = new ResourceMatcher();

      assert.ok(matcher.isAncestor('.', 'src/file.ts'));
      assert.ok(matcher.isAncestor('.', 'tests/test.ts'));
    });
  });

  describe('expandClaims()', () => {
    it('should return non-glob claims as-is', async () => {
      const matcher = new ResourceMatcher();
      
      const claims = ['src/file.ts', 'tests/test.ts'];
      const expanded = await matcher.expandClaims('/tmp/repo', claims);

      assert.ok(expanded.includes('src/file.ts'));
      assert.ok(expanded.includes('tests/test.ts'));
    });

    it('should deduplicate expanded claims', async () => {
      const matcher = new ResourceMatcher();
      
      const claims = ['src/file.ts', 'src/file.ts'];
      const expanded = await matcher.expandClaims('/tmp/repo', claims);

      assert.equal(expanded.length, 1);
      assert.ok(expanded.includes('src/file.ts'));
    });

    it('should handle empty claims array', async () => {
      const matcher = new ResourceMatcher();
      
      const expanded = await matcher.expandClaims('/tmp/repo', []);

      assert.equal(expanded.length, 0);
    });

    it('should cache expansion results', async () => {
      const matcher = new ResourceMatcher();
      
      // First expansion
      const claims1 = ['src/file.ts'];
      await matcher.expandClaims('/tmp/repo', claims1);

      // Second expansion should use cache (we can't directly test cache hit,
      // but we can verify the result is consistent)
      const expanded = await matcher.expandClaims('/tmp/repo', claims1);
      
      assert.ok(expanded.includes('src/file.ts'));
    });

    it('should invalidate cache correctly', async () => {
      const matcher = new ResourceMatcher();
      
      await matcher.expandClaims('/tmp/repo', ['src/file.ts']);
      
      matcher.invalidateCache('/tmp/repo');
      
      // After invalidation, expansion should still work
      const expanded = await matcher.expandClaims('/tmp/repo', ['src/file.ts']);
      assert.ok(expanded.includes('src/file.ts'));
    });

    it('should clear all caches', async () => {
      const matcher = new ResourceMatcher();
      
      await matcher.expandClaims('/tmp/repo1', ['src/file.ts']);
      await matcher.expandClaims('/tmp/repo2', ['tests/test.ts']);
      
      matcher.clearCache();
      
      // After clearing, expansion should still work
      const expanded = await matcher.expandClaims('/tmp/repo1', ['src/file.ts']);
      assert.ok(expanded.includes('src/file.ts'));
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple overlapping patterns', () => {
      const matcher = new ResourceMatcher();

      // src/** should overlap with all of these
      assert.ok(matcher.overlaps('src/**', 'src/api/**'));
      assert.ok(matcher.overlaps('src/**', 'src/lib/**'));
      assert.ok(matcher.overlaps('src/**', 'src/file.ts'));
    });

    it('should handle realistic file paths', () => {
      const matcher = new ResourceMatcher();

      // Real-world examples
      assert.ok(matcher.overlaps('src/mcp/**', 'src/mcp/execution/manager.ts'));
      assert.ok(matcher.overlaps('src/mcp/execution/**', 'src/mcp/execution/manager.ts'));
      assert.ok(!matcher.overlaps('src/mcp/tools/**', 'src/mcp/execution/manager.ts'));
    });

    it('should handle mixed glob and literal paths', () => {
      const matcher = new ResourceMatcher();

      const claims = [
        'src/**',
        'tests/integration.test.ts',
        'docs/*.md'
      ];

      // src/** overlaps with specific files under src
      assert.ok(matcher.overlaps(claims[0], 'src/api/server.ts'));
      
      // Specific test file doesn't overlap with src
      assert.ok(!matcher.overlaps(claims[1], 'src/file.ts'));
      
      // Docs glob overlaps with specific doc
      assert.ok(matcher.overlaps(claims[2], 'docs/README.md'));
    });

    it('should handle edge cases', () => {
      const matcher = new ResourceMatcher();

      // Empty strings
      assert.ok(matcher.overlaps('', ''));
      
      // Root directory
      assert.ok(matcher.overlaps('.', 'src/file.ts'));
      
      // Deep nesting
      assert.ok(matcher.overlaps('a/b/c/d', 'a/b/c/d/e/f/g/h/file.ts'));
    });
  });
});
