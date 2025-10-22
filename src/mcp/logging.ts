import path from 'node:path';
import { promises as fs } from 'node:fs';
import { ensureDir, writeFileAtomic } from './fs.js';

const LOG_RELATIVE_PATH = '.droidforge/logs/events.jsonl';

export interface LogRecord {
  timestamp: string;
  event: string;
  status: 'ok' | 'error';
  payload?: Record<string, unknown>;
}

export async function appendLog(repoRoot: string, record: LogRecord): Promise<void> {
  const target = path.join(repoRoot, LOG_RELATIVE_PATH);
  const dir = path.dirname(target);
  await ensureDir(dir);
  const line = `${JSON.stringify(record)}\n`;
  await fs.appendFile(target, line, 'utf8').catch(async error => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await writeFileAtomic(target, line, 'utf8');
      return;
    }
    throw error;
  });
}

export async function readLogTail(repoRoot: string, limit: number): Promise<string[]> {
  const target = path.join(repoRoot, LOG_RELATIVE_PATH);
  try {
    const raw = await fs.readFile(target, 'utf8');
    const lines = raw.trim().split('\n').filter(Boolean);
    return lines.slice(-limit);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}
