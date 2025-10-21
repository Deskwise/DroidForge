import fs from 'node:fs/promises';
import path from 'node:path';
import { mkdirp } from 'mkdirp';
import kleur from 'kleur';
import { readDroidMetadataWithType, type DroidMetadataWithType } from './shared/readDroidMetadata.js';

interface DroidManifest {
  version: number;
  timestamp: string;
  droids: DroidMetadataWithType[];
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
      unknown: number;
    };
  };
}

function generateSummary(droids: DroidMetadataWithType[]) {
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
      Edit: 0,
      unknown: 0
    }
  };

  for (const droid of droids) {
    // Count by type
    summary.byType[droid.type]++;

    // Count tools with normalization
    for (const tool of droid.tools) {
      const normalizedTool = tool.toLowerCase().trim();

      // Map to canonical tool names
      if (['read'].includes(normalizedTool)) {
        summary.byTools.Read++;
      } else if (['write', 'create', 'file'].includes(normalizedTool)) {
        summary.byTools.Write++;
      } else if (['shell', 'bash', 'terminal', 'cmd'].includes(normalizedTool)) {
        summary.byTools.Shell++;
      } else if (['edit', 'modify', 'update'].includes(normalizedTool)) {
        summary.byTools.Edit++;
      } else {
        summary.byTools.unknown++;
      }
    }
  }

  return summary;
}

export async function writeManifest(opts: { dryRun?: boolean } = {}) {
  const { dryRun = false } = opts;

  const cwd = process.cwd();
  const dest = path.join(cwd, '.factory/droids-manifest.json');
  const droids = await readDroidMetadataWithType(cwd);
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
  await fs.writeFile(dest, `${content  }\n`, 'utf8');
}