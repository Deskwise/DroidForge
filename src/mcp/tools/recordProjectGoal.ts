import { appendLog } from '../logging.js';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { SessionStore } from '../sessionStore.js';
import type { RecordProjectGoalInput, RecordProjectGoalOutput, ToolDefinition, OnboardingSession } from '../types.js';

interface Deps {
  sessionStore: SessionStore;
}

export function createRecordProjectGoalTool(deps: Deps): ToolDefinition<RecordProjectGoalInput, RecordProjectGoalOutput> {
  return {
    name: 'record_project_goal',
    description: 'Persist the user\'s goal description gathered during onboarding. ONLY call this after collecting the project vision through the onboarding flow, never before.',
    handler: async input => {
      const { repoRoot, sessionId } = input;
      // Sanitize description for common terminal paste artifacts (bracketed paste, ANSI)
      const raw = (input.description ?? '').toString();
      const sanitized = raw
        // Strip bracketed paste enable/disable and paste markers
        .replace(new RegExp('\\u001b\\[\\?2004[hl]', 'g'), '')
        .replace(new RegExp('\\u001b\\[200~|\\u001b\\[201~', 'g'), '')
        // Strip generic ANSI CSI sequences
        .replace(new RegExp('\\u001b\\[[0-9;]*[A-Za-z]', 'g'), '')
        // Normalize newlines and trim stray carriage returns
        .replace(/\r/g, '')
        .trim();

      let description = sanitized;

      // Environment fallbacks: allow non-interactive usage
      if (!description) {
        const envVision = process.env.DROIDFORGE_VISION?.trim();
        if (envVision) {
          description = envVision;
        }
      }
      if (!description && process.env.DROIDFORGE_VISION_FILE) {
        try {
          const p = process.env.DROIDFORGE_VISION_FILE;
          if (p) {
            const data = await fs.readFile(p, 'utf8');
            description = data.replace(new RegExp('\\u001b\\[[0-9;]*[A-Za-z]', 'g'), '').replace(/\r/g, '').trim();
          }
        } catch {
          // ignore file errors; we'll fall back to empty string
        }
      }

      // Optional editor flow: if user typed ':edit', open $EDITOR
      if (description === ':edit') {
        const tmp = path.join(os.tmpdir(), `droidforge-vision-${Date.now()}.md`);
        await fs.writeFile(tmp, '# Describe your project vision below\n', 'utf8');
        const editor = process.env.VISUAL || process.env.EDITOR || 'nano';
        try {
          const { spawnSync } = await import('node:child_process');
          spawnSync(editor, [tmp], { stdio: 'inherit' });
          const data = await fs.readFile(tmp, 'utf8');
          description = data.replace(new RegExp('\\u001b\\[[0-?]*[ -/]*[@-~]', 'g'), '').replace(/\r/g, '').trim();
        } catch {
          // if editor fails, keep description empty to trigger normal validation below
          description = '';
        }
      }
      
      // Require a non-empty project vision before proceeding
      if (!description || description.trim().length === 0) {
        throw new Error('Project vision is required. Please ask the user to describe what they are building first, then call this tool with their description. Do not call this tool with an empty description.');
      }

      // Try to load by sessionId first (if provided), otherwise load the active session
      let session: OnboardingSession | null = null;
      if (sessionId) {
        session = await deps.sessionStore.load(repoRoot, sessionId);
      } else {
        session = await deps.sessionStore.loadActive(repoRoot);
      }
      
      if (!session) {
        throw new Error('No active onboarding session found. Please run /forge-start first.');
      }
      session.description = description;
      (session as unknown as { projectVision?: string }).projectVision = description; // Flat field for backward compatibility with validation
      
      // Ensure onboarding object exists
      if (!session.onboarding) {
        session.onboarding = {
          requiredData: {},
          collectionMetadata: {},
          methodology: {},
          team: {}
        };
      }
      
      session.onboarding.projectVision = description; // Nested field
      session.state = 'collecting-goal';
      await deps.sessionStore.saveSnapshot(session);
      await appendLog(repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'record_project_goal',
        status: 'ok',
        payload: { sessionId: session.sessionId }
      });
      return { ack: true } as const;
    }
  };
}
