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
  { value: 'waterfall', title: '4. Waterfall', description: 'Locks scope and budget early with a tightly sequenced plan.' },
  { value: 'kanban', title: '5. Kanban / Continuous Flow', description: 'Maintains steady progress with visual queues and WIP limits.' },
  { value: 'lean', title: '6. Lean Startup', description: 'Validates ideas fast with small builds and quick feedback loops.' },
  { value: 'ddd', title: '7. Domain-Driven Design (DDD)', description: 'Untangles complex business rules with a shared domain language.' },
  { value: 'devops', title: '8. DevOps / Platform Engineering', description: 'Automates deploys and keeps environments healthy.' },
  { value: 'rapid', title: '9. Rapid Prototyping', description: 'Spins up throwaway experiments to explore ideas quickly.' },
  { value: 'enterprise', title: '10. Enterprise / Governance', description: 'Meets compliance, review, and audit requirements for large teams.' }
];

function analyzeUserResponse(response: string): Partial<OnboardingData> {
  const inferred: Record<string, string> = {};
  const data: Partial<OnboardingData> = { inferredData: inferred };

  // Extract project vision (always present in description)
  data.projectVision = response.trim();

  // Target audience patterns
  if (/my (wife|husband|family|friend|partner)/i.test(response)) {
    inferred.targetAudience = 'personal/family';
  } else if (/startup|launch|founder/i.test(response)) {
    inferred.targetAudience = 'startup/customers';
  } else if (/enterprise|corporate|company/i.test(response)) {
    inferred.targetAudience = 'enterprise/internal';
  } else if (/school|university|education/i.test(response)) {
    inferred.targetAudience = 'educational';
  }

  // Timeline constraints
  const timelineMatch = response.match(/(\d+)\s*(day|week|month|year)s?/i);
  if (timelineMatch) {
    inferred.timelineConstraints = timelineMatch[0];
  } else if (/urgent|asap|quickly|fast/i.test(response)) {
    inferred.timelineConstraints = 'urgent/quick';
  } else if (/no rush|eventually|when ready/i.test(response)) {
    inferred.timelineConstraints = 'flexible';
  }

  // Quality vs speed preferences
  if (/mvp|minimum|quick test|validate|pitch/i.test(response)) {
    inferred.qualityVsSpeed = 'speed prioritized';
  } else if (/production|stable|solid|enterprise|sensitive/i.test(response)) {
    inferred.qualityVsSpeed = 'quality prioritized';
  }

  // Team size
  if (/solo|just me|by myself|one person/i.test(response)) {
    inferred.teamSize = 'solo';
  } else if (/team of (\d+)|(\d+) developers?/i.test(response)) {
    const teamMatch = response.match(/team of (\d+)|(\d+) developers?/i);
    inferred.teamSize = teamMatch ? teamMatch[1] || teamMatch[2] : 'small team';
  } else if (/startup|company|enterprise/i.test(response)) {
    inferred.teamSize = 'larger team';
  }

  // Budget constraints
  if (/bootstrap|lean|cost.*low|budget.*tight/i.test(response)) {
    inferred.budgetConstraints = 'cost-conscious';
  } else if (/enterprise|budget.*not.*issue|cost.*not.*factor/i.test(response)) {
    inferred.budgetConstraints = 'well-funded';
  }

  // Deployment requirements
  if (/aws|azure|gcp|cloud.*infrastructure/i.test(response)) {
    inferred.deploymentRequirements = 'enterprise cloud';
  } else if (/heroku|vercel|netlify|simple.*deploy/i.test(response)) {
    inferred.deploymentRequirements = 'simple hosting';
  }

  // Security requirements
  if (/hipaa|soc.*2|payment|financial|sensitive|pii/i.test(response)) {
    inferred.securityRequirements = 'high security';
  } else if (/basic|simple|public|info.*sensitive/i.test(response)) {
    inferred.securityRequirements = 'basic security';
  }

  // Scalability needs
  if (/(\d+k|\d+,\d+).*users?|scale.*large|10k\+.*users?/i.test(response)) {
    inferred.scalabilityNeeds = 'high scale';
  } else if (/(\d+|few|hundred).*users?|personal|family/i.test(response)) {
    inferred.scalabilityNeeds = 'low scale';
  }

  // Technical experience
  if (/beginner|learning|new.*to.*coding/i.test(response)) {
    inferred.experienceLevel = 'beginner';
  } else if (/senior|experienced|expert|8\+.*years/i.test(response)) {
    inferred.experienceLevel = 'experienced';
  } else if (/some.*experience|intermediate/i.test(response)) {
    inferred.experienceLevel = 'intermediate';
  }

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

function generateRecommendations(data: Partial<OnboardingData>): string[] {
  const recommendations: string[] = [];
  const inferred = data.inferredData || {};

  // Recommendation logic based on collected data
  if (inferred.experienceLevel === 'beginner') {
    recommendations.push('agile', 'lean');
  } else if (inferred.experienceLevel === 'experienced') {
    recommendations.push('tdd', 'ddd');
  }

  if (inferred.qualityVsSpeed === 'speed prioritized') {
    recommendations.push('rapid', 'lean');
  } else if (inferred.qualityVsSpeed === 'quality prioritized') {
    recommendations.push('tdd', 'ddd');
  }

  if (inferred.teamSize === 'solo') {
    recommendations.push('kanban', 'rapid');
  } else if (inferred.teamSize && parseInt(inferred.teamSize) > 3) {
    recommendations.push('agile', 'devops');
  }

  if (inferred.securityRequirements === 'high security') {
    recommendations.push('tdd', 'devops');
  }

  if (inferred.timelineConstraints && /urgent|quick/i.test(inferred.timelineConstraints)) {
    recommendations.push('rapid', 'lean');
  }

  // Remove duplicates and ensure we have at least 2 recommendations
  const uniqueRecs = [...new Set(recommendations)];
  
  if (uniqueRecs.length < 2) {
    uniqueRecs.push('agile', 'tdd');
  }

  return uniqueRecs.slice(0, 3);
}

export function createIntelligentOnboardingScript(sessionId: string, repoRoot: string): PromptScript {
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
        text: `Tell me about your project. What are you building, who's it for, and what's your situation?

Examples that help me understand:
- "E-commerce site for handmade pottery, targeting craft enthusiasts, solo developer with 3-month timeline"
- "Internal tool for employee training tracking, 50-person company, team of 2 developers, needs HIPAA compliance"
- "iOS artillery game with physics, targeting casual gamers, 2-month deadline"`
      },
      {
        kind: 'input',
        id: 'project-overview',
        label: 'Project Description & Context',
        placeholder: 'Tell me everything about your project, audience, timeline, and situation...'
      },
      {
        kind: 'tool',
        name: 'record_project_goal',
        input: { 
          repoRoot: { literal: repoRoot }, 
          description: { fromInput: 'project-overview' } 
        }
      },

      // PHASE 3: Intelligent Follow-up Questions
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Great! Let me ask a few targeted questions to fill in the details I need to recommend the perfect approach for you.`
      },

      // Dynamic follow-ups will be inserted here based on missing data
      // For now, we'll ask common follow-ups

      // Experience level
      {
        kind: 'say',
        speaker: 'assistant',
        text: `How would you describe your coding experience?
- Beginner, learning as I build
- Some experience, comfortable with basics
- Senior engineer, several years experience`
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

      // Quality vs Speed
      {
        kind: 'say',
        speaker: 'assistant',
        text: `What's more important right now: getting it working fast or building it rock-solid?
- Speed - need to validate the idea quickly
- Quality - this will handle sensitive data/production use
- Balanced - need both speed and reliability`
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

      // Budget constraints
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Any budget constraints or resource limitations?
- Bootstrap startup, minimal costs preferred
- Some budget available but need to be cost-conscious
- Enterprise project, cost not a major factor`
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

      // PHASE 4: AI Methodology Recommendations
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Based on what you've told me, I recommend these development approaches:

1. **Agile/Scrum** - Short sprints, adapt as you learn, great for changing requirements
2. **Test-Driven Development** - Write tests first, catch bugs early, build confidence
3. **Rapid Prototyping** - Quick experiments to test ideas, perfect for validation

Which approach fits your situation best?`
      },
      {
        kind: 'choice',
        id: 'methodology-choice',
        label: 'Choose your development approach:',
        options: ALL_METHODOLOGIES
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
        text: `Building your specialist droid team

Based on your project and chosen methodology, I'll create a recommended team of specialist droids. Each one focuses on a specific area to help you move faster:`
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
        text: `Creating your specialist droids now. Each one will understand your project context and follow the methodology you chose.`
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
        text: `Done! Your specialist droid team is ready and standing by. Each specialist knows your project context and the chosen methodology.`
      },
      {
        kind: 'summary',
        title: 'Get Started with Your Specialist Droids',
        lines: [
          'Try: /forge-task Create a hero section for the homepage - get routing advice',
          'Read the team handbook: docs/DroidForge_user_guide_en.md',
          'Invoke specialists directly: /df-frontend, /df-backend, /df-auth, etc.',
          'All done? Use /forge-removeall to clean up when finished'
        ]
      }
    ]
  };
}