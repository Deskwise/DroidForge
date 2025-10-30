import { createOnboardingScript } from '../src/mcp/prompts/onboarding.js';
import { PromptRunner } from '../src/mcp/prompts/runner.js';
import type { ToolInvocation } from '../src/mcp/types.js';

const responses: Record<string, string> = {
  'project-vision': 'Building a scheduling assistant for community clinics so staff can coordinate on one dashboard.',
  'vision-risks': 'Keeping PHI safe while still moving quickly.',
  'vision-platforms': 'Start web-first, then deliver a secure tablet experience.',
  'vision-integrations': 'Need to sync with our legacy EMR to keep data aligned.',
  'vision-success': 'Clinic managers say onboarding volunteers is finally painless.',
  'vision-confirm': 'Looks good.',
  'core-target': 'Clinic admins and volunteer coordinators.',
  'core-timeline': 'Pilot launch in 8 weeks for the grant review.',
  'core-quality': 'Quality first—we cannot risk bad scheduling data.',
  'core-team': 'Three of us: I own backend, a designer, and a part-time devops friend.',
  'core-experience': 'Experienced full-stack dev, but first time handling healthcare compliance.',
  'methodology-choice': 'tdd',
  'delivery-budget': 'Grant-backed budget, so spend smart but quality wins.',
  'delivery-deployment': 'HIPAA-ready AWS setup with blue/green deploys.',
  'delivery-security': 'HIPAA compliance with audit trails.',
  'delivery-scale': 'Start with 15 clinics, aim for 200 over the year.',
  'final-adjustments': 'Forge the team.',
  'custom-droids': ''
};

function getResponse(id: string): string {
  if (responses[id]) {
    return responses[id];
  }
  // default for random follow-up ids
  if (id.startsWith('vision-')) {
    return 'Sounds good—captured in the main description.';
  }
  return '';
}

const script = createOnboardingScript('uat-session', process.cwd());
const runner = new PromptRunner(script, async <TInput, TOutput>(invocation: ToolInvocation<TInput>): Promise<TOutput> => {
  const name = invocation.name;
  switch (name) {
  case 'smart_scan':
    return {
      sessionId: 'uat-session',
      summary: 'Mock scan summary',
      signals: ['typescript', 'react'],
      primaryLanguage: 'typescript',
      hints: [],
      prdFiles: []
    } as TOutput;
  case 'record_project_goal':
    return { ack: true } as TOutput;
  case 'record_onboarding_data': {
    const keys = Object.keys(invocation.input ?? {}).filter(key => key !== 'repoRoot' && key !== 'sessionId');
    return { saved: keys } as TOutput;
  }
  case 'get_onboarding_progress':
    return {
      collected: {},
      missing: [],
      collectedCount: 10,
      complete: true
    } as TOutput;
  case 'select_methodology':
    return { methodology: 'tdd' } as TOutput;
  case 'recommend_droids':
    return {
      suggestions: [
        { id: 'df-frontend', label: 'df-frontend', summary: 'Crafts patient-facing flows with accessibility baked in.', default: true },
        { id: 'df-backend', label: 'df-backend', summary: 'Designs resilient APIs for scheduling logic.', default: true }
      ],
      mandatory: {
        id: 'df-orchestrator',
        summary: 'Routes tasks, tracks progress, and remains the primary user contact.'
      },
      introText: "Here\'s your specialist roster:\n• df-frontend: I\'m here for the scheduling assistant. I polish interfaces and keep flows compliant. Ping me with /df-frontend.\n• df-backend: I\'m here for the scheduling logic. I guard reliability and integrations. Ping me with /df-backend.",
      coverageRecap: 'Experienced dev with compliance needs—this pair covers UI polish and robust services.'
    } as TOutput;
  case 'forge_roster':
    return {
      bootLog: ['[BOOT] df-frontend online.', '[BOOT] df-backend online.'],
      outputPaths: ['droids/df-frontend.md', 'droids/df-backend.md'],
      manifestPath: 'droids/manifest.json',
      manifest: {}
    } as TOutput;
  case 'generate_user_guide':
    return { markdown: '# Guide', savePath: 'docs/DroidForge_user_guide_en.md' } as TOutput;
  case 'install_commands':
    return { installed: ['df', 'df-frontend', 'df-backend'] } as TOutput;
  default:
    return {} as TOutput;
  }
});

async function run(): Promise<void> {
  for (;;) {
    const event = await runner.next();
    if (event.type === 'complete') {
      break;
    }
    if (event.type === 'say') {
      console.log(`[assistant] ${event.segment.text}`);
    } else if (event.type === 'summary') {
      console.log(`[summary] ${event.segment.title}`);
      event.segment.lines.forEach(line => console.log(`  - ${line}`));
    } else if (event.type === 'input') {
      const answer = getResponse(event.segment.id);
      console.log(`[user -> ${event.segment.id}] ${answer}`);
      runner.submitInput(event.segment.id, answer);
    } else if (event.type === 'choice') {
      // No choice segments in the scripted flow, but handle gracefully.
      const answer = getResponse(event.segment.id);
      console.log(`[user -> ${event.segment.id}] ${answer}`);
      runner.submitChoice(event.segment.id, answer);
    }
  }
}

run().catch(err => {
  console.error('UAT harness failed:', err);
  process.exitCode = 1;
});

