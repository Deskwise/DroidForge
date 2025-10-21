import { Command } from 'commander';
import kleur from 'kleur';
import { installGlobalOrchestrator } from './orchestrator/installGlobalOrchestrator.js';
import { scanRepo } from './detectors/repoSignals.js';
import { scanScripts } from './detectors/scripts.js';
import { synthesizeDroids } from './orchestrator/synthesizeDroids.js';
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
    .description('Generate Factory droids from PRD/README and scripts (interactive only)')
    .version('0.1.0');

  program.command('init')
    .description('Install global orchestrator and bootstrap project docs')
    .action(async () => {
      await installGlobalOrchestrator();
      await writeAgentsMd({ bootstrap: true });
      await writeDroidGuide({ bootstrap: true });
      await writeManifest({ dryRun: false });
      console.log('✅ Initialized: global orchestrator + project docs + manifest');
    });

  program.command('scan')
    .description('Analyze PRD/README and discover scripts')
    .action(async () => {
      const signals = await scanRepo(process.cwd());
      const scripts = await scanScripts(process.cwd());
      console.log(JSON.stringify({ signals, scripts }, null, 2));
    });

  program.command('synthesize')
    .description('Create/refresh .factory/droids/* based on repo signals + scripts (use --dry-run to preview)')
    .option('--dry-run', 'Preview changes without writing files')
    .action(async (options) => {
      const dryRun = !!options.dryRun;
      
      try {
        await conductInterview();
        console.log('✅ Project brief created/updated');
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
          dryRun
        };

        await synthesizeDroids(synthesisOpts);
      } catch (e) {
        console.error('Synthesis failed:', (e as Error).message);
        return;
      }

      if (!dryRun) {
        await writeAgentsMd({});
        await writeDroidGuide({ frameworks: signals.frameworks });
        await writeManifest({ dryRun: false });
        console.log('✅ Droids synthesized, docs and manifest updated');
      } else {
        console.log(kleur.yellow('[DRY-RUN] Would update AGENTS.md and docs/droid-guide.md'));
        console.log(kleur.yellow('[DRY-RUN] Would generate .factory/droids-manifest.json'));
        console.log(kleur.gray('Run without --dry-run to apply changes'));
      }
    });

  program.command('add-script')
    .argument('<path>', 'Path to script like scripts/build.sh')
    .description('Wrap a single script into a droid (use --dry-run to preview)')
    .option('--dry-run', 'Preview changes without writing files')
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
        console.log(`✅ Script wrapped as droid: ${scriptPath}`);
      } else {
        console.log(kleur.yellow(`[DRY-RUN] Would wrap script: ${scriptPath}`));
        console.log(kleur.yellow('[DRY-RUN] Would update AGENTS.md and docs/droid-guide.md'));
        console.log(kleur.yellow('[DRY-RUN] Would generate .factory/droids-manifest.json'));
        console.log(kleur.gray('Run without --dry-run to apply changes'));
      }
    });

  program.command('reanalyze')
    .description('Rescan repo and compare with existing droids to propose updates (new/retired/refreshed/narrowed)')
    .option('--dry-run', 'Preview changes without writing files')
    .action(async (options) => {
      const dryRun = !!options.dryRun;
      
      try {
        await conductInterview();
        console.log('✅ Project brief updated (reanalyze will use latest intent)');
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
        console.log('✅ Reanalysis complete. Review proposals in AGENTS.md and docs/droid-guide.md');
      } else {
        console.log(kleur.yellow('[DRY-RUN] Would update AGENTS.md and docs/droid-guide.md'));
        console.log(kleur.yellow('[DRY-RUN] Would generate .factory/droids-manifest.json'));
        console.log(kleur.gray('Run without --dry-run to apply changes'));
      }
    });

  program.parse(process.argv);
}
