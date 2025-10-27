import type { PromptScript } from './types.js';

const ALL_METHODOLOGIES = [
  { value: 'agile', title: '1. Agile / Scrum', description: 'Short sprints, daily standups, iterative delivery - great for evolving requirements' },
  { value: 'tdd', title: '2. Test-Driven Development (TDD)', description: 'Write tests first, then code to make them pass - ensures quality and prevents bugs' },
  { value: 'bdd', title: '3. Behavior-Driven Development (BDD)', description: 'Write human-readable specs, then build to match - perfect for user-facing features' },
  { value: 'waterfall', title: '4. Waterfall', description: 'Plan everything upfront, build in sequential phases - good for fixed requirements' },
  { value: 'kanban', title: '5. Kanban / Continuous Flow', description: 'Visual workflow, pull-based work, continuous delivery - great for maintenance' },
  { value: 'lean', title: '6. Lean Startup', description: 'Build-Measure-Learn, MVP focus, rapid experimentation - perfect for new products' },
  { value: 'ddd', title: '7. Domain-Driven Design (DDD)', description: 'Model the business domain, ubiquitous language - ideal for complex business logic' },
  { value: 'devops', title: '8. DevOps / Platform Engineering', description: 'Infrastructure as code, CI/CD, monitoring - for production-ready systems' },
  { value: 'rapid', title: '9. Rapid Prototyping', description: 'Quick iterations, throwaway code, speed over polish - great for proofs of concept' },
  { value: 'enterprise', title: '10. Enterprise / Governance', description: 'Documentation, reviews, compliance, standards - for large teams and regulation' }
];

export function createOnboardingScript(sessionId: string, repoRoot: string): PromptScript {
  return {
    name: 'onboarding',
    sessionId,
    repoRoot,
    segments: [
      // PHASE 1: Welcome & Context (30 seconds)
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Hi! I'm your DroidForge architect. I help you build custom AI specialist droid teams. Let me quickly scan your repository to understand what we're working with...

IMPORTANT: I will not use emojis in my responses. All communication will be clean text only.`
      },
      {
        kind: 'tool',
        name: 'smart_scan',
        input: { sessionId: { literal: sessionId }, repoRoot: { literal: repoRoot } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Repository Analysis Complete!

I've analyzed your repository. Now let's talk about your vision and build you the perfect specialist droid team.`
      },
      
      // PHASE 2: Project Discovery (1-2 minutes)
      {
        kind: 'say',
        speaker: 'assistant',
        text: `What are you building here?

Describe your project vision - what kind of application, website, or system do you want to create? The more specific you are, the better I can tailor your specialist droid team.`
      },
      {
        kind: 'input',
        id: 'project-goal',
        label: 'Project Description',
        placeholder: 'Example: Landing page for a dentist office with appointment booking'
      },
      {
        kind: 'tool',
        name: 'record_project_goal',
        input: { sessionId: { literal: sessionId }, repoRoot: { literal: repoRoot }, description: { fromInput: 'project-goal' } }
      },
      
      // PHASE 3: Methodology Consultation (1 minute) - Show All 10, Then Recommend
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Development Methodology Selection

Here are all the development approaches I support. Each one shapes how your specialist droids will work together:`
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
        input: { sessionId: { literal: sessionId }, repoRoot: { literal: repoRoot }, choice: { fromChoice: 'methodology-choice' } }
      },
      
      // PHASE 4: Team Assembly (1 minute) - Call them "specialist droids"
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Assembling Your Specialist Droid Team

Based on your project and chosen methodology, I'm recommending a team of specialist droids. Each one is an expert in their domain and understands your specific requirements:`
      },
      {
        kind: 'tool',
        name: 'recommend_droids',
        input: { sessionId: { literal: sessionId }, repoRoot: { literal: repoRoot } }
      },
      {
        kind: 'input',
        id: 'custom-droids',
        label: 'Optional: Add Custom Specialist Droids',
        helper: 'Example: SEO Specialist - optimizes for local dental practice search results'
      },
      
      // PHASE 5: Team Creation (30 seconds)
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Creating Your Specialist Droid Team...

Forging your custom AI specialists now. Each droid will understand your project context and work according to your chosen methodology.`
      },
      {
        kind: 'tool',
        name: 'forge_roster',
        input: { sessionId: { literal: sessionId }, repoRoot: { literal: repoRoot }, customInput: { fromInput: 'custom-droids' } }
      },
      {
        kind: 'tool',
        name: 'generate_user_guide',
        input: { sessionId: { literal: sessionId }, repoRoot: { literal: repoRoot }, rosterFrom: 'forge_roster' }
      },
      {
        kind: 'tool',
        name: 'install_commands',
        input: { sessionId: { literal: sessionId }, repoRoot: { literal: repoRoot }, rosterFrom: 'forge_roster' }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Your Specialist Droid Team is Ready!

Your custom AI development team has been created and is standing by. Each specialist droid knows your project context and methodology.`
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
