import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { ensureDir, writeFileAtomic } from './fs.js';

export const LOG_BASE_DIR = process.env.DROIDFORGE_LOG_DIR
  ? path.resolve(process.env.DROIDFORGE_LOG_DIR)
  : path.join(os.homedir(), '.factory', 'droidforge', 'logs');
const FLUSH_INTERVAL_MS = 200;

const buffers = new Map<string, LogRecord[]>();
const flushTimers = new Map<string, NodeJS.Timeout>();

function repoSlug(repoRoot: string): string {
  const normalized = repoRoot.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-+|-+$/g, '');
  return normalized.length > 0 ? normalized : 'root';
}

export function getLogFilePath(repoRoot: string): string {
  return path.join(LOG_BASE_DIR, `${repoSlug(repoRoot)}.events.jsonl`);
}

async function flushBuffer(repoRoot: string): Promise<void> {
  const buffer = buffers.get(repoRoot);
  if (!buffer || buffer.length === 0) {
    return;
  }

  buffers.set(repoRoot, []);

  const target = getLogFilePath(repoRoot);
  const dir = path.dirname(target);
  await ensureDir(dir);
  const lines = buffer.map(record => `${JSON.stringify(record)}\n`).join('');

  await fs.appendFile(target, lines, 'utf8').catch(async error => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await writeFileAtomic(target, lines, 'utf8');
      return;
    }
    throw error;
  });
}

export interface LogRecord {
  timestamp: string;
  event: string;
  status: 'ok' | 'error';
  payload?: Record<string, unknown>;
}

export async function appendLog(repoRoot: string, record: LogRecord): Promise<void> {
  const buffer = buffers.get(repoRoot);
  if (buffer) {
    buffer.push(record);
  } else {
    buffers.set(repoRoot, [record]);
  }

  if (flushTimers.has(repoRoot)) {
    return;
  }

  const timer = setTimeout(async () => {
    flushTimers.delete(repoRoot);
    try {
      await flushBuffer(repoRoot);
    } catch (error) {
      buffers.set(repoRoot, []);
      throw error;
    }
  }, FLUSH_INTERVAL_MS);

  flushTimers.set(repoRoot, timer);
}

export async function flushLogs(repoRoot: string): Promise<void> {
  const timer = flushTimers.get(repoRoot);
  if (timer) {
    clearTimeout(timer);
    flushTimers.delete(repoRoot);
  }
  await flushBuffer(repoRoot);
}

export async function readLogTail(repoRoot: string, limit: number): Promise<string[]> {
  const target = getLogFilePath(repoRoot);
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

export async function withToolTiming<T>(
  repoRoot: string,
  event: string,
  payload: Record<string, unknown>,
  run: () => Promise<T>
): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await run();
    await appendLog(repoRoot, {
      timestamp: new Date(startedAt).toISOString(),
      event,
      status: 'ok',
      payload: { ...payload, durationMs: Date.now() - startedAt }
    });
    return result;
  } catch (error) {
    await appendLog(repoRoot, {
      timestamp: new Date(startedAt).toISOString(),
      event,
      status: 'error',
      payload: {
        ...payload,
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : String(error)
      }
    });
    throw error;
  }
}
