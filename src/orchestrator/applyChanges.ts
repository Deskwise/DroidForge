import fs from 'node:fs/promises';
import path from 'node:path';
import { mkdirp } from 'mkdirp';
import mustache from 'mustache';
import matter from 'gray-matter';
import kleur from 'kleur';
import { createPatch } from 'diff';
import type { ReanalysisReport, AutonomyLevel } from '../types.js';
import type { DroidSpec } from './droidPlanner';
import { confirmOperation } from '../utils/confirmations.js';
import { previewFileWrite } from '../utils/diffPreview.js';

export async function applyChanges(
  report: ReanalysisReport,
  newSpecs: DroidSpec[],
  autonomy: AutonomyLevel,
  dryRun: boolean
): Promise<{ applied: number; skipped: number }> {
  const cwd = process.cwd();
  let applied = 0;
  let skipped = 0;

  for (const change of report.changes) {
    const { type, droidName, reason, details, userModified } = change;
    console.log(kleur.cyan(`Processing ${type} change for ${droidName}: ${reason}`));
    if (userModified) {
      console.log(kleur.yellow(`   Warning: ${droidName} has been user-modified`));
    }

    switch (type) {
    case 'add': {
      const spec = newSpecs.find(s => s.name === droidName);
      if (!spec) {
        console.error(`Spec not found for ${droidName}`);
        skipped++;
        continue;
      }
      let templateName: string;
      switch (spec.type) {
      case 'generic':
        templateName = 'droid.generic.md.hbs';
        break;
      case 'script':
        templateName = 'droid.script.md.hbs';
        break;
      case 'contextual':
        templateName = 'droid.contextual.md.hbs';
        break;
      default:
        templateName = 'droid.generic.md.hbs';
      }
      const tplPath = new URL(`../../templates/${templateName}`, import.meta.url);
      const tpl = await fs.readFile(tplPath, 'utf8');
      const context = { ...spec, lastReviewed: spec.lastReviewed || new Date().toISOString() };
      const body = mustache.render(tpl, context);
      const filePath = path.join(cwd, '.droidforge', 'droids', `${spec.name}.md`);
      await previewFileWrite(filePath, body);
      const approved = await confirmOperation({
        autonomy,
        operation: 'write droid file',
        details: spec.name,
        dryRun
      });
      if (approved && !dryRun) {
        await fs.writeFile(filePath, body, 'utf8');
        applied++;
      } else {
        skipped++;
      }
      break;
    }
    case 'retire': {
      const existing = report.existingDroids.find(d => d.name === droidName);
      if (!existing) {
        skipped++;
        continue;
      }
      const approved = await confirmOperation({
        autonomy,
        operation: 'retire droid',
        details: droidName,
        dryRun
      });
      if (approved) {
        const retiredDir = path.join(path.dirname(existing.filePath), 'retired');
        await mkdirp(retiredDir);
        const retiredPath = path.join(retiredDir, path.basename(existing.filePath));
        if (!dryRun) {
          await fs.rename(existing.filePath, retiredPath);
        }
        applied++;
      } else {
        skipped++;
      }
      break;
    }
    case 'refresh-proof': {
      const existing = report.existingDroids.find(d => d.name === droidName);
      if (!existing) {
        skipped++;
        continue;
      }
      const newProof = details.newProof || [];
      const updatedContent = await updateDroidFrontmatter(existing.filePath, { proof: newProof }, userModified);
      await previewFileWrite(existing.filePath, updatedContent);
      const approved = await confirmOperation({
        autonomy,
        operation: 'refresh proof',
        details: droidName,
        dryRun
      });
      if (approved && !dryRun) {
        await fs.writeFile(existing.filePath, updatedContent, 'utf8');
        applied++;
      } else {
        skipped++;
      }
      break;
    }
    case 'narrow-tools': {
      const existing = report.existingDroids.find(d => d.name === droidName);
      if (!existing) {
        skipped++;
        continue;
      }
      const newTools = details.newTools || [];
      const updatedContent = await updateDroidFrontmatter(existing.filePath, { tools: newTools }, userModified);
      await previewFileWrite(existing.filePath, updatedContent);
      const approved = await confirmOperation({
        autonomy,
        operation: 'narrow tools',
        details: droidName,
        dryRun
      });
      if (approved && !dryRun) {
        await fs.writeFile(existing.filePath, updatedContent, 'utf8');
        applied++;
      } else {
        skipped++;
      }
      break;
    }
    case 'merge': {
      const droid1 = report.existingDroids.find(d => d.name === details.droid1);
      const droid2 = report.existingDroids.find(d => d.name === details.droid2);
      if (!droid1 || !droid2) {
        console.error(`Could not find both droids for merge: ${details.droid1}, ${details.droid2}`);
        skipped++;
        continue;
      }
      console.log(kleur.cyan(`Merging droid 1: ${droid1.name}`));
      console.log(droid1.frontmatter);
      console.log(kleur.cyan(`Merging droid 2: ${droid2.name}`));
      console.log(droid2.frontmatter);

      // Create merged spec inline
      const mergedScope = [...new Set([...droid1.frontmatter.scope, ...droid2.frontmatter.scope])];
      const mergedProcedure = Array.isArray(droid1.frontmatter.procedure)
        ? [...new Set([...droid1.frontmatter.procedure, ...(droid2.frontmatter.procedure || [])])]
        : [droid1.frontmatter.procedure, ...(droid2.frontmatter.procedure || [])].filter(Boolean);
      const mergedProof = [...new Set([...droid1.frontmatter.proof, ...droid2.frontmatter.proof])];

      // Determine tightest tools (intersection for safety)
      const tightestTools = droid1.frontmatter.tools.length < droid2.frontmatter.tools.length
        ? droid1.frontmatter.tools
        : droid2.frontmatter.tools;

      const mergedName = `merge-${details.droid1}-${details.droid2}`;
      const mergedSpec = {
        name: mergedName,
        type: 'contextual' as const,
        description: `Merged droid combining ${details.droid1} and ${details.droid2}`,
        tools: tightestTools,
        scope: mergedScope,
        procedure: mergedProcedure,
        proof: mergedProof,
        outputSchema: droid1.frontmatter.outputSchema || droid2.frontmatter.outputSchema,
        lastReviewed: new Date().toISOString()
      };

      console.log(kleur.yellow('Generated merged droid spec:'));
      console.log({ name: mergedSpec.name, scope: mergedSpec.scope, procedure: mergedSpec.procedure, tools: mergedSpec.tools });

      const approved = await confirmOperation({
        autonomy,
        operation: 'merge droids',
        details: `${details.droid1} + ${details.droid2}  ${mergedName}`,
        dryRun
      });

      if (approved) {
        // Render merged droid using contextual template by default
        const templateName = 'droid.contextual.md.hbs';
        const tplPath = new URL(`../../templates/${templateName}`, import.meta.url);
        const tpl = await fs.readFile(tplPath, 'utf8');
        const context = { ...mergedSpec, lastReviewed: mergedSpec.lastReviewed };
        const body = mustache.render(tpl, context);
        const filePath = path.join(cwd, '.droidforge', 'droids', `${mergedSpec.name}.md`);
        await previewFileWrite(filePath, body);
        if (!dryRun) {
          await fs.writeFile(filePath, body, 'utf8');
        }
        // Retire old droids
        const retiredDir = path.join(cwd, '.droidforge', 'droids', 'retired');
        await mkdirp(retiredDir);
        if (!dryRun) {
          await fs.rename(droid1.filePath, path.join(retiredDir, path.basename(droid1.filePath)));
          await fs.rename(droid2.filePath, path.join(retiredDir, path.basename(droid2.filePath)));
        }
        applied += 3; // New + 2 retired
        console.log(kleur.green(`✓ Created merged droid: ${mergedName}`));
        console.log(kleur.gray(`  Retired: ${details.droid1}, ${details.droid2}`));
      } else {
        skipped++;
      }
      break;
    }
    default:
      console.error(`Unknown change type: ${type}`);
      skipped++;
    }
  }
  return { applied, skipped };
}

