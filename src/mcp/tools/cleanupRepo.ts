import path from 'node:path';
import { promises as fs } from 'node:fs';
import { removeIfExists, readJsonIfExists } from '../fs.js';
import { appendLog } from '../logging.js';
import type { CleanupRepoInput, CleanupRepoOutput, ToolDefinition } from '../types.js';
import type { DroidDefinition } from '../../types.js';

const TARGETS = [
  '.droidforge',
  'docs/DroidForge_user_guide_en.md',
  'docs/DROIDS.md',
  '.factory/commands/forge-start.md',
  '.factory/commands/forge-resume.md',

  '.factory/commands/forge-add-droid.md',
  '.factory/commands/forge-removeall.md',
  '.factory/commands/forge-restore.md',
  '.factory/commands/forge-logs.md',
  '.factory/commands/forge-help.md',
  '.factory/commands/df'
];

async function scanDroidsForPreview(repoRoot: string): Promise<Array<{ id: string; uuid: string; displayName: string; purpose: string }>> {
  const droidsDir = path.join(repoRoot, '.droidforge', 'droids');
  let files: string[] = [];
  try {
    files = await fs.readdir(droidsDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
    // If directory doesn't exist, return empty array
    return [];
  }
  const jsonFiles = files.filter(file => file.endsWith('.json'));
  const droids: Array<{ id: string; uuid: string; displayName: string; purpose: string }> = [];

  // Read files in parallel for better performance. readJsonIfExists
  // returns null for missing or corrupted JSON, so filter those out.
  const readPromises = jsonFiles.map(async (file) => {
    const filePath = path.join(droidsDir, file);
    return await readJsonIfExists<DroidDefinition>(filePath);
  });

  const results = await Promise.all(readPromises);
  for (const data of results) {
    if (data && data.id && data.displayName && data.purpose) {
      droids.push({
        id: data.id,
        uuid: data.uuid || '',
        displayName: data.displayName,
        purpose: data.purpose
      });
    }
    // Skip corrupted or incomplete files gracefully
  }

  return droids;
}

function toBoolean(value: string | boolean | undefined, truthyValues: string[]): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return truthyValues.includes(value.toLowerCase());
  }
  return false;
}

function validateConfirmation(input: string | undefined, expected: string): {
  valid: boolean;
  error?: {
    code: 'CONFIRMATION_REQUIRED' | 'CONFIRMATION_MISMATCH';
    message: string;
    expected: string;
    received: string;
  }
} {
  if (!input || input.trim() === '') {
    return {
      valid: false,
      error: {
        code: 'CONFIRMATION_REQUIRED',
        message: 'Confirmation string is required to proceed with deletion',
        expected,
        received: input || ''
      }
    };
  }

  const normalizedInput = input.trim().toLowerCase();
  const normalizedExpected = expected.trim().toLowerCase();

  if (normalizedInput !== normalizedExpected) {
    return {
      valid: false,
      error: {
        code: 'CONFIRMATION_MISMATCH',
        message: `Confirmation string does not match. Expected: "${expected}"`,
        expected,
        received: input
      }
    };
  }

  return { valid: true };
}

export function createCleanupRepoTool(): ToolDefinition<CleanupRepoInput, CleanupRepoOutput> {
  return {
    name: 'cleanup_repo',
    description: 'Remove all DroidForge data from the repository, optionally keeping the guide.',
    handler: async input => {
      // Tier 1 - Explicit Confirmation String (highest priority)
      if (input.confirmationString !== undefined) {
        const validationResult = validateConfirmation(input.confirmationString, 'remove all droids');
        if (!validationResult.valid) {
          // Generate user-friendly cancellation message
          const cancelMessage = validationResult.error?.code === 'CONFIRMATION_REQUIRED'
            ? '❌ Deletion cancelled: confirmation required. No files were removed.'
            : `❌ Deletion cancelled: confirmation string does not match. Expected "remove all droids" but received "${validationResult.error?.received}". No files were removed.`;
          
          return {
            removed: [],
            error: validationResult.error,
            message: cancelMessage
          };
        }
        // Confirmation string is valid, proceed to deletion (skip boolean check and preview)
      } else {
        // Tier 2 - Boolean Confirmation (backward compatibility)
        const confirmed = toBoolean(input.confirm, ['yes', 'y', '1', 'true']);
        if (!confirmed) {
          // Tier 3 - Preview Mode (no confirmation)
          const droids = await scanDroidsForPreview(input.repoRoot);
          const filesToRemove = TARGETS.slice(); // Complete list of paths that would be removed
          const droidCount = droids.length;
          const fileCount = filesToRemove.length;
          return {
            removed: [],
            preview: {
              droids,
              filesToRemove,
              droidCount,
              fileCount
            }
          };
        }
        // Boolean confirmation is true, proceed to deletion
      }

      // Scan droids before deletion to capture their UUIDs for logging
      const droidsBeforeDeletion = await scanDroidsForPreview(input.repoRoot);
      const droidUUIDs = droidsBeforeDeletion.map(d => d.uuid).filter(uuid => uuid !== '');
      const droidCount = droidsBeforeDeletion.length;

      const keepGuide = toBoolean(input.keepGuide, ['keep', 'yes', 'y', 'true']);

      const removed: string[] = [];
      for (const rel of TARGETS) {
        if (keepGuide && rel === 'docs/DroidForge_user_guide_en.md') {
          continue;
        }
        const abs = path.join(input.repoRoot, rel);
        const wasRemoved = await removeIfExists(abs);
        if (wasRemoved) {
          removed.push(rel);
        }
      }

      // If commands directory becomes empty, clean it up
      const commandsDir = path.join(input.repoRoot, '.factory', 'commands');
      try {
        const remaining = await fs.readdir(commandsDir);
        if (remaining.length === 0) {
          await fs.rmdir(commandsDir);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }

      // Enhanced logging with detailed information
      await appendLog(input.repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'cleanup_repo',
        status: 'ok',
        payload: {
          droidCount,
          droidUUIDs,
          filesRemoved: removed,
          fileCount: removed.length,
          keptGuide: keepGuide
        }
      });

      // Generate success message with counts and restoration instructions
      const droidText = droidCount === 1 ? 'droid' : 'droids';
      const fileText = removed.length === 1 ? 'file' : 'files';
      const successMessage = `✅ Successfully removed ${droidCount} ${droidText} and ${removed.length} ${fileText}. To set up DroidForge again, run /forge-start.`;

      return {
        removed,
        message: successMessage
      };
    }
  };
}
