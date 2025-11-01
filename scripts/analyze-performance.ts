#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

interface LogEntry {
  timestamp: string;
  event: string;
  status: 'ok' | 'error';
  payload?: {
    tool?: string;
    durationMs?: number;
    message?: string;
  };
}

interface ToolStats {
  tool: string;
  calls: number;
  errors: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
}

async function readLogFiles(targetPath: string): Promise<string[]> {
  const stats = await fs.stat(targetPath);
  if (stats.isDirectory()) {
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    const files = entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.jsonl'))
      .map(entry => path.join(targetPath, entry.name));
    const contents = await Promise.all(files.map(file => fs.readFile(file, 'utf8')));
    return contents.flatMap(content => content.trim().split('\n').filter(Boolean));
  }
  const content = await fs.readFile(targetPath, 'utf8');
  return content.trim().split('\n').filter(Boolean);
}

async function analyzePerformance(logPath: string): Promise<void> {
  const lines = await readLogFiles(logPath);
  
  const toolStats = new Map<string, {
    calls: number;
    errors: number;
    durations: number[];
  }>();
  
  for (const line of lines) {
    try {
      const entry: LogEntry = JSON.parse(line);
      
      if (entry.event.startsWith('tool:')) {
        const tool = entry.payload?.tool || entry.event.replace('tool:', '');
        
        if (!toolStats.has(tool)) {
          toolStats.set(tool, { calls: 0, errors: 0, durations: [] });
        }
        
        const stats = toolStats.get(tool)!;
        stats.calls++;
        
        if (entry.status === 'error') {
          stats.errors++;
        }
        
        if (entry.payload?.durationMs !== undefined) {
          stats.durations.push(entry.payload.durationMs);
        }
      }
    } catch {
      // Skip malformed lines
    }
  }
  
  // Calculate and display stats
  console.log('\n=== DroidForge Performance Report ===\n');
  console.log('Tool                          Calls  Errors  Avg(ms)  Min(ms)  Max(ms)');
  console.log('─'.repeat(75));
  
  const results: ToolStats[] = [];
  
  for (const [tool, data] of toolStats.entries()) {
    const durations = data.durations;
    const stats: ToolStats = {
      tool,
      calls: data.calls,
      errors: data.errors,
      totalMs: durations.reduce((a, b) => a + b, 0),
      avgMs: durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0,
      minMs: durations.length > 0 ? Math.min(...durations) : 0,
      maxMs: durations.length > 0 ? Math.max(...durations) : 0
    };
    results.push(stats);
  }
  
  // Sort by total time descending
  results.sort((a, b) => b.totalMs - a.totalMs);
  
  for (const stat of results) {
    const errorRate = stat.errors > 0 ? ` (${stat.errors} errors)` : '';
    console.log(
      `${stat.tool.padEnd(28)} ${String(stat.calls).padStart(5)}  ` +
      `${String(stat.errors).padStart(6)}  ${stat.avgMs.toFixed(1).padStart(7)}  ` +
      `${stat.minMs.toFixed(1).padStart(7)}  ${stat.maxMs.toFixed(1).padStart(7)}${errorRate}`
    );
  }
  
  console.log('\n');
}

const logPath = process.argv[2] || '.droidforge/logs/events.jsonl';
const defaultPath = logPath === '.droidforge/logs/events.jsonl'
  ? (() => {
      const baseDir = process.env.DROIDFORGE_LOG_DIR
        ? path.resolve(process.env.DROIDFORGE_LOG_DIR)
        : path.join(os.homedir(), '.factory', 'droidforge', 'logs');
      const repoSlug = process.cwd()
        .replace(/[^a-z0-9]+/gi, '-')
        .toLowerCase()
        .replace(/^-+|-+$/g, '') || 'root';
      return path.join(baseDir, `${repoSlug}.events.jsonl`);
    })()
  : logPath;

analyzePerformance(path.resolve(defaultPath)).catch(console.error);