async function createBackup(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf8');
  const backupsDir = path.join(path.dirname(filePath), 'backups');
  await mkdirp(backupsDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupsDir, `${path.basename(filePath, '.md')}.${timestamp}.md`);
  await fs.writeFile(backupPath, content, 'utf8');
  return backupPath;
}

async function updateDroidFrontmatter(
  filePath: string,
  updates: Partial<{ tools: string[]; proof: string[]; scope: string[] }>,
  userModified: boolean = false
): Promise<string> {
  const content = await fs.readFile(filePath, 'utf8');
  const parsed = matter(content);
  const originalFrontmatter = { ...parsed.data };

  // Create backup if user modified
  if (userModified) {
    const backupPath = await createBackup(filePath);
    console.log(kleur.gray(`  Created backup: ${path.relative(process.cwd(), backupPath)}`));
  }

  // Check for conflicts in targeted fields
  const conflicts: string[] = [];
  for (const [key, newValue] of Object.entries(updates)) {
    if (key in originalFrontmatter) {
      const existingValue = originalFrontmatter[key];
      const proposedValue = newValue;

      // Compare arrays properly
      const existingStr = Array.isArray(existingValue) ? existingValue.sort().join(',') : String(existingValue);
      const proposedStr = Array.isArray(proposedValue) ? proposedValue.sort().join(',') : String(proposedValue);

      if (existingStr !== proposedStr) {
        conflicts.push(`${key}: [${existingStr}]  [${proposedStr}]`);
      }
    }
  }

  // If user modified and conflicts exist, require explicit confirmation and show diff
  if (userModified && conflicts.length > 0) {
    console.log(kleur.yellow(`   Potential conflicts detected for ${path.basename(filePath)}:`));
    conflicts.forEach(conflict => console.log(kleur.red(`    ${conflict}`)));

    const unifiedDiff = createPatch(
      filePath,
      content,
      matter.stringify(parsed.content, { ...originalFrontmatter, ...updates, lastReviewed: new Date().toISOString() }),
      'original',
      'updated'
    );

    console.log(kleur.cyan('  Unified diff:'));
    console.log(unifiedDiff.split('\n').map(line =>
      line.startsWith('+') ? kleur.green(line) :
        line.startsWith('-') ? kleur.red(line) :
          line.startsWith(' ') ? kleur.gray(line) :
            line
    ).join('\n'));

    const confirmed = await confirmOperation({
      autonomy: 'L1', // Force confirmation for conflicts
      operation: `apply conflicting updates to ${path.basename(filePath)}`,
      details: `${conflicts.length} field(s) changed`,
      dryRun: false
    });

    if (!confirmed) {
      console.log(kleur.yellow(`  Skipped updates to ${path.basename(filePath)} due to conflicts`));
      return content; // Return original content
    }
  }

  // Apply updates to targeted fields only, preserving other frontmatter
  const updatedFrontmatter = { ...originalFrontmatter };
  Object.assign(updatedFrontmatter, updates);
  updatedFrontmatter.lastReviewed = new Date().toISOString();

  return matter.stringify(parsed.content, updatedFrontmatter);
}