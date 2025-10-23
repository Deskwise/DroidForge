import { mkdirp } from 'mkdirp';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { OnboardingSession } from './types.js';

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
    const payload = JSON.stringify(session, null, 2);
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
}
