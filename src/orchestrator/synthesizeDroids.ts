import fs from 'node:fs/promises';
import path from 'node:path';
import { mkdirp } from 'mkdirp';
import mustache from 'mustache';
import kleur from 'kleur';
import type { SynthesisOptions, AutonomyLevel } from '../types.js';
import { planDroids, type DroidSpec } from './droidPlanner.js';
import { validateClaims, type FileClaim } from './fileClaims.js';
import { previewFileWrite } from '../utils/diffPreview.js';
import { confirmOperation, confirmToolWidening } from '../utils/confirmations.js';
import { analyzeChanges } from './reanalyze.js';
import { applyChanges } from './applyChanges.js';

/**
 * Synthesis metrics for summary reporting
 */
interface SynthesisMetrics {
  created: number;
  skipped: number;
  wideningsApproved: number;
  wideningsDenied: number;
}

export async function synthesizeDroids(opts: SynthesisOptions) {
  const cwd = process.cwd();
  const droidDir = path.join(cwd, '.factory', 'droids');
  await mkdirp(droidDir);
  
  // Extract autonomy and dry-run settings
  const autonomy = opts.plan.brief.autonomy;
  const dryRun = !!opts.dryRun;
  const toolWideningPref = opts.plan.brief.preferences.toolWidening;
  const dryPrefix = dryRun ? '[DRY-RUN] ' : '';
  
  // Initialize metrics
  const metrics: SynthesisMetrics = {
    created: 0,
    skipped: 0,
    wideningsApproved: 0,
    wideningsDenied: 0
  };
  
  if (dryRun) {
    console.log(kleur.yellow(`${dryPrefix}Preview mode - no files will be written`));
  }

  // Handle single script mode (legacy)
  if (opts.addSingleScript) {
    const scriptPath = opts.addSingleScript;
    let name: string;
    
    if (scriptPath.startsWith('npm:')) {
      const npmName = scriptPath.replace('npm:', '');
      name = `npm-${npmName}`;
    } else {
      const baseName = scriptPath
        .replace(/[^a-zA-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
      name = `script-${baseName}`;
    }
    
    const spec: DroidSpec = {
      name,
      type: 'script',
      role: 'script-executor',
      description: `Wraps and executes ${scriptPath} with verification`,
      tools: ['Read', 'Shell'],
      scope: [scriptPath],
      procedure: [
        `Execute ${scriptPath}`,
        'Verify exit code is 0',
        'Check expected artifacts exist',
        'Report status'
      ],
      proof: [`bash ${scriptPath}; ec=$?; echo "Exit code: $ec"; test $ec -eq 0 && echo PASS || echo FAIL`],
      outputSchema: 'Summary: <status>\nResults:\n- exitCode: <number>\n- artifacts: <list>\nNotes:\n- <follow-ups>',
      scriptPath
    };

    // L2 checkpoint: confirm before writing single script droid
    const singleScriptApproved = await confirmOperation({
      autonomy,
      operation: 'write droids',
      details: '1 file',
      dryRun
    });

    if (!singleScriptApproved) {
      console.log(kleur.yellow('✗ Single script droid synthesis cancelled by user'));
      return;
    }

    await writeDroidFromSpec(spec, droidDir, autonomy, dryRun, toolWideningPref, metrics);
    return;
  }

  // Handle reanalyze mode
  if (opts.mode === 'reanalyze') {
    console.log(kleur.cyan(`${dryPrefix}Analyzing changes since last synthesis...`));
    const report = await analyzeChanges(opts.plan);
    console.log(kleur.cyan(`Detected ${report.changes.length} change(s):`));
    for (const change of report.changes) {
      const color = change.userModified ? kleur.yellow : kleur.cyan;
      console.log(color(`  ${change.type}: ${change.droidName} - ${change.reason}`));
    }
    const specs = planDroids(opts.plan);
    const { applied, skipped } = await applyChanges(report, specs, autonomy, dryRun);
    console.log(kleur.green(`Applied ${applied} change(s), skipped ${skipped}.`));
    return;
  }

  // Main synthesis flow: plan droids based on DroidPlan
  console.log(kleur.cyan(`${dryPrefix}Planning droids based on project mode and signals...`));
  const specs = planDroids(opts.plan);
  
  // Extract and validate file claims
  const claims: FileClaim[] = specs.map(spec => ({
    droidName: spec.name,
    patterns: spec.scope
  }));
  
  const validation = await validateClaims(claims, cwd);
  if (!validation.valid) {
    console.log(kleur.yellow(' File claim conflicts detected:'));
    for (const conflict of validation.conflicts) {
      console.log(kleur.yellow(`  - ${conflict.droid1} vs ${conflict.droid2}: ${conflict.pattern}`));
    }
    console.log(kleur.yellow('  Continuing with synthesis (strict enforcement in future phase)...'));
  }
  
  // L2 checkpoint: confirm before writing any droids
  const approved = await confirmOperation({
    autonomy,
    operation: 'write droids',
    details: `${specs.length} file${specs.length === 1 ? '' : 's'}`,
    dryRun
  });
  
  if (!approved) {
    console.log(kleur.yellow('✗ Synthesis cancelled by user'));
    return;
  }
  
  // Write each droid from spec
  for (const spec of specs) {
    console.log(kleur.cyan(`${dryPrefix}Generating ${spec.name} droid...`));
    await writeDroidFromSpec(spec, droidDir, autonomy, dryRun, toolWideningPref, metrics);
  }
  
  // Print summary
  console.log('\n' + kleur.cyan('─'.repeat(60)));
  if (dryRun) {
    console.log(kleur.yellow('DRY-RUN SUMMARY:'));
    console.log(kleur.gray(`  Would create: ${metrics.created} droid${metrics.created === 1 ? '' : 's'}`));
    console.log(kleur.gray(`  Skipped: ${metrics.skipped} droid${metrics.skipped === 1 ? '' : 's'}`));
    console.log(kleur.gray(`  Tool widenings approved: ${metrics.wideningsApproved}`));
    console.log(kleur.gray(`  Tool widenings denied: ${metrics.wideningsDenied}`));
  } else {
    console.log(kleur.green(`✓ Created ${metrics.created} droid${metrics.created === 1 ? '' : 's'}`));
    if (metrics.skipped > 0) {
      console.log(kleur.yellow(`  Skipped: ${metrics.skipped} droid${metrics.skipped === 1 ? '' : 's'}`));
    }
    if (metrics.wideningsApproved > 0) {
      console.log(kleur.cyan(`  Tool widenings approved: ${metrics.wideningsApproved}`));
    }
    if (metrics.wideningsDenied > 0) {
      console.log(kleur.yellow(`  Tool widenings denied: ${metrics.wideningsDenied}`));
    }
  }
  console.log(kleur.cyan('─'.repeat(60)));
}

async function writeDroidFromSpec(
  spec: DroidSpec,
  dir: string,
  autonomy: AutonomyLevel,
  dryRun: boolean,
  toolWideningPref: string,
  metrics: SynthesisMetrics
) {
  // Tool widening logic: propose expanding tools if needed
  // Generic/contextual droids start with ['Read'], may need ['Read', 'Write']
  // Script droids start with ['Read', 'Shell'], may need ['Read', 'Shell', 'Write']
  
  const originalTools = [...spec.tools];
  let needsWidening = false;

  // Shell access confirmation for script droids
  if (spec.type === 'script' && originalTools.includes('Shell')) {
    const shellApproved = await confirmOperation({
      autonomy,
      operation: 'shell access',
      details: spec.name,
      dryRun
    });

    if (!shellApproved) {
      console.log(kleur.yellow(`  ✗ Skipped ${spec.name} droid (Shell access denied)`));
      metrics.skipped++;
      return;
    }
  }

  // Determine if we should propose widening to include Write
  if (spec.type === 'generic' || spec.type === 'contextual') {
    // Generic/contextual droids might need Write access
    if (!spec.tools.includes('Write')) {
      const shouldWiden = toolWideningPref === 'auto' && autonomy === 'L3';
      
      if (shouldWiden) {
        // Auto-approve for L3 with auto preference
        spec.tools.push('Write');
        metrics.wideningsApproved++;
        needsWidening = true;
      } else {
        // Prompt for widening
        const approved = await confirmToolWidening(
          originalTools,
          [...originalTools, 'Write'],
          spec.name,
          autonomy,
          dryRun
        );
        
        if (approved) {
          spec.tools.push('Write');
          metrics.wideningsApproved++;
          needsWidening = true;
        } else {
          metrics.wideningsDenied++;
        }
      }
    }
  } else if (spec.type === 'script') {
    // Script droids might need Write access in addition to Shell
    if (!spec.tools.includes('Write')) {
      const shouldWiden = toolWideningPref === 'auto' && autonomy === 'L3';
      
      if (shouldWiden) {
        // Auto-approve for L3 with auto preference
        spec.tools.push('Write');
        metrics.wideningsApproved++;
        needsWidening = true;
      } else {
        // Prompt for widening
        const approved = await confirmToolWidening(
          originalTools,
          [...originalTools, 'Write'],
          spec.name,
          autonomy,
          dryRun
        );
        
        if (approved) {
          spec.tools.push('Write');
          metrics.wideningsApproved++;
          needsWidening = true;
        } else {
          metrics.wideningsDenied++;
        }
      }
    }
  }
  
  if (needsWidening) {
    console.log(kleur.cyan(`  ↳ Tools widened: [${originalTools.join(', ')}]  [${spec.tools.join(', ')}]`));
  }
  
  // Select template based on spec type
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
  
  // Render template with spec data
  const body = mustache.render(tpl, { ...spec, lastReviewed: spec.lastReviewed || new Date().toISOString() });
  
  // Construct file path
  const filePath = path.join(dir, `${spec.name}.md`);
  
  // Show diff preview
  await previewFileWrite(filePath, body);
  
  // Confirm per-file write
  const writeApproved = await confirmOperation({
    autonomy,
    operation: 'write droid file',
    details: path.basename(filePath),
    dryRun
  });
  
  if (!writeApproved || dryRun) {
    const dryPrefix = dryRun ? '[DRY-RUN] ' : '';
    console.log(kleur.yellow(`  ${dryPrefix}Skipped: ${filePath}`));
    metrics.skipped++;
    return;
  }
  
  // Write to file
  await fs.writeFile(filePath, body, 'utf8');
  metrics.created++;
  console.log(kleur.green(`  ✓ Written: ${filePath}`));
}
