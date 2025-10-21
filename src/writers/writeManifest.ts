import fs from 'node:fs/promises';
import path from 'node:path';
import { mkdirp } from 'mkdirp';
import kleur from 'kleur';
import { globby } from 'globby';
import matter from 'gray-matter';

interface DroidMetadata {
  name: string;
  type: 'generic' | 'script' | 'contextual';
  role: string;
  description: string;
  tools: string[];
  scope: string[];
  procedure: string[];
  proof: string;
  outputSchema?: any;
  lastReviewed?: string;
}

interface DroidManifest {
  version: number;
  timestamp: string;
  droids: DroidMetadata[];
  summary: {
    total: number;
    byType: {
      generic: number;
      script: number;
      contextual: number;
    };
    byTools: {
      Read: number;
      Write: number;
      Shell: number;
      Edit: number;
    };
  };
}

async function readDroidMetadata(cwd: string): Promise<DroidMetadata[]> {
  try {
    const droidFiles = await globby('.factory/droids/*.md', { cwd });
    const droids: DroidMetadata[] = [];

    for (const filePath of droidFiles) {
      try {
        const content = await fs.readFile(path.join(cwd, filePath), 'utf8');
        const { data: frontmatter } = matter(content);

        if (frontmatter.name) {
          const type = inferDroidType(frontmatter.name);

          droids.push({
            name: frontmatter.name,
            type,
            role: frontmatter.role || '',
            description: frontmatter.description || '',
            tools: frontmatter.tools || [],
            scope: frontmatter.scope || [],
            procedure: frontmatter.procedure || [],
            proof: frontmatter.proof || '',
            outputSchema: frontmatter.outputSchema,
            lastReviewed: frontmatter.lastReviewed
          });
        }
      } catch (err) {
        console.warn(kleur.yellow(`Warning: Could not parse ${filePath}: ${err}`));
      }
    }

    return droids;
  } catch (err) {
    return [];
  }
}

function inferDroidType(name: string): 'generic' | 'script' | 'contextual' {
  if (name.startsWith('script-') || name.startsWith('npm-')) {
    return 'script';
  }
  if (['planner', 'dev', 'reviewer', 'qa', 'auditor'].includes(name)) {
    return 'generic';
  }
  return 'contextual';
}

function generateSummary(droids: DroidMetadata[]) {
  const summary = {
    total: droids.length,
    byType: {
      generic: 0,
      script: 0,
      contextual: 0
    },
    byTools: {
      Read: 0,
      Write: 0,
      Shell: 0,
      Edit: 0
    }
  };

  for (const droid of droids) {
    // Count by type
    summary.byType[droid.type]++;

    // Count tools
    for (const tool of droid.tools) {
      if (tool in summary.byTools) {
        summary.byTools[tool as keyof typeof summary.byTools]++;
      }
    }
  }

  return summary;
}

export async function writeManifest(opts: { dryRun?: boolean } = {}) {
  const { dryRun = false } = opts;

  const cwd = process.cwd();
  const dest = path.join(cwd, '.factory/droids-manifest.json');
  const droids = await readDroidMetadata(cwd);
  const summary = generateSummary(droids);

  const manifest: DroidManifest = {
    version: 1,
    timestamp: new Date().toISOString(),
    droids,
    summary
  };

  const content = JSON.stringify(manifest, null, 2);

  if (dryRun) {
    console.log(kleur.yellow('[DRY-RUN] Would write .factory/droids-manifest.json'));
    console.log(kleur.gray('Preview:'));
    console.log(kleur.gray(content.slice(0, 400) + (content.length > 400 ? '...' : '')));
    return;
  }

  await mkdirp(path.dirname(dest));
  await fs.writeFile(dest, content + '\n', 'utf8');
}