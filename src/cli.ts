import { Command } from 'commander';
import kleur from 'kleur';
import { installGlobalOrchestrator } from './orchestrator/installGlobalOrchestrator.js';
import { scanRepo } from './detectors/repoSignals.js';
import { scanRepoOptimized } from './detectors/repoSignalsOptimized.js';
import { scanScripts } from './detectors/scripts.js';
import { synthesizeDroids } from './orchestrator/synthesizeDroids.js';
import { resolveConflicts, generateConflictReport } from './detectors/conflictResolver.js';
import { conductInterview } from './interview/conductInterview.js';
import { fuseSignals } from './orchestrator/signalFusion.js';
import type { DroidPlan, SynthesisOptions } from './types.js';
import { writeAgentsMd } from './writers/writeAgentsMd.js';
import { writeDroidGuide } from './writers/writeDroidGuide.js';
import { writeManifest } from './writers/writeManifest.js';

export function runCli() {
  const program = new Command();
  program
    .name('droidforge')
    .description(' DroidForge - Transform your repo into a Factory droid army')
    .version('0.1.0')
    .option('-v, --verbose', 'Enable detailed logging');

  // Global examples
  program.on('--help', () => {
    console.log(`
${kleur.bold(' Quick Start:')}
  $ droidforge init          # Bootstrap project (run once)
  $ droidforge synthesize     # Generate droids interactively
  $ droidforge scan           # See what DroidForge detects

${kleur.bold(' Common Workflows:')}
  $ droidforge synthesize --dry-run    # Preview changes without writing
  $ droidforge add-script build.sh      # Wrap a script as droid
  $ droidforge reanalyze --dry-run      # Check for updates needed

${kleur.bold(' Learn More:')}
  ${kleur.cyan('https://github.com/your-org/droidforge#readme')}
    `);
  });

  program.command('init')
    .description(' Initialize project - install orchestrator + create starter docs')
    .option('--force', 'Overwrite existing global orchestrator')
    .action(async (options) => {
      await installGlobalOrchestrator();
      await writeAgentsMd({ bootstrap: true });
      await writeDroidGuide({ bootstrap: true });
      await writeManifest({ dryRun: false });
      console.log(' Initialized: global orchestrator + project docs + manifest');
    });

  program.command('scan')
    .description(' Analyze repository - detect frameworks, scripts, and PRD content')
    .action(async () => {
      const signals = await scanRepo(process.cwd());
      const scripts = await scanScripts(process.cwd());
      console.log(JSON.stringify({ signals, scripts }, null, 2));
    });

  program.command('synthesize')
    .description(' Generate droids - interview  scan  create Factory droids')
    .option('--dry-run', ' Preview changes without writing files')
    .option('--force', 'Skip interview confirmation prompts')
    .option('--optimized', ' Use optimized scanning (faster for large repos)')
    .action(async (options) => {
      const dryRun = !!options.dryRun;
      const useOptimized = !!options.optimized;

      try {
        await conductInterview();
        console.log(' Project brief created/updated');
      } catch (e) {
        console.error('Interview failed:', (e as Error).message);
        return;
      }

      if (dryRun) {
        console.log(kleur.yellow('[DRY-RUN MODE] No files will be written'));
      }

      let signals: any;
      let scripts: any;
      let plan: DroidPlan;

      try {
        console.log(kleur.cyan(useOptimized ? ' Using optimized scanning...' : ' Scanning repository...'));
        signals = useOptimized ?
          await scanRepoOptimized(process.cwd()) :
          await scanRepo(process.cwd());

        console.log(kleur.cyan('📜 Discovering scripts...'));
        scripts = await scanScripts(process.cwd());

        console.log(kleur.cyan('🧠 Fusing signals with project intent...'));
        plan = await fuseSignals(signals, scripts);

        // Check for conflicts and provide recommendations
        if (plan.brief.signals && signals.frameworks.length > 0) {
          const { validateClaims } = await import('./orchestrator/fileClaims.js');
          const mockClaims = [
            { droidName: 'temp-droid', patterns: signals.testConfigs },
            { droidName: 'temp-droid-2', patterns: signals.prdPaths }
          ];
          const validationResult = await validateClaims(mockClaims);

          if (!validationResult.valid && validationResult.conflicts.length > 0) {
            console.log(kleur.yellow('\n  Scope validation warnings:'));
            validationResult.conflicts.forEach(conflict => {
              console.log(`  ${conflict.droid1} and ${conflict.droid2} conflict: ${conflict.pattern}`);
            });
          }
        }

        const synthesisOpts: SynthesisOptions = {
          signals,
          scripts,
          plan,
          dryRun
        };

        console.log(kleur.cyan(' Generating droids...'));
        await synthesizeDroids(synthesisOpts);
        console.log(kleur.green(' Droid synthesis complete!'));
      } catch (e) {
        console.error(kleur.red(' Synthesis failed:'), (e as Error).message);
        return;
      }

      if (!dryRun) {
        console.log(kleur.cyan(' Updating documentation...'));
        await writeAgentsMd({});
        await writeDroidGuide({ frameworks: signals.frameworks });
        await writeManifest({ dryRun: false });
        console.log(kleur.green(' Success! Droids created and documentation updated'));
        console.log(kleur.gray(` Next: Run 'factory droids list' to see your new droid army`));
      } else {
        console.log(kleur.yellow(' [DRY-RUN] Would update AGENTS.md and docs/droid-guide.md'));
        console.log(kleur.yellow(' [DRY-RUN] Would generate .factory/droids-manifest.json'));
        console.log(kleur.gray(' Run without --dry-run to apply changes'));
      }
    });

  program.command('add-script')
    .argument('<path>', 'Path to script (e.g., scripts/build.sh, package.json script)')
    .description(' Wrap script as droid - add least-privilege tool + verification')
    .option('--dry-run', ' Preview changes without writing files')
    .action(async (scriptPath, options) => {
      const dryRun = !!options.dryRun;
      
      if (dryRun) {
        console.log(kleur.yellow('[DRY-RUN MODE] No files will be written'));
      }
      
      // For single script mode, we need a minimal plan
      let signals: any;
      let scripts: any;
      let plan: DroidPlan;

      signals = await scanRepo(process.cwd());
      scripts = await scanScripts(process.cwd());
      plan = await fuseSignals(signals, scripts);

      const synthesisOpts: SynthesisOptions = {
        addSingleScript: scriptPath,
        plan,
        dryRun
      };

      await synthesizeDroids(synthesisOpts);

      if (!dryRun) {
        await writeAgentsMd({});
        await writeDroidGuide({ frameworks: signals.frameworks });
        await writeManifest({ dryRun: false });
        console.log(` Script wrapped as droid: ${scriptPath}`);
      } else {
        console.log(kleur.yellow(`[DRY-RUN] Would wrap script: ${scriptPath}`));
        console.log(kleur.yellow('[DRY-RUN] Would update AGENTS.md and docs/droid-guide.md'));
        console.log(kleur.yellow('[DRY-RUN] Would generate .factory/droids-manifest.json'));
        console.log(kleur.gray('Run without --dry-run to apply changes'));
      }
    });

  program.command('reanalyze')
    .description(' Update existing droids - detect changes + propose updates')
    .option('--dry-run', ' Preview updates without writing files')
    .action(async (options) => {
      const dryRun = !!options.dryRun;
      
      try {
        await conductInterview();
        console.log(' Project brief updated (reanalyze will use latest intent)');
      } catch (e) {
        console.error('Interview failed:', (e as Error).message);
        return;
      }
      
      if (dryRun) {
        console.log(kleur.yellow('[DRY-RUN MODE] No files will be written'));
      }

      let signals: any;
      let scripts: any;
      let plan: DroidPlan;

      try {
        signals = await scanRepo(process.cwd());
        scripts = await scanScripts(process.cwd());
        plan = await fuseSignals(signals, scripts);

        const synthesisOpts: SynthesisOptions = {
          signals,
          scripts,
          plan,
          mode: 'reanalyze',
          dryRun
        };

        console.log(kleur.cyan('Analyzing changes since last synthesis...'));
        await synthesizeDroids(synthesisOpts);
      } catch (e) {
        console.error('Reanalysis failed:', (e as Error).message);
        return;
      }

      if (!dryRun) {
        await writeAgentsMd({});
        await writeDroidGuide({ frameworks: signals.frameworks });
        await writeManifest({ dryRun: false });
        console.log(' Reanalysis complete. Review proposals in AGENTS.md and docs/droid-guide.md');
      } else {
        console.log(kleur.yellow('[DRY-RUN] Would update AGENTS.md and docs/droid-guide.md'));
        console.log(kleur.yellow('[DRY-RUN] Would generate .factory/droids-manifest.json'));
        console.log(kleur.gray('Run without --dry-run to apply changes'));
      }
    });

  program.parse(process.argv);
}
