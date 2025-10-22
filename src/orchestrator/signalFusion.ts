import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import type { ProjectBrief, DroidPlan, PRDContent } from '../types.js';

async function fileExists(p: string) {
  try { await fs.stat(p); return true; } catch { return false; }
}

export async function fuseSignals(
  signals: { frameworks: string[]; prdPaths: string[]; testConfigs: string[]; prdContent: PRDContent | null },
  scripts: { files: string[]; npmScripts: Array<{name: string; command: string; path: string}> }
): Promise<DroidPlan> {
  const cwd = process.cwd();
  const briefPath = path.join(cwd, '.droidforge', 'project-brief.yaml');
  if (!(await fileExists(briefPath))) {
    throw new Error('Missing .droidforge/project-brief.yaml. Run the interview first to create a project brief.');
  }

  const raw = await fs.readFile(briefPath, 'utf8');
  const parsed = yaml.load(raw) as ProjectBrief;

  // Validate essential fields
  if (!parsed || !parsed.mode || !parsed.persona || !parsed.autonomy || !parsed.intent) {
    throw new Error('Invalid project brief structure. Please re-run the interview to regenerate it.');
  }

  // Merge signals into brief snapshot
  parsed.signals = parsed.signals || { frameworks: [], scripts: [], prdPaths: [] };
  parsed.signals.frameworks = Array.from(new Set([...(parsed.signals.frameworks || []), ...(signals.frameworks || [])]));
  parsed.signals.prdPaths = Array.from(new Set([...(parsed.signals.prdPaths || []), ...(signals.prdPaths || [])]));
  // Persist scripts observed during this run onto the brief snapshot (include npm scripts)
  const allScriptPaths = [...(scripts.files || []), ...(scripts.npmScripts || []).map(s => s.path)];
  parsed.signals.scripts = Array.from(new Set(allScriptPaths));

  // Persist merged brief back to disk
  const serialized = yaml.dump(parsed, { noRefs: true, lineWidth: 120 });
  await fs.writeFile(briefPath, serialized, 'utf8');
  // scripts list is not computed here; preserved for potential future use

  const plan: DroidPlan = {
    brief: parsed,
    signals: {
      frameworks: signals.frameworks || [],
      prdPaths: signals.prdPaths || [],
      testConfigs: signals.testConfigs || [],
    },
    prdContent: signals.prdContent || null,
    scripts,
  };

  return plan;
}
