import { mkdirp } from 'mkdirp';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { OnboardingSession } from './types.js';
import { deepMerge } from './utils/deepMerge.js';

const SESSION_DIRNAME = '.droidforge/session';

async function ensureDir(dir: string) {
  await mkdirp(dir);
}

function sessionPath(repoRoot: string, sessionId: string): string {
  return path.join(repoRoot, SESSION_DIRNAME, `${sessionId}.json`);
}

export class SessionStore {
  async load(repoRoot: string, sessionId: string): Promise<OnboardingSession | null> {
    const target = sessionPath(repoRoot, sessionId);
    try {
      const raw = await fs.readFile(target, 'utf8');
      const data = JSON.parse(raw) as OnboardingSession;
      return data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async save(repoRoot: string, session: OnboardingSession): Promise<void> {
    const dir = path.join(repoRoot, SESSION_DIRNAME);
    await ensureDir(dir);
    const target = sessionPath(repoRoot, session.sessionId);

    // Load existing session to merge unknown fields we don't want to lose
    let existing: OnboardingSession | null = null;
    try {
      const raw = await fs.readFile(target, 'utf8');
      existing = JSON.parse(raw) as OnboardingSession;
    } catch {
      // File doesn't exist yet; proceed with new session
    }

    // Preserve any previously stored fields unless the new payload provides an explicit value.
    // Undefined entries should not clobber existing state (e.g., methodologyConfirmed flipping back to false/undefined).
    const sanitized = Object.fromEntries(
      Object.entries(session).filter(([, value]) => value !== undefined)
    ) as OnboardingSession;

    let merged: OnboardingSession;
    if (existing) {
      const base: OnboardingSession = { ...existing, ...sanitized };

      if (existing.onboarding && sanitized.onboarding) {
        base.onboarding = deepMerge(existing.onboarding, sanitized.onboarding);
      } else if (sanitized.onboarding) {
        base.onboarding = sanitized.onboarding;
      } else if (existing.onboarding) {
        base.onboarding = existing.onboarding;
      }

      merged = base;
    } else {
      merged = sanitized;
    }

    const payload = JSON.stringify(merged, null, 2);
    const tmp = `${target}.tmp`;
    await fs.writeFile(tmp, payload, 'utf8');
    await fs.rename(tmp, target);
  }

  async remove(repoRoot: string, sessionId: string): Promise<void> {
    const target = sessionPath(repoRoot, sessionId);
    try {
      await fs.unlink(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }
      throw error;
    }
  }

  /**
   * Find the most recent session for a repo (by creation timestamp).
   * This allows tools to work without explicitly passing sessionId.
   */
  async loadActive(repoRoot: string): Promise<OnboardingSession | null> {
    const dir = path.join(repoRoot, SESSION_DIRNAME);
    try {
      const files = await fs.readdir(dir);
      const sessionFiles = files.filter(f => f.endsWith('.json'));
      
      if (sessionFiles.length === 0) {
        return null;
      }

      // Load all sessions and find the most recent one
      const sessions = await Promise.all(
        sessionFiles.map(async file => {
          try {
            const raw = await fs.readFile(path.join(dir, file), 'utf8');
            return JSON.parse(raw) as OnboardingSession;
          } catch {
            return null;
          }
        })
      );

      const validSessions = sessions.filter((s): s is OnboardingSession => s !== null);
      if (validSessions.length === 0) {
        return null;
      }

      // Return the most recently created session
      return validSessions.reduce((latest, current) => {
        return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
}
