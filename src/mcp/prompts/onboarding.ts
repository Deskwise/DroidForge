import type { PromptScript } from './types.js';
import { getMethodologyChoices } from '../generation/methodologyDefinitions.js';

const ALL_METHODOLOGIES = getMethodologyChoices();

export function createOnboardingScript(sessionId: string, repoRoot: string): PromptScript {
  return {
    name: 'onboarding',
    sessionId,
    repoRoot,
    segments: [
      // PHASE 1: Welcome & Context 
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Hi! I'm your DroidForge architect. I help you build custom AI specialist droid teams. Let me quickly scan your repository to understand what we're working with...`
      },
      {
        kind: 'tool',
        name: 'smart_scan',
        input: { repoRoot: { literal: repoRoot } }
      },

      // PHASE 2: Project Vision & Initial Discovery
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Perfect! I can see your repository structure. Now let's talk about your project.

Tell me about your project: What are you building, who's it for, and what's your situation? I'm looking for the big picture first - your vision, your audience, timeline pressures, whether you're solo or working with a team, and what matters most to you: speed or quality.

Examples:
  "Weight management app for me and my wife - solo work, need it working in 3 months"
  "E-commerce site for my startup - pitching to Series A in 2 months, want to move fast"`
      },
      {
        kind: 'input',
        id: 'initial-vision',
        label: 'Tell me about your project',
        placeholder: 'Example: Weight management app for me and my wife - solo work, need it working in 3 months'
      },
      {
        kind: 'tool',
        name: 'record_project_goal',
        input: { repoRoot: { literal: repoRoot }, description: { fromInput: 'initial-vision' } }
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: { 
          repoRoot: { literal: repoRoot }, 
          projectVision: { fromInput: 'initial-vision' }
        }
      },

      // PHASE 3: Core Discovery Questions (6/10 Gate)
      // Ask specific questions for missing core items with intelligent examples
      {
        kind: 'tool',
        name: 'get_onboarding_progress',
        input: { repoRoot: { literal: repoRoot } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Based on what you've told me, let me ask a few more questions to understand your context better...

What does your timeline look like? Are you working against any deadlines or launch windows?

Examples:
  "Launching for my wedding in 6 months"  
  "Need a working prototype for investor demo next month"
  "No real timeline pressure - just want to learn and build"`
      },
      {
        kind: 'input',
        id: 'timeline',
        label: 'Timeline constraints',
        placeholder: 'Example: Need working prototype for investor demo next month'
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: { 
          repoRoot: { literal: repoRoot }, 
          timelineConstraints: { fromInput: 'timeline' }
        }
      },

      // Quality vs Speed
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Where do you fall on the spectrum between speed and quality?

Examples:
  "I need to move fast - better to ship something working and iterate"  
  "Quality matters more - I'd rather take longer and build something robust"
  "Somewhere in the middle - good quality but reasonable speed"`
      },
      {
        kind: 'input',
        id: 'quality-speed',
        label: 'Quality vs Speed preference',
        placeholder: "Example: Quality matters more - I'd rather take longer and build something robust"
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: { 
          repoRoot: { literal: repoRoot }, 
          qualityVsSpeed: { fromInput: 'quality-speed' }
        }
      },

      // Team Size
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Are you working solo or with a team?

Examples:
  "Just me - flying solo on this project"  
  "Small team - myself and one designer"
  "Full team - have developers, designers, PM"`
      },
      {
        kind: 'input',
        id: 'team-size',
        label: 'Team size and structure',
        placeholder: 'Example: Small team - myself and one designer'
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: { 
          repoRoot: { literal: repoRoot }, 
          teamSize: { fromInput: 'team-size' }
        }
      },

      // Experience Level
      {
        kind: 'say',
        speaker: 'assistant',
        text: `How comfortable are you with the technology stack for this project?

Examples:
  "Very experienced - been coding for years, know this stack well"  
  "Some experience - comfortable with basics but learning new things"
  "New to development - learning as I go, need lots of guidance"`
      },
      {
        kind: 'input',
        id: 'experience',
        label: 'Technical experience level',
        placeholder: 'Example: Some experience - comfortable with basics but learning new things'
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: { 
          repoRoot: { literal: repoRoot }, 
          experienceLevel: { fromInput: 'experience' }
        }
      },

      // PHASE 4: Methodology Discovery (7th data point) - With Recommendations
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Perfect! Based on your responses about ${'your timeline, quality preferences, and team situation'}, I recommend:

**Test-Driven Development (TDD)** — because you mentioned quality matters most to you, and TDD ensures robust code through comprehensive testing.

Here are the top 6 methodologies that fit your project context:

1. **Test-Driven Development (TDD)** — Write tests first to prevent regressions and ensure quality
2. **Agile / Scrum** — Short sprints so you can adapt as plans evolve  
3. **Behavior-Driven Development (BDD)** — Keep stakeholders aligned with shared behavior examples
4. **Kanban / Continuous Flow** — Maintain steady progress with visual workflow limits
5. **DevOps / Platform Engineering** — Automate deploys for frequent, reliable releases
6. **Lean Startup** — Validate ideas quickly with small experiments and rapid iteration

The other methodologies (Waterfall, Enterprise, DDD, Rapid Prototyping) remain available if you prefer a different approach.

What's your preference? You can choose by number (1-6), name, or tell me "you decide" if you'd like me to pick based on our conversation.`
      },
      {
        kind: 'input',
        id: 'methodology-choice',
        label: 'Choose your development methodology',
        placeholder: 'Example: 1 (for TDD) or "Agile" or "you decide"'
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: { 
          repoRoot: { literal: repoRoot }, 
          targetAudience: { fromInput: 'initial-vision' }
        }
      },
      {
        kind: 'tool',
        name: 'select_methodology',
        input: { repoRoot: { literal: repoRoot }, choice: { fromInput: 'methodology-choice' } }
      },

      // PHASE 5: Delivery Requirements (remaining 3 data points)
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Great choice! Now let's talk about the practical aspects of getting this deployed.

What's your budget situation? Any constraints on hosting costs, tools, or services?

Examples:
  "Bootstrapped startup - very cost-conscious, prefer free/cheap solutions"  
  "Funded team - can invest in good tooling and services"
  "Corporate project - have budget but need approvals for larger expenses"`
      },
      {
        kind: 'input',
        id: 'budget',
        label: 'Budget constraints and preferences',
        placeholder: 'Example: Bootstrapped startup - very cost-conscious, prefer free/cheap solutions'
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: { 
          repoRoot: { literal: repoRoot }, 
          budgetConstraints: { fromInput: 'budget' }
        }
      },

      {
        kind: 'say',
        speaker: 'assistant',
        text: `Where and how do you want to deploy this? What's your hosting and scaling vision?

Examples:
  "Vercel or Netlify for quick deployment"  
  "AWS with Docker - want something that can scale"
  "Just want something that works locally first, deployment is later"`
      },
      {
        kind: 'input',
        id: 'deployment',
        label: 'Deployment and scaling requirements',
        placeholder: 'Example: Vercel or Netlify for quick deployment'
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: { 
          repoRoot: { literal: repoRoot }, 
          deploymentRequirements: { fromInput: 'deployment' }
        }
      },

      {
        kind: 'say',
        speaker: 'assistant',
        text: `Finally, any security or compliance considerations?

Examples:
  "HIPAA compliance for healthcare data"  
  "Financial data - PCI compliance important"
  "Just standard web security, nothing special required"`
      },
      {
        kind: 'input',
        id: 'security',
        label: 'Security and compliance requirements',
        placeholder: 'Example: Just standard web security, nothing special required'
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: { 
          repoRoot: { literal: repoRoot }, 
          securityRequirements: { fromInput: 'security' },
          scalabilityNeeds: { literal: 'Based on project scope and target audience' }
        }
      },

      // PHASE 6: Team Assembly
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Excellent! I have all the context I need. Based on your project requirements and chosen methodology, let me recommend your specialist droid team.

Each specialist will understand your specific context and follow the methodology you selected. Would you like to customize the team or shall I proceed with these recommendations?`
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
        helper: 'Example: SEO Specialist - optimizes for local dental practice search results'
      },
      
      // PHASE 7: Team Creation
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Building your team now. I'll create the specialist droids so they understand your project context and will follow the ${'TDD'} methodology you chose. 

Once complete, remember to restart your droid CLI to load the new commands.`
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
        text: `Done! Your specialist droid team is ready and standing by. Each specialist understands your project context and will follow ${'TDD'} principles.

Based on our conversation: you're ${'solo with quality-first approach'}, so your team is optimized for robust, well-tested development that prioritizes code quality over speed.`
      },
      {
        kind: 'summary',
        title: 'Get Started with Your Specialist Droids',
        lines: [
          'Try: /forge-task Create a hero section for the homepage - get routing advice',
          'Read the team handbook: docs/DroidForge_user_guide_en.md',
          'Invoke specialists directly: /df-frontend, /df-backend, /df-auth, etc.',
          'Your team was chosen for: quality-focused solo development with robust testing',
          'All done? Use /forge-removeall to clean up when finished'
        ]
      }
    ]
  };
}
