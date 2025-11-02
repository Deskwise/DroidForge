import type { PromptScript } from './types.js';

interface OnboardingData {
  projectVision: string;
  targetAudience: string;
  timelineConstraints: string;
  qualityVsSpeed: string;
  teamSize: string;
  experienceLevel: string;
  budgetConstraints: string;
  deploymentRequirements: string;
  securityRequirements: string;
  scalabilityNeeds: string;
  methodologyChoice?: string;
  aiRecommendations: string[];
  inferredData: Record<string, string>;
  collectedItems: Set<string>;
}

const ALL_METHODOLOGIES = [
  { value: 'agile', title: '1. Agile / Scrum', description: 'Ships in short sprints so you can adapt as plans change.' },
  { value: 'tdd', title: '2. Test-Driven Development (TDD)', description: 'Catches bugs early by writing the safety net of tests first.' },
  { value: 'bdd', title: '3. Behavior-Driven Development (BDD)', description: 'Keeps product and engineering aligned with shared behavior examples.' },
  { value: 'rapid', title: '4. Rapid Prototyping', description: 'Spins up throwaway experiments to explore ideas quickly.' },
  { value: 'devops', title: '5. DevOps / Platform Engineering', description: 'Automates deploys and keeps environments healthy.' }
];

// Removed pattern matching logic per spec requirements
// AI will handle intelligent understanding through conversational interface
function analyzeUserResponse(response: string): Partial<OnboardingData> {
  const data: Partial<OnboardingData> = { inferredData: {} };
  data.projectVision = response.trim();
  // All other fields will be collected through conversational AI, not pattern matching
  return data;
}

function getMissingItems(collected: Partial<OnboardingData>, inferred: Record<string, string>): string[] {
  const requiredItems = [
    'projectVision', 'targetAudience', 'timelineConstraints', 'qualityVsSpeed',
    'teamSize', 'experienceLevel', 'budgetConstraints', 'deploymentRequirements',
    'securityRequirements', 'scalabilityNeeds'
  ];

  const missing: string[] = [];

  for (const item of requiredItems) {
    const collectedValue = (collected as any)[item];
    if (!collectedValue && !inferred[item]) {
      missing.push(item);
    }
  }

  return missing;
}

// Removed rule-based recommendation logic per spec requirements
// AI will provide intelligent recommendations through conversational interface
function generateRecommendations(data: Partial<OnboardingData>): string[] {
  // Return empty array - AI will handle recommendations through conversation
  return [];
}

