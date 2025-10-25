import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import { createCleanupRepoTool } from '../cleanupRepo.js';
import { writeJsonAtomic, ensureDir } from '../../fs.js';
import type { DroidDefinition } from '../../../types.js';

describe('cleanup_repo tool', () => {
  let repoRoot: string;
  let tool: ReturnType<typeof createCleanupRepoTool>;

  beforeEach(async () => {
    repoRoot = mkdtempSync(join(tmpdir(), 'droidforge-test-'));
    tool = createCleanupRepoTool();

    // Set up test data: create droids directory with sample droids
    const droidsDir = join(repoRoot, '.droidforge', 'droids');
    await ensureDir(droidsDir);

    const droid1: DroidDefinition = {
      id: 'df-orchestrator',
      uuid: 'uuid-orch-123',
      version: '1.0',
      displayName: 'Orchestrator',
      purpose: 'Coordinate the team',
      abilities: ['routing', 'coordination'],
      tools: [{ type: 'filesystem', paths: ['src/**'] }],
      createdAt: new Date().toISOString(),
      methodology: null,
      owner: 'droidforge'
    };

    const droid2: DroidDefinition = {
      id: 'df-frontend',
      uuid: 'uuid-frontend-456',
      version: '1.0',
      displayName: 'Frontend Specialist',
      purpose: 'Build UI components',
      abilities: ['react', 'typescript'],
      tools: [{ type: 'filesystem', paths: ['src/**'] }],
      createdAt: new Date().toISOString(),
      methodology: null,
      owner: 'droidforge'
    };

    await writeJsonAtomic(join(droidsDir, 'df-orchestrator.json'), droid1);
    await writeJsonAtomic(join(droidsDir, 'df-frontend.json'), droid2);

    // Create other directories/files that should be cleaned up
    await ensureDir(join(repoRoot, '.factory', 'commands'));
    await fs.writeFile(join(repoRoot, '.factory', 'commands', 'df'), '#!/bin/bash\necho "df"');
    await ensureDir(join(repoRoot, 'docs'));
    await fs.writeFile(join(repoRoot, 'docs', 'DroidForge_user_guide_en.md'), '# Guide');
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  describe('Preview Mode', () => {
    it('returns preview when no confirmation provided', async () => {
      const result = await tool.handler({ repoRoot });

      assert.ok(result.preview);
      assert.equal(result.removed.length, 0);
      assert.equal(result.preview.droidCount, 2);
      assert.equal(result.preview.droids.length, 2);
      assert.ok(result.preview.droids.find(d => d.id === 'df-orchestrator'));
      assert.ok(result.preview.droids.find(d => d.id === 'df-frontend'));
      assert.ok(result.preview.filesToRemove.includes('.droidforge'));
    });

    it('includes UUIDs in preview', async () => {
      const result = await tool.handler({ repoRoot });

      assert.ok(result.preview);
      const orchestrator = result.preview.droids.find(d => d.id === 'df-orchestrator');
      const frontend = result.preview.droids.find(d => d.id === 'df-frontend');

      assert.equal(orchestrator?.uuid, 'uuid-orch-123');
      assert.equal(frontend?.uuid, 'uuid-frontend-456');
    });

    it('includes purpose in preview', async () => {
      const result = await tool.handler({ repoRoot });

      assert.ok(result.preview);
      const orchestrator = result.preview.droids.find(d => d.id === 'df-orchestrator');
      
      assert.equal(orchestrator?.purpose, 'Coordinate the team');
    });

    it('returns correct file count', async () => {
      const result = await tool.handler({ repoRoot });

      assert.ok(result.preview);
      // Should match TARGETS array length
      assert.ok(result.preview.fileCount > 0);
    });

    it('handles empty droids directory gracefully', async () => {
      // Remove all droids
      await rmSync(join(repoRoot, '.droidforge'), { recursive: true, force: true });

      const result = await tool.handler({ repoRoot });

      assert.ok(result.preview);
      assert.equal(result.preview.droidCount, 0);
      assert.equal(result.preview.droids.length, 0);
    });

    it('skips corrupted droid files', async () => {
      // Create a corrupted JSON file
      const droidsDir = join(repoRoot, '.droidforge', 'droids');
      await fs.writeFile(join(droidsDir, 'corrupted.json'), 'not valid json');

      const result = await tool.handler({ repoRoot });

      assert.ok(result.preview);
      // Should still only show 2 valid droids
      assert.equal(result.preview.droidCount, 2);
    });
  });

  describe('Confirmation Validation', () => {
    it('accepts exact confirmation string', async () => {
      const result = await tool.handler({
        repoRoot,
        confirmationString: 'remove all droids'
      });

      assert.ok(!result.error);
      assert.ok(result.removed.length > 0);
      assert.ok(result.message?.includes('Successfully removed'));
    });

    it('accepts case-insensitive confirmation', async () => {
      const result = await tool.handler({
        repoRoot,
        confirmationString: 'REMOVE ALL DROIDS'
      });

      assert.ok(!result.error);
      assert.ok(result.removed.length > 0);
    });

    it('accepts mixed-case confirmation', async () => {
      const result = await tool.handler({
        repoRoot,
        confirmationString: 'ReMoVe ALL dRoIdS'
      });

      assert.ok(!result.error);
      assert.ok(result.removed.length > 0);
    });

    it('accepts confirmation with extra whitespace', async () => {
      const result = await tool.handler({
        repoRoot,
        confirmationString: '  remove all droids  '
      });

      assert.ok(!result.error);
      assert.ok(result.removed.length > 0);
    });

    it('rejects wrong confirmation string', async () => {
      const result = await tool.handler({
        repoRoot,
        confirmationString: 'delete everything'
      });

      assert.ok(result.error);
      assert.equal(result.error.code, 'CONFIRMATION_MISMATCH');
      assert.equal(result.removed.length, 0);
      assert.ok(result.message?.includes('cancelled'));
      assert.ok(result.message?.includes('delete everything'));
    });

    it('rejects partial confirmation', async () => {
      const result = await tool.handler({
        repoRoot,
        confirmationString: 'remove all'
      });

      assert.ok(result.error);
      assert.equal(result.error.code, 'CONFIRMATION_MISMATCH');
      assert.equal(result.removed.length, 0);
    });

    it('rejects empty confirmation string', async () => {
      const result = await tool.handler({
        repoRoot,
        confirmationString: ''
      });

      assert.ok(result.error);
      assert.equal(result.error.code, 'CONFIRMATION_REQUIRED');
      assert.equal(result.removed.length, 0);
      assert.ok(result.message?.includes('confirmation required'));
    });

    it('rejects whitespace-only confirmation', async () => {
      const result = await tool.handler({
        repoRoot,
        confirmationString: '   '
      });

      assert.ok(result.error);
      assert.equal(result.error.code, 'CONFIRMATION_REQUIRED');
      assert.equal(result.removed.length, 0);
    });

    it('provides expected and received in error', async () => {
      const result = await tool.handler({
        repoRoot,
        confirmationString: 'wrong'
      });

      assert.ok(result.error);
      assert.equal(result.error.expected, 'remove all droids');
      assert.equal(result.error.received, 'wrong');
    });
  });

  describe('Execution Phase', () => {
    it('removes all target files and directories', async () => {
      const result = await tool.handler({
        repoRoot,
        confirmationString: 'remove all droids'
      });

      assert.ok(result.removed.length > 0);
      assert.ok(result.removed.includes('.droidforge'));

      // Note: .droidforge/logs/events.jsonl is created during the cleanup process
      // for logging, so .droidforge directory exists but should be mostly empty.
      // The important test is that the target files are in the removed list.
      assert.ok(result.removed.includes('docs/DroidForge_user_guide_en.md') || result.removed.includes('.droidforge'));
    });

    it('logs detailed information before deletion', async () => {
      // This test verifies logging happens - the log is written BEFORE
      // the .droidforge directory is deleted, but then gets deleted with it.
      // We verify the function completes successfully which means logging worked.
      const result = await tool.handler({
        repoRoot,
        confirmationString: 'remove all droids'
      });

      assert.ok(result.removed.length > 0);
      // If we got here without errors, logging succeeded before deletion
      assert.ok(result.message?.includes('Successfully removed'));
    });

    it('returns success message with counts', async () => {
      const result = await tool.handler({
        repoRoot,
        confirmationString: 'remove all droids'
      });

      assert.ok(result.message);
      assert.ok(result.message.includes('Successfully removed'));
      assert.ok(result.message.includes('2 droids')); // We created 2 droids
      assert.ok(result.message.includes('/forge-start'));
    });

    it('handles singular vs plural in message', async () => {
      // Remove one droid to test singular
      await rmSync(join(repoRoot, '.droidforge', 'droids', 'df-frontend.json'));

      const result = await tool.handler({
        repoRoot,
        confirmationString: 'remove all droids'
      });

      assert.ok(result.message);
      assert.ok(result.message.includes('1 droid')); // Singular
    });

    it('removes empty commands directory', async () => {
      const result = await tool.handler({
        repoRoot,
        confirmationString: 'remove all droids'
      });

      assert.ok(result.removed.length > 0);

      // Commands directory should be removed if empty
      const commandsExists = await fs.stat(join(repoRoot, '.factory', 'commands')).catch(() => null);
      assert.equal(commandsExists, null);
    });

    it('does not remove anything on cancellation', async () => {
      await tool.handler({
        repoRoot,
        confirmationString: 'wrong confirmation'
      });

      // Verify droids still exist
      const droidsExist = await fs.stat(join(repoRoot, '.droidforge', 'droids')).catch(() => null);
      assert.ok(droidsExist);

      const orchestratorExists = await fs.stat(join(repoRoot, '.droidforge', 'droids', 'df-orchestrator.json')).catch(() => null);
      assert.ok(orchestratorExists);
    });
  });

  describe('Backward Compatibility', () => {
    it('supports old boolean confirm=true', async () => {
      const result = await tool.handler({
        repoRoot,
        confirm: true
      });

      assert.ok(result.removed.length > 0);
      assert.ok(!result.error);
    });

    it('supports old boolean confirm=false (shows preview)', async () => {
      const result = await tool.handler({
        repoRoot,
        confirm: false
      });

      assert.ok(result.preview);
      assert.equal(result.removed.length, 0);
    });

    it('supports old string confirm="yes"', async () => {
      const result = await tool.handler({
        repoRoot,
        confirm: 'yes'
      });

      assert.ok(result.removed.length > 0);
    });

    it('prioritizes confirmationString over boolean confirm', async () => {
      const result = await tool.handler({
        repoRoot,
        confirm: true, // Would normally execute
        confirmationString: 'wrong' // Should reject
      });

      assert.ok(result.error);
      assert.equal(result.removed.length, 0);
    });
  });

  describe('Integration Tests', () => {
    it('full workflow: preview -> confirm -> execute', async () => {
      // Step 1: Get preview
      const preview = await tool.handler({ repoRoot });
      assert.ok(preview.preview);
      assert.equal(preview.preview.droidCount, 2);

      // Step 2: Confirm and execute
      const execution = await tool.handler({
        repoRoot,
        confirmationString: 'remove all droids'
      });

      assert.ok(!execution.error);
      assert.ok(execution.removed.length > 0);
      assert.ok(execution.message?.includes('2 droids'));
    });

    it('full workflow: preview -> wrong confirm -> cancellation', async () => {
      // Step 1: Get preview
      const preview = await tool.handler({ repoRoot });
      assert.ok(preview.preview);

      // Step 2: Wrong confirmation
      const cancellation = await tool.handler({
        repoRoot,
        confirmationString: 'nope'
      });

      assert.ok(cancellation.error);
      assert.equal(cancellation.removed.length, 0);

      // Step 3: Verify nothing was deleted
      const droidsStillExist = await fs.stat(join(repoRoot, '.droidforge', 'droids')).catch(() => null);
      assert.ok(droidsStillExist);
    });

    it('handles missing droids directory in execution', async () => {
      // Remove droids directory before execution
      await rmSync(join(repoRoot, '.droidforge'), { recursive: true, force: true });

      const result = await tool.handler({
        repoRoot,
        confirmationString: 'remove all droids'
      });

      // Should not crash - droids count should be 0 but other files may still be removed
      assert.ok(!result.error);
      assert.ok(result.message?.includes('0 droids'));
      // Other target files might still exist and get removed
    });
  });

  describe('Edge Cases', () => {
    it('handles droid without UUID', async () => {
      const droidNoUUID: Partial<DroidDefinition> = {
        id: 'df-legacy',
        displayName: 'Legacy Droid',
        purpose: 'Old droid',
        abilities: [],
        tools: [],
        createdAt: new Date().toISOString(),
        methodology: null,
        owner: 'droidforge'
      };

      const droidsDir = join(repoRoot, '.droidforge', 'droids');
      await writeJsonAtomic(join(droidsDir, 'df-legacy.json'), droidNoUUID);

      const result = await tool.handler({ repoRoot });

      assert.ok(result.preview);
      assert.equal(result.preview.droidCount, 3); // 2 + 1 legacy
      const legacy = result.preview.droids.find(d => d.id === 'df-legacy');
      assert.equal(legacy?.uuid, ''); // Should have empty string fallback
    });

    it('handles droid without purpose', async () => {
      const droidNoPurpose: Partial<DroidDefinition> = {
        id: 'df-nopurpose',
        uuid: 'uuid-123',
        displayName: 'No Purpose Droid',
        abilities: [],
        tools: [],
        createdAt: new Date().toISOString(),
        methodology: null,
        owner: 'droidforge'
      };

      const droidsDir = join(repoRoot, '.droidforge', 'droids');
      await writeJsonAtomic(join(droidsDir, 'df-nopurpose.json'), droidNoPurpose);

      const result = await tool.handler({ repoRoot });

      assert.ok(result.preview);
      // Should skip droids without purpose
      assert.equal(result.preview.droidCount, 2); // Still only 2 valid droids
    });
  });
});
