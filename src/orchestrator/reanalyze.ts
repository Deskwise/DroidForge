import type { DroidPlan, ReanalysisReport, DroidChange, ExistingDroid } from '../types.js';
import matter from 'gray-matter';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { globby } from 'globby';
import { planDroids, DroidSpec } from './droidPlanner.js';
import { validateClaims } from './fileClaims.js';

function isUserModified(droid: ExistingDroid, fileMtime?: Date): boolean {
  // Check for custom markers in body first
  if (droid.body.includes('# USER MODIFIED')) {
    return true;
  }

  // Compare file mtime to lastReviewed timestamp
  if (droid.frontmatter.lastReviewed && fileMtime) {
    const reviewedDate = new Date(droid.frontmatter.lastReviewed);
    return fileMtime > reviewedDate;
  }

  return false;
}

async function readExistingDroids(cwd: string): Promise<ExistingDroid[]> {
  const droidFiles = await globby('.droidforge/droids/*.md', { cwd });
  const existingDroids: ExistingDroid[] = [];

  for (const file of droidFiles) {
    const filePath = join(cwd, file);
    const content = await readFile(filePath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);
    const fileStat = await stat(filePath);

    const droid: ExistingDroid = {
      name: frontmatter.name,
      filePath,
      frontmatter: {
        name: frontmatter.name,
        tools: frontmatter.tools || [],
        scope: frontmatter.scope || [],
        procedure: Array.isArray(frontmatter.procedure) ? frontmatter.procedure : [],
        proof: frontmatter.proof || [],
        outputSchema: frontmatter.outputSchema,
        lastReviewed: frontmatter.lastReviewed
      },
      body,
      userModified: false // Will set below
    };

    droid.userModified = isUserModified(droid, fileStat.mtime);
    existingDroids.push(droid);
  }

  return existingDroids;
}

function detectNewDroids(existingDroids: ExistingDroid[], newSpecs: DroidSpec[]): DroidChange[] {
  const existingNames = new Set(existingDroids.map(d => d.name));
  const changes: DroidChange[] = [];

  for (const spec of newSpecs) {
    if (!existingNames.has(spec.name)) {
      changes.push({
        type: 'add',
        droidName: spec.name,
        reason: 'New droid detected in scan',
        details: { spec },
        userModified: false
      });
    }
  }

  return changes;
}

function detectStaleDroids(existingDroids: ExistingDroid[], newSpecs: DroidSpec[], plan: DroidPlan): DroidChange[] {
  const newNames = new Set(newSpecs.map(s => s.name));
  const scriptPaths = new Set([
    ...plan.scripts.files,
    ...plan.scripts.npmScripts.map(s => s.path)
  ]);
  const changes: DroidChange[] = [];

  for (const droid of existingDroids) {
    let reason = '';
    let scriptPath: string | undefined;

    // Infer script droids by name prefix or scope comparison
    const isScriptDroid = droid.name.startsWith('npm-') || droid.name.startsWith('script-') ||
      (droid.frontmatter.scope.length === 1 && scriptPaths.has(droid.frontmatter.scope[0]));

    if (isScriptDroid) {
      // Get script path from scope (first element) or from name parsing
      scriptPath = droid.frontmatter.scope[0] ||
        (droid.name.startsWith('npm-') ? droid.name.substring(4) :
          droid.name.startsWith('script-') ? droid.name.substring(7) : undefined);

      if (scriptPath && !scriptPaths.has(scriptPath)) {
        reason = `Script ${scriptPath} no longer exists`;
      }
    }

    if (!reason && !newNames.has(droid.name)) {
      reason = 'Droid role no longer relevant based on current frameworks and mode';
    }

    if (reason) {
      changes.push({
        type: 'retire',
        droidName: droid.name,
        reason,
        details: { scriptPath },
        userModified: droid.userModified
      });
    }
  }

  return changes;
}

function detectOutdatedProof(existingDroids: ExistingDroid[], newSpecs: DroidSpec[]): DroidChange[] {
  const specMap = new Map(newSpecs.map(s => [s.name, s]));
  const changes: DroidChange[] = [];

  for (const droid of existingDroids) {
    const spec = specMap.get(droid.name);
    if (spec) {
      const existingProof = droid.frontmatter.proof.map(p => p.trim());
      const newProof = spec.proof.map(p => p.trim());
      if (JSON.stringify(existingProof) !== JSON.stringify(newProof)) {
        changes.push({
          type: 'refresh-proof',
          droidName: droid.name,
          reason: 'Proof commands have changed',
          details: { oldProof: existingProof, newProof },
          userModified: droid.userModified
        });
      }
    }
  }

  return changes;
}

function detectToolOverreach(existingDroids: ExistingDroid[], newSpecs: DroidSpec[]): DroidChange[] {
  const specMap = new Map(newSpecs.map(s => [s.name, s]));
  const changes: DroidChange[] = [];

  for (const droid of existingDroids) {
    const spec = specMap.get(droid.name);
    if (spec) {
      const existingTools = new Set(droid.frontmatter.tools);
      const newTools = new Set(spec.tools);
      const extraTools = [...existingTools].filter(t => !newTools.has(t));
      if (extraTools.length > 0) {
        changes.push({
          type: 'narrow-tools',
          droidName: droid.name,
          reason: 'Droid has more tools than currently needed',
          details: { extraTools, oldTools: droid.frontmatter.tools, newTools: spec.tools },
          userModified: droid.userModified
        });
      }
    }
  }

  return changes;
}

async function detectScopeOverlaps(existingDroids: ExistingDroid[], newSpecs: DroidSpec[], cwd: string, conflicts: any[] = []): Promise<DroidChange[]> {
  const changes: DroidChange[] = [];

  for (const conflict of conflicts) {
    changes.push({
      type: 'merge',
      droidName: `${conflict.droid1}-${conflict.droid2}`,
      reason: `Scope overlap detected: ${conflict.pattern}`,
      details: { droid1: conflict.droid1, droid2: conflict.droid2, pattern: conflict.pattern },
      userModified: false // Merges are not user-modified by default
    });
  }

  return changes;
}

export async function analyzeChanges(plan: DroidPlan): Promise<ReanalysisReport> {
  const cwd = process.cwd();
  const existingDroids = await readExistingDroids(cwd);
  const newSpecs = planDroids(plan);

  // Validate claims once and reuse conflicts
  const claims = existingDroids.map(d => ({
    droidName: d.name,
    patterns: d.frontmatter.scope
  }));
  const { conflicts } = await validateClaims(claims, cwd);

  const changes: DroidChange[] = [
    ...detectNewDroids(existingDroids, newSpecs),
    ...detectStaleDroids(existingDroids, newSpecs, plan),
    ...detectOutdatedProof(existingDroids, newSpecs),
    ...detectToolOverreach(existingDroids, newSpecs),
    ...await detectScopeOverlaps(existingDroids, newSpecs, cwd, conflicts)
  ];

  return {
    timestamp: new Date().toISOString(),
    changes,
    existingDroids,
    newSpecs,
    conflicts
  };
}