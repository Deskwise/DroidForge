import type { PromptScript, ResolvableText } from './types.js';

const VISION_EXAMPLES = [
  'a React dashboard that helps founders track investor pipeline updates',
  'an iOS wellness companion for my family with shared reminders',
  'a Typescript CLI that reorganises design system tokens overnight',
  'a Shopify theme refresh for our handmade jewellery store',
  'a Flask API powering compliance checklists for clinics',
  'a Unity mini-game to teach algebra with colourful feedback'
] as const;

const CONTEXT_GUESSES = [
  "Maybe you're orchestrating a web experience with a services layer in the background?",
  "Maybe this repo hides a mobile surface that needs a clean deployment story?",
  "Maybe you're stitching together workflows for a small but mighty founding team?",
  "Maybe there's a data pipeline brewing that will need dependable automation?",
  "Maybe you're preparing for an investor milestone that demands polish and proof?",
  "Maybe you're turning research notes into something teammates can actually use?"
] as const;

interface FollowUpPrompt {
  id: string;
  label: string;
  prompt: string;
  examples: readonly [string, string];
}

const FOLLOW_UP_PROMPTS: FollowUpPrompt[] = [
  {
    id: 'vision-risks',
    label: 'Risks or tricky pieces',
    prompt: 'What feels riskiest or most unknown? Call out anything that could stall progress.',
    examples: [
      'Keeping HIPAA data safe while still iterating quickly',
      'Nailing the feel of the gameplay loop before adding more content'
    ]
  },
  {
    id: 'vision-platforms',
    label: 'Primary platforms',
    prompt: 'Which platforms or channels matter most on day one?',
    examples: [
      'A polished mobile experience is non-negotiable',
      'Start web-first, then layer in a desktop installer later'
    ]
  },
  {
    id: 'vision-integrations',
    label: 'Integrations and dependencies',
    prompt: 'Any integrations or dependencies already on the table?',
    examples: [
      'Need to pull workouts from Apple Health',
      'Must sync issues from Jira into the dashboard'
    ]
  },
  {
    id: 'vision-success',
    label: 'Success signal',
    prompt: 'Paint the moment you know this project nailed it. What are people doing or saying?',
    examples: [
      'A beta clinic renews because the compliance dashboard made audits painless',
      'Players keep rematching because the AI feels fair but challenging'
    ]
  }
];

interface ChecklistItem {
  key: string;
  label: string;
}

const CORE_CHECKLIST: ChecklistItem[] = [
  { key: 'projectVision', label: 'Project vision' },
  { key: 'targetAudience', label: 'Target audience' },
  { key: 'timelineConstraints', label: 'Timeline or launch window' },
  { key: 'qualityVsSpeed', label: 'Quality vs speed stance' },
  { key: 'teamSize', label: 'Team size & roles' },
  { key: 'experienceLevel', label: 'Experience level' }
];

const DELIVERY_CHECKLIST: ChecklistItem[] = [
  { key: 'budgetConstraints', label: 'Budget & resourcing signals' },
  { key: 'deploymentRequirements', label: 'Deployment & hosting plan' },
  { key: 'securityRequirements', label: 'Security & compliance guardrails' },
  { key: 'scalabilityNeeds', label: 'Scalability or load expectations' }
];

function pickRandom<T>(pool: readonly T[], count: number): T[] {
  if (pool.length <= count) {
    return [...pool];
  }
  const copy = [...pool];
  const selection: T[] = [];
  while (selection.length < count && copy.length > 0) {
    const index = Math.floor(Math.random() * copy.length);
    selection.push(copy[index]);
    copy.splice(index, 1);
  }
  return selection;
}

function renderChecklist(items: ChecklistItem[], completed: string[]): string {
  return items
    .map(item => `${completed.includes(item.key) ? '☑︎' : '☐'} ${item.label}`)
    .join('\n');
}

const TOP_SIX_METHODS = `Top 6 for this kind of build:\n1) Agile / Scrum — short sprints to adapt as you learn.\n2) Test-Driven Development (TDD) — tests first to lock in quality.\n3) Behavior-Driven Development (BDD) — shared stories keep the vision aligned.\n4) Rapid Prototyping — quick loops to validate ideas without over-investing.\n5) DevOps / Platform — automation plus observability for frequent deploys.\n6) Kanban / Continuous Flow — visualise the work and keep throughput steady.`;

const literal = (text: string): ResolvableText => ({ literal: text });