export function createIntelligentOnboardingScript(sessionId: string, repoRoot: string): PromptScript {
  // Rotate concise examples for the vision prompt (exactly 2 shown)
  const visionPool = [
    'a ThreeJS TicTacToe game with smooth graphics',
    'an iOS note-taking app',
    'a Python CLI to batch-rename files',
    'a Next.js blog with MDX',
    'a Flask REST API for tasks',
    'a Shopify theme for handmade goods',
    'a React dashboard for IoT metrics',
    'a Unity 2D platformer',
    'a Chrome extension for tab cleanup',
    'a Slack bot for standups'
  ];
  const pickTwo = (arr: string[]) => {
    if (arr.length < 2) return arr as any;
    const a = Math.floor(Math.random() * arr.length);
    let b = Math.floor(Math.random() * (arr.length - 1));
    if (b >= a) b += 1;
    return [arr[a], arr[b]] as const;
  };
  const [ex1, ex2] = pickTwo(visionPool);
  return {
    name: 'onboarding-intelligent',
    sessionId,
    repoRoot,
    segments: [
      // PHASE 1: Welcome & Context (30 seconds)
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Hi! I'm your DroidForge architect. I help you build custom AI specialist droid teams by understanding your project and needs. Let me quickly scan your repository to see what we're working with...`
      },
      {
        kind: 'tool',
        name: 'smart_scan',
        input: { repoRoot: { literal: repoRoot } }
      },

      // PHASE 2: Intelligent Data Collection
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Tell me about your project. What are you building, who's it for, and what's your situation? For example: "${ex1}" or "${ex2}".`
      },
      {
        kind: 'input',
        id: 'project-overview',
        label: 'Project Description & Context',
        placeholder: 'Tell me everything about your project, audience, timeline, and situation...',
        required: true,
        emptyMessage: 'Please describe what you are building before we continue.'
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Love it. Let’s bounce around the experience so we lock it in. Who’s playing and how should matches feel? Head-to-head, against an AI (with difficulty levels?), or both?
- Example 1: Two friends playing live with cinematic camera swings
- Example 2: Solo player battling a CPU with easy/medium/hard settings`
      },
      {
        kind: 'input',
        id: 'vision-audience',
        label: 'Audience & match style',
        required: true,
        emptyMessage: 'Who is this for and how should the experience feel? Please share the audience/style.'
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: { repoRoot: { literal: repoRoot }, targetAudience: { fromInput: 'vision-audience' } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Great direction already. What moments would make you high-five yourself and say this nailed it? Features, reactions, or polish—whatever matters most.
- Example 1: “The AI feels smart but fair, and players keep rematching”
- Example 2: “Everyone shares screenshots because the lighting and animations pop”`
      },
      {
        kind: 'input',
        id: 'vision-success',
        label: 'Success signal',
        required: true,
        emptyMessage: 'Describe what success looks like so we can aim for it before continuing.'
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: { repoRoot: { literal: repoRoot }, inferred: { fromInput: 'vision-success' } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Got it. I'll keep that front and center. If anything sounds off as we go, jump in and correct me.`
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Let me replay what I heard to make sure I'm aligned.`
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: {
          concat: [
            { literal: '• Project: ' },
            { fromInput: 'project-overview' },
            { literal: '\n• Audience & match style: ' },
            { fromInput: 'vision-audience' },
            { literal: '\n• Success signal: ' },
            { fromInput: 'vision-success' }
          ]
        }
      },
      {
        kind: 'input',
        id: 'vision-confirm',
        label: 'Confirm or correct my understanding',
        placeholder: 'Looks good, or add anything I missed',
        required: true,
        emptyMessage: 'Let me know if that summary is correct or what to adjust.'
      },
      {
        kind: 'tool',
        name: 'record_project_goal',
        input: {
          repoRoot: { literal: repoRoot },
          description: { fromInput: 'project-overview' }
        }
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: {
          repoRoot: { literal: repoRoot },
          projectVision: { fromInput: 'project-overview' }
        }
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: {
          repoRoot: { literal: repoRoot },
          targetAudience: { fromInput: 'vision-audience' }
        }
      },

      // PHASE 3: Intelligent Follow-up Questions (collect all 10 items)
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Great! I need to capture a few details so I can tailor recommendations. If you already answered something, say "same" or "see above".`
      },

      // 1) Experience level
      {
        kind: 'say',
        speaker: 'assistant',
        text: `How would you describe your coding experience?
- Example 1: Beginner, learning as I build
- Example 2: Senior engineer, 8 years experience`
      },
      {
        kind: 'choice',
        id: 'experience-level',
        label: 'Your coding experience:',
        options: [
          { value: 'beginner', title: 'Beginner', description: 'Learning as I build' },
          { value: 'intermediate', title: 'Intermediate', description: 'Some experience, comfortable with basics' },
          { value: 'experienced', title: 'Experienced', description: 'Senior engineer, several years experience' }
        ]
      },
      { kind: 'tool', name: 'record_onboarding_data', input: { repoRoot: { literal: repoRoot }, experienceLevel: { fromChoice: 'experience-level' } } },

      // 2) Quality vs Speed
      {
        kind: 'say',
        speaker: 'assistant',
        text: `What's more important right now: getting it working fast or building it rock-solid?
- Example 1: Speed — need to validate the idea quickly
- Example 2: Quality — this will handle sensitive financial/PII data`
      },
      {
        kind: 'choice',
        id: 'quality-speed',
        label: 'Priority preference:',
        options: [
          { value: 'speed', title: 'Speed', description: 'Validate the idea quickly' },
          { value: 'quality', title: 'Quality', description: 'Rock-solid, production-ready' },
          { value: 'balanced', title: 'Balanced', description: 'Need both speed and reliability' }
        ]
      },
      { kind: 'tool', name: 'record_onboarding_data', input: { repoRoot: { literal: repoRoot }, qualityVsSpeed: { fromChoice: 'quality-speed' } } },

      // 3) Security requirements
      { kind: 'say', speaker: 'assistant', text: `Any security requirements or sensitive data?
- Example 1: Basic accounts only, nothing sensitive
- Example 2: Payment processing + PII, need SOC 2/HIPAA` },
      { kind: 'input', id: 'security-reqs', label: 'Security requirements' },
      { kind: 'tool', name: 'record_onboarding_data', input: { repoRoot: { literal: repoRoot }, securityRequirements: { fromInput: 'security-reqs' } } },

      // 4) Deployment requirements
      { kind: 'say', speaker: 'assistant', text: `Where do you want to deploy this? Any platform preferences?
- Example 1: Vercel/Netlify, keep it simple
- Example 2: AWS/GCP with custom infrastructure` },
      { kind: 'input', id: 'deploy-reqs', label: 'Deployment preferences' },
      { kind: 'tool', name: 'record_onboarding_data', input: { repoRoot: { literal: repoRoot }, deploymentRequirements: { fromInput: 'deploy-reqs' } } },

      // 5) Scalability needs
      { kind: 'say', speaker: 'assistant', text: `How many users do you expect? Any performance needs?
- Example 1: ~100 users, basic CRUD
- Example 2: 10k+ users, real-time updates` },
      { kind: 'input', id: 'scale-needs', label: 'Scalability expectations' },
      { kind: 'tool', name: 'record_onboarding_data', input: { repoRoot: { literal: repoRoot }, scalabilityNeeds: { fromInput: 'scale-needs' } } },

      // 6) Budget constraints
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Any budget constraints or resource limitations?
- Example 1: Bootstrap startup, minimal costs
- Example 2: Enterprise project, cost not a major factor`
      },
      {
        kind: 'choice',
        id: 'budget',
        label: 'Budget situation:',
        options: [
          { value: 'tight', title: 'Tight Budget', description: 'Bootstrap startup, minimal costs' },
          { value: 'moderate', title: 'Moderate Budget', description: 'Some budget available' },
          { value: 'flexible', title: 'Flexible Budget', description: 'Enterprise, cost not major factor' }
        ]
      },
      { kind: 'tool', name: 'record_onboarding_data', input: { repoRoot: { literal: repoRoot }, budgetConstraints: { fromChoice: 'budget' } } },

      // 7) Team size / solo
      { kind: 'say', speaker: 'assistant', text: `Are you solo or working with a team? If team, how many?
- Example 1: Solo
- Example 2: Team of 3 devs + 1 designer` },
      { kind: 'input', id: 'team-size', label: 'Team size' },
      { kind: 'tool', name: 'record_onboarding_data', input: { repoRoot: { literal: repoRoot }, teamSize: { fromInput: 'team-size' } } },
      // 8) Timeline constraints
      { kind: 'say', speaker: 'assistant', text: `Any timeline constraints or deadlines?
- Example 1: MVP in 4 weeks
- Example 2: Launch in 2 months for a pitch` },
      { kind: 'input', id: 'timeline', label: 'Timeline constraints' },
      { kind: 'tool', name: 'record_onboarding_data', input: { repoRoot: { literal: repoRoot }, timelineConstraints: { fromInput: 'timeline' } } },

      {
        kind: 'say',
        speaker: 'assistant',
        text: `Quick double-check before we pick a methodology: I captured your project vision, target audience, timeline, quality vs speed preference, experience level, team size, budget, deployment, security, and scalability needs. If any of those need tweaks, tell me now; otherwise just say "looks good".`
      },
      {
        kind: 'input',
        id: 'vision-confirmation',
        label: 'Anything to correct or clarify?'
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Thanks! I'll factor that in as we choose the methodology.`
      },

      // PHASE 4: Methodology Recommendations and Selection
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Based on your answers, I'll recommend the three best fits and list the five approaches most teams start with. If you prefer another style, just say so.`
      },
      { kind: 'say', speaker: 'assistant', text: `Top approaches (pick 1-5, or ask for another option):\n\n1. Agile / Scrum - Short sprints, adapt as you learn\n2. Test-Driven Development (TDD) - Write tests first, catch bugs early\n3. Behavior-Driven Development (BDD) - Shared behavior stories keep everyone aligned\n4. Rapid Prototyping - Explore ideas quickly with low-risk experiments\n5. DevOps / Platform - Automation and reliability for frequent releases` },
      {
        kind: 'choice',
        id: 'methodology-choice',
        label: 'Choose your development approach:',
        options: [
          ...ALL_METHODOLOGIES,
          { value: 'you-decide', title: 'You decide for me', description: 'Let the assistant choose based on your inputs' }
        ]
      },
      {
        kind: 'tool',
        name: 'select_methodology',
        input: { repoRoot: { literal: repoRoot }, choice: { fromChoice: 'methodology-choice' } }
      },
      
      // PHASE 5: Team Assembly
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Building your specialist droid team. Based on your project and chosen methodology, I'll create a recommended team of specialist droids. Each one focuses on a specific area to help you move faster.`
      },
      {
        kind: 'tool',
        name: 'recommend_droids',
        input: { repoRoot: { literal: repoRoot } }
      },
      {
        kind: 'input',
        id: 'custom-droids',
        label: 'Optional: Add Custom Specialist Droids',
        helper: 'Example: SEO Specialist - optimizes for local search results'
      },
      
      // PHASE 6: Team Creation
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Creating your specialist droids now. Each one will understand your project context and follow the methodology you chose. After forging, restart your droid session so the new commands load.`
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
        text: `Done! Your specialist droid team is ready and standing by. Each specialist knows your project context and the methodology you selected. Remember to restart droid so the new commands are available.`
      },
      {
        kind: 'summary',
        title: 'Get Started with Your Specialist Droids',
        lines: [
          '1. Restart droid, then run /df to brief the orchestrator',
          '2. Use /forge-task to route your first assignment',
          '3. Read docs/DroidForge_user_guide_en.md for command details',
          '4. When finished, /forge-removeall cleans up the roster'
        ]
      }
    ]
  };
}
