import path from 'node:path';
import { writeFileAtomic, readJsonIfExists, ensureDir } from '../fs.js';
import { appendLog } from '../logging.js';
import type { SessionStore } from '../sessionStore.js';
import type {
  GenerateUserGuideInput,
  GenerateUserGuideOutput,
  ToolDefinition
} from '../types.js';
import type { DroidManifest } from '../../types.js';

const DEFAULT_GUIDE_PATH = 'docs/DroidForge_user_guide_en.md';

interface Deps {
  sessionStore: SessionStore;
}

function renderRosterTable(manifest: DroidManifest): string {
  const rows = manifest.droids.concat(manifest.customDroids);
  if (rows.length === 0) {
    return '| Droid | Role | Status |\n|-------|------|--------|\n| None | - | - |';
  }
  const lines = rows.map(entry => `| ${entry.id} | ${entry.role} | ${entry.status} |`);
  return ['| Droid | Role | Status |', '|-------|------|--------|', ...lines].join('\n');
}

function buildGuide(markdownContext: {
  projectSummary: string;
  rosterTable: string;
  primaryCommand: string;
  quickActions: string[];
  examples: string[];
  maintenanceTips: string[];
}): string {
  const { projectSummary, rosterTable, primaryCommand, quickActions, examples, maintenanceTips } = markdownContext;
  return [
    '──────────────────────────────────────────────',
    'DROIDFORGE USER GUIDE',
    '──────────────────────────────────────────────',
    '',
    projectSummary,
    '',
    '## Daily Moves',
    ...quickActions.map(action => `• ${action}`),
    '',
    '## Talk to your team',
    'Use `/forge-task <description>` for routing advice, then invoke the specialist directly.',
    '',
    '## Roster',
    rosterTable,
    '',
    '## Example Requests',
    ...examples.map(example => `• ${example}`),
    '',
    '## Maintenance',
    ...maintenanceTips.map(tip => `• ${tip}`),
    '',
    '──────────────────────────────────────────────',
    ''
  ].join('\n');
}

export function createGenerateUserGuideTool(deps: Deps): ToolDefinition<GenerateUserGuideInput, GenerateUserGuideOutput> {
  return {
    name: 'generate_user_guide',
    description: 'Render and save the DroidForge user guide.',
    handler: async input => {
      const manifestPath = path.join(input.repoRoot, '.droidforge', 'droids-manifest.json');
      const manifest = await readJsonIfExists<DroidManifest>(manifestPath);
      if (!manifest) {
        throw new Error('Droid manifest missing; forge the roster first.');
      }
      const savePath = input.savePath ?? DEFAULT_GUIDE_PATH;
      const rosterTable = renderRosterTable(manifest);
      const summary = manifest.methodology
        ? `Your droids follow a **${manifest.methodology}** workflow.`
        : 'Your droids follow a tailored workflow.';
      const markdown = buildGuide({
        projectSummary: summary,
        rosterTable,
        primaryCommand: manifest.primaryCommand,
        quickActions: [
          'Type `/forge-task <task>` to get routing advice on which specialist to use.',
          'Invoke specialists directly: `/df-frontend`, `/df-backend`, `/df-auth`, etc.',
          'Read this guide anytime: docs/DroidForge_user_guide_en.md',
          'Use `/forge-removeall` to clean up if you no longer need the team.'
        ],
        examples: [
          '/forge-task Add user authentication → routes you to /df-auth',
          '/df-frontend Create a responsive navigation menu',
          '/df-backend Implement REST API for user management',
          '/df-database Design schema for multi-tenant app'
        ],
        maintenanceTips: [
          'Run `/forge-add-droid` to introduce new specialists.',
          'Use `/forge-restore` to rollback to earlier snapshots.',
          'Check `/forge-logs` for recent activity.'
        ]
      });

      const absPath = path.join(input.repoRoot, savePath);
      await ensureDir(path.dirname(absPath));
      await writeFileAtomic(absPath, markdown, 'utf8');

      await appendLog(input.repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'generate_user_guide',
        status: 'ok',
        payload: { path: savePath }
      });

      return { markdown, savePath };
    }
  };
}