export function createOnboardingScript(sessionId: string, repoRoot: string): PromptScript {
  const [visionExampleA, visionExampleB] = pickRandom(VISION_EXAMPLES, 2) as [string, string];
  const contextGuesses = pickRandom(CONTEXT_GUESSES, 3);
  const [followUpA, followUpB] = pickRandom(FOLLOW_UP_PROMPTS, 2) as [FollowUpPrompt, FollowUpPrompt];

  const segments: PromptScript['segments'] = [
    // Phase 1: Context hook and vision capture
    {
      kind: 'say',
      speaker: 'assistant',
      text: "Hi! I'm your DroidForge architect. I'll pair a specialist roster to your project, so let me scan the repo to see what you've already got in motion."
    },
    {
      kind: 'tool',
      name: 'smart_scan',
      input: { repoRoot: { literal: repoRoot } }
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: `Based on the SmartScan, here are a few things that jumped out: ${contextGuesses.map(line => `\n• ${line}`).join('')}`
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: `Tell me about your project. What are you building, who's it for, and what's the surrounding situation?\nExamples:\n- "${visionExampleA}"\n- "${visionExampleB}"`
    },
    {
      kind: 'input',
      id: 'project-vision',
      label: 'Project story, audience, and current situation',
      placeholder: 'Lay out the big picture in one message',
      required: true,
      emptyMessage: 'Please share your project vision before we continue.'
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: {
        concat: [
          literal("I see what you're building. Let me make sure I understand the core of what matters here.\n\n"),
          literal("Based on your vision: "),
          { fromInput: 'project-vision' },
          literal('\n\nThis tells me you\'re focused on '),
          { fromInput: 'project-vision' },
          literal('. Let me ask a couple of quick clarifiers to make sure we build the right team.')
        ]
      }
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: {
        concat: [
          literal("What\'s the most critical challenge or constraint that could make or break this project? "),
          literal("Think about timeline, budget, technical complexity, or team dynamics.")
        ]
      }
    },
    {
      kind: 'input',
      id: 'vision-challenge',
      label: 'Biggest challenge or constraint',
      placeholder: 'What keeps you up at night about this project?',
      required: true,
      emptyMessage: 'What feels riskiest or most unknown? Share the biggest challenge.'
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: {
        concat: [
          literal("And what does success look like for you specifically? "),
          literal("Is it about hitting a launch date, achieving certain metrics, learning something new, or something else?")
        ]
      }
    },
    {
      kind: 'input',
      id: 'vision-success',
      label: 'What success looks like',
      placeholder: 'How will you know this project succeeded?',
      required: true,
      emptyMessage: 'How will you know this project succeeded? Describe what success looks like.'
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: {
        concat: [
          literal("Let me make sure I\'ve got this right:\n\n"),
          literal("• Project: "),
          { fromInput: 'project-vision' },
          literal('\n• Critical challenge: '),
          { fromInput: 'vision-challenge' },
          literal('\n• Success definition: '),
          { fromInput: 'vision-success' },
          literal('\n\nDid I miss anything big about your vision or situation?')
        ]
      }
    },
    {
      kind: 'input',
      id: 'vision-confirm',
      label: 'Confirm or correct my understanding',
      placeholder: 'Looks good, or add anything I missed'
    },
    {
      kind: 'tool',
      name: 'record_project_goal',
      input: { repoRoot: { literal: repoRoot }, description: { fromInput: 'project-vision' } }
    },
    {
      kind: 'tool',
      name: 'record_onboarding_data',
      input: { repoRoot: { literal: repoRoot }, projectVision: { fromInput: 'project-vision' } }
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: {
        concat: [
          literal("Great! I've got a clear picture of what you're building. Now let's capture the key details that will help me recommend the perfect development approach.\n\n"),
          literal("I'll ask about your target audience, timeline, quality preferences, and team setup. These help me understand your constraints and priorities.")
        ]
      }
    },

    // Phase 2: Core six items with dynamic checklist
    {
      kind: 'say',
      speaker: 'assistant',
      text: `Great. Let me grab the core discovery items so methodology guidance is on point.\nChecklist:\n${renderChecklist(CORE_CHECKLIST, ['projectVision'])}`
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: "Who's going to use this day to day? Give me the audience in their own words."
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: 'Examples:\n- "Solo founders validating a fintech concept"\n- "Nurses in rural clinics tracking inventory"'
    },
    {
      kind: 'input',
      id: 'core-target',
      label: 'Target audience',
      placeholder: 'Describe the people or teams this is for',
      required: true,
      emptyMessage: 'Who is this for? Please describe the target audience.'
    },
    {
      kind: 'tool',
      name: 'record_onboarding_data',
      input: { repoRoot: { literal: repoRoot }, targetAudience: { fromInput: 'core-target' } }
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: `Checklist update:\n${renderChecklist(CORE_CHECKLIST, ['projectVision', 'targetAudience'])}`
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: 'What timeline are we dancing with? Share deadlines, launch windows, or “no rush” context.'
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: 'Examples:\n- "Need an alpha in 6 weeks for an accelerator demo"\n- "Targeting a polished v1 by year-end"'
    },
    {
      kind: 'input',
      id: 'core-timeline',
      label: 'Timeline constraints',
      placeholder: 'Deadlines or timing pressure?',
      required: true,
      emptyMessage: 'What timeline are we working with? Share any deadlines or timing pressure.'
    },
    {
      kind: 'tool',
      name: 'record_onboarding_data',
      input: { repoRoot: { literal: repoRoot }, timelineConstraints: { fromInput: 'core-timeline' } }
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: `Checklist update:\n${renderChecklist(CORE_CHECKLIST, ['projectVision', 'targetAudience', 'timelineConstraints'])}`
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: 'How do you balance speed versus quality here? Say it in your own words so I can keep that lens on the team.'
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: 'Examples:\n- "Ship fast and iterate – investor pressure"\n- "Quality first – this underpins compliance"'
    },
    {
      kind: 'input',
      id: 'core-quality',
      label: 'Quality vs speed preference',
      placeholder: 'Where do you sit on the spectrum?',
      required: true,
      emptyMessage: 'How do you balance speed versus quality? Please share your preference.'
    },
    {
      kind: 'tool',
      name: 'record_onboarding_data',
      input: { repoRoot: { literal: repoRoot }, qualityVsSpeed: { fromInput: 'core-quality' } }
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: `Checklist update:\n${renderChecklist(CORE_CHECKLIST, ['projectVision', 'targetAudience', 'timelineConstraints', 'qualityVsSpeed'])}`
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: "Who's working alongside you? Solo build, tight pod, or a full crew with specific roles?"
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: 'Examples:\n- "Just me and occasional contractor help"\n- "Product trio: me, a designer, and a backend dev"'
    },
    {
      kind: 'input',
      id: 'core-team',
      label: 'Team size and setup',
      placeholder: 'How big is the crew and how do you split work?',
      required: true,
      emptyMessage: 'Who is working on this? Please describe the team size and setup.'
    },
    {
      kind: 'tool',
      name: 'record_onboarding_data',
      input: { repoRoot: { literal: repoRoot }, teamSize: { fromInput: 'core-team' } }
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: `Checklist update:\n${renderChecklist(CORE_CHECKLIST, ['projectVision', 'targetAudience', 'timelineConstraints', 'qualityVsSpeed', 'teamSize'])}`
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: 'How comfortable are you with this stack? Tell me honestly so we can set the right safety rails.'
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: 'Examples:\n- "Beginner – learning React and TypeScript as I go"\n- "Seasoned engineer with a backend focus"'
    },
    {
      kind: 'input',
      id: 'core-experience',
      label: 'Experience level',
      placeholder: 'Share your comfort level',
      required: true,
      emptyMessage: 'How comfortable are you with this stack? Please share your experience level.'
    },
    {
      kind: 'tool',
      name: 'record_onboarding_data',
      input: { repoRoot: { literal: repoRoot }, experienceLevel: { fromInput: 'core-experience' } }
    },
    {
      kind: 'tool',
      name: 'get_onboarding_progress',
      input: { repoRoot: { literal: repoRoot } }
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: `Core discovery locked in. Checklist complete:\n${renderChecklist(CORE_CHECKLIST, CORE_CHECKLIST.map(item => item.key))}`
    },

    // Phase 3: Methodology guidance
    {
      kind: 'say',
      speaker: 'assistant',
      text: {
        concat: [
          literal("Here's how I'm thinking about methodology:"),
          literal('\n• Because you\'re targeting '),
          { fromInput: 'core-target' },
          literal(', we need a flow that keeps their needs front and centre.'),
          literal('\n• With timeline: '),
          { fromInput: 'core-timeline' },
          literal(', we should balance predictability and iteration.'),
          literal('\n• Your stance on speed vs quality ('),
          { fromInput: 'core-quality' },
          literal(') sets the tone for how strict we make the guardrails.'),
          literal('\n• Team makeup: '),
          { fromInput: 'core-team' },
          literal(' and experience: '),
          { fromInput: 'core-experience' },
          literal(' tell me how much structure versus autonomy you want.')
        ]
      }
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: {
        concat: [
          literal('My top three fits:'),
          literal('\n1. Test-Driven Development (TDD) — because you said "'),
          { fromInput: 'core-quality' },
          literal('", we can bake quality into every iteration.'),
          literal('\n2. Agile / Scrum — because your timeline is "'),
          { fromInput: 'core-timeline' },
          literal('", sprints will keep you shipping without stalling.'),
          literal('\n3. Kanban / Continuous Flow — because your team setup is "'),
          { fromInput: 'core-team' },
          literal('", a steady stream with WIP limits will keep everyone synced.')
        ]
      }
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: `${TOP_SIX_METHODS}\nWant the full catalog? Just say "Show me more" and I'll list everything.`
    },
    {
      kind: 'input',
      id: 'methodology-choice',
      label: 'Which methodology feels right? (number, name, or describe it)',
      placeholder: 'Example: 1, "TDD", or "Blend Scrum with extra QA gates"'
    },
    {
      kind: 'tool',
      name: 'select_methodology',
      input: { repoRoot: { literal: repoRoot }, choice: { fromInput: 'methodology-choice' } }
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: {
        concat: [
          literal("Locked. We'll steer the roster with "),
          { fromTool: 'select_methodology', path: 'methodology' },
          literal('. Before we forge, let me gather the delivery details so every specialist shows up prepared.')
        ]
      }
    },

    // Phase 4: Remaining delivery requirements
    {
      kind: 'say',
      speaker: 'assistant',
      text: `Delivery checklist incoming (methodology is #7).\n${renderChecklist(DELIVERY_CHECKLIST, [])}`
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: "What's the budget or resourcing picture? Think tooling, hosting, or headcount constraints."
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: 'Examples:\n- "Bootstrapped – keep costs close to zero"\n- "Venture-backed – happy to invest in automation"'
    },
    {
      kind: 'input',
      id: 'delivery-budget',
      label: 'Budget constraints',
      placeholder: 'Share spend limits or funding context',
      required: true,
      emptyMessage: 'What is the budget or resourcing picture? Please share any constraints.'
    },
    {
      kind: 'tool',
      name: 'record_onboarding_data',
      input: { repoRoot: { literal: repoRoot }, budgetConstraints: { fromInput: 'delivery-budget' } }
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: `Checklist update:\n${renderChecklist(DELIVERY_CHECKLIST, ['budgetConstraints'])}`
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: 'Where will this live and how should it scale? Mention hosting preferences and traffic expectations.'
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: 'Examples:\n- "Start on Vercel, expect a few thousand users"\n- "Deploy on AWS ECS with auto-scaling for enterprise rollouts"'
    },
    {
      kind: 'input',
      id: 'delivery-deployment',
      label: 'Deployment & scale',
      placeholder: 'Hosting, environments, and load expectations',
      required: true,
      emptyMessage: 'Where will this live and how should it scale? Please describe deployment and scale needs.'
    },
    {
      kind: 'tool',
      name: 'record_onboarding_data',
      input: { repoRoot: { literal: repoRoot }, deploymentRequirements: { fromInput: 'delivery-deployment' } }
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: `Checklist update:\n${renderChecklist(DELIVERY_CHECKLIST, ['budgetConstraints', 'deploymentRequirements'])}`
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: 'Any security, privacy, or compliance guardrails? Call out regulations, audits, or sensitive data.'
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: 'Examples:\n- "HIPAA and SOC2-ready logging"\n- "Standard web app hardening is enough"'
    },
    {
      kind: 'input',
      id: 'delivery-security',
      label: 'Security & compliance',
      placeholder: 'Regulations, data sensitivity, audit needs',
      required: true,
      emptyMessage: 'Any security, privacy, or compliance guardrails? Please describe requirements.'
    },
    {
      kind: 'tool',
      name: 'record_onboarding_data',
      input: { repoRoot: { literal: repoRoot }, securityRequirements: { fromInput: 'delivery-security' } }
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: `Checklist update:\n${renderChecklist(DELIVERY_CHECKLIST, ['budgetConstraints', 'deploymentRequirements', 'securityRequirements'])}`
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: 'Lastly, how much scale do we plan for? Mention traffic, concurrency, or growth expectations even if approximate.'
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: 'Examples:\n- "Internal tool for ten teammates"\n- "Expect 50k monthly users within six months"'
    },
    {
      kind: 'input',
      id: 'delivery-scale',
      label: 'Scalability needs',
      placeholder: 'Expected usage and growth horizon',
      required: true,
      emptyMessage: 'How much scale do we plan for? Please describe expected usage and growth.'
    },
    {
      kind: 'tool',
      name: 'record_onboarding_data',
      input: { repoRoot: { literal: repoRoot }, scalabilityNeeds: { fromInput: 'delivery-scale' } }
    },
    {
      kind: 'tool',
      name: 'get_onboarding_progress',
      input: { repoRoot: { literal: repoRoot } }
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: `Delivery checklist complete:\n${renderChecklist(DELIVERY_CHECKLIST, DELIVERY_CHECKLIST.map(item => item.key))}`
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: {
        concat: [
          literal('Full context summary before we forge:'),
          literal('\n• Vision: '),
          { fromInput: 'project-vision' },
          literal('\n• Audience: '),
          { fromInput: 'core-target' },
          literal('\n• Timeline: '),
          { fromInput: 'core-timeline' },
          literal('\n• Speed vs quality: '),
          { fromInput: 'core-quality' },
          literal('\n• Team: '),
          { fromInput: 'core-team' },
          literal('\n• Experience: '),
          { fromInput: 'core-experience' },
          literal('\n• Methodology: '),
          { fromTool: 'select_methodology', path: 'methodology' },
          literal('\n• Budget: '),
          { fromInput: 'delivery-budget' },
          literal('\n• Deployment: '),
          { fromInput: 'delivery-deployment' },
          literal('\n• Security: '),
          { fromInput: 'delivery-security' },
          literal('\n• Scalability: '),
          { fromInput: 'delivery-scale' },
          literal('\nNeed any tweaks before I forge the roster?')
        ]
      }
    },
    {
      kind: 'input',
      id: 'final-adjustments',
      label: 'Add tweaks or say "Forge the team" to continue',
      placeholder: 'Example: Swap deployment focus to serverless functions'
    },

    // Phase 5: Personalized roster reveal and forging
    {
      kind: 'tool',
      name: 'recommend_droids',
      input: { repoRoot: { literal: repoRoot } }
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: { fromTool: 'recommend_droids', path: 'introText' }
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: { fromTool: 'recommend_droids', path: 'coverageRecap' }
    },
    {
      kind: 'input',
      id: 'custom-droids',
      label: 'Want extra specialists? List them here or leave blank',
      helper: 'Example: df-growth — focuses on onboarding funnels for fintech beta cohort'
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: {
        concat: [
          literal('Time to forge. I\'ll bake in the '),
          { fromTool: 'select_methodology', path: 'methodology' },
          literal(' cadence and everything you shared. After this finishes, restart your droid CLI so the new commands load.')
        ]
      }
    },
    {
      kind: 'tool',
      name: 'forge_roster',
      input: { repoRoot: { literal: repoRoot }, customInput: { fromInput: 'custom-droids' } }
    },
    {
      kind: 'tool',
      name: 'generate_user_guide',
      input: { repoRoot: { literal: repoRoot }, rosterFrom: 'forge_roster' }
    },
    {
      kind: 'tool',
      name: 'install_commands',
      input: { repoRoot: { literal: repoRoot }, rosterFrom: 'forge_roster' }
    },
    {
      kind: 'say',
      speaker: 'assistant',
      text: {
        concat: [
          literal('All forged. Your roster is live, grounded in '),
          { fromTool: 'select_methodology', path: 'methodology' },
          literal(" and the priorities you spelled out. When you're ready, run /df to orchestrate tasks or jump straight to a specialist like /df-frontend.")
        ]
      }
    },
    {
      kind: 'summary',
      title: 'Next steps',
      lines: [
        'Restart your shell so the new df-* commands register',
        'Kick things off with /forge-task to route the first request',
        'Open docs/DroidForge_user_guide_en.md for the full team handbook',
        'Need to reset later? /forge-removeall will clean everything up'
      ]
    }
  ];

  return {
    name: 'onboarding',
    sessionId,
    repoRoot,
    segments
  };
}

