import path from 'node:path';
import { promises as fs } from 'node:fs';
import { mkdirp } from 'mkdirp';

export async function ensureDir(dir: string): Promise<void> {
  await mkdirp(dir);
}

export async function writeFileAtomic(target: string, contents: string, encoding: BufferEncoding = 'utf8'): Promise<void> {
  const dir = path.dirname(target);
  await ensureDir(dir);
  const tmp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(tmp, contents, { encoding });
  await fs.rename(tmp, target);
}

export async function writeJsonAtomic(target: string, value: unknown): Promise<void> {
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  await writeFileAtomic(target, payload, 'utf8');
}

export async function pathWithin(root: string, candidate: string): Promise<string> {
  const resolved = path.resolve(root, candidate);
  if (!resolved.startsWith(path.resolve(root))) {
    throw new Error(`Path escapes repository root: ${candidate}`);
  }
  return resolved;
}

export async function removeIfExists(target: string): Promise<boolean> {
  try {
    await fs.rm(target, { recursive: true, force: true });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

export async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    try {
      return JSON.parse(raw) as T;
    } catch (parseErr) {
      // Corrupted JSON: treat as if file does not exist for downstream code
      return null;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function copyRecursive(src: string, dest: string): Promise<void> {
  const dir = path.dirname(dest);
  await ensureDir(dir);
  await fs.cp(src, dest, { recursive: true });
}
