import type { PromptScript, PromptSegment } from './types.js';
import { METHODOLOGIES } from '../generation/methodologyDefinitions.js';

const VISION_EXAMPLES = [
  'a React dashboard for remote solar installers',
  'a mobile habit coach for new parents',
  'a Flask API that syncs warehouse inventory',
  'a ThreeJS data globe for sales teams',
  'a Shopify theme for custom merch drops',
  'a Slack bot that recaps sprint standups',
  'a WebGL playground for math students',
  'a native iOS gratitude journal',
  'a Python CLI that tidies podcast archives',
  'a multiplayer Godot puzzle arena'
];

const TIMELINE_EXAMPLES = [
  'Investor demo in 6 weeks so speed is key',
  'Soft launch for beta testers this summer',
  'No hard date, learning and iterating nights and weekends'
];

const QUALITY_EXAMPLES = [
  'Move fast, rough edges are fine as long as we learn',
  'Split the difference: aim for stable core features and iterate',
  'Quality first — this touches regulated data so I need guardrails'
];

const TEAM_EXAMPLES = [
  'Solo for now, might bring in a contractor later',
  'Pairing with one designer and one backend friend',
  'Full squad with PM, QA, and infra already in place'
];

const EXPERIENCE_EXAMPLES = [
  'Beginner: copy/pasting a lot and learning on the fly',
  'Comfortable: have shipped a few production apps',
  'Seasoned: senior engineer who wants best practices upheld'
];

const BUDGET_EXAMPLES = [
  'Bootstrapped — prefer free tiers and open source',
  'Moderate — happy to pay for services that speed things up',
  'Funded — invest where it improves stability or velocity'
];

const DEPLOYMENT_EXAMPLES = [
  'Deploy on Vercel first, maybe move to AWS when we grow',
  'Docker on AWS Fargate behind a CDN',
  'Local/internal deployment only while we validate'
];

const SECURITY_EXAMPLES = [
  'HIPAA compliance and encrypted storage end to end',
  'SOC2 ready audit trails and least-privilege access',
  'Basic web hygiene is fine — nothing sensitive yet'
];

const SCALE_EXAMPLES = [
  'Expecting a few dozen users each week at launch',
  'Need to survive launch-day spikes from marketing pushes',
  'Enterprise traffic with multi-region failover from day one'
];

function pickTwo(source: string[]): [string, string] {
  if (source.length < 2) {
    return [source[0] ?? '', source[0] ?? ''];
  }
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

function buildMethodologyCatalog(): string {
  const primary = METHODOLOGIES.slice(0, 6)
    .map((item, index) => `${index + 1}. **${item.name}** — ${item.description}`)
    .join('\n');
  const additional = METHODOLOGIES.slice(6)
    .map(item => `• ${item.name} — ${item.description}`)
    .join('\n');
  return `${primary}\n\nOther approaches are available on request:\n${additional}`;
}

function phaseHeader(title: string): PromptSegment {
  return {
    kind: 'say',
    speaker: 'assistant',
    text: `--- ${title} ---`
  };
}

export function createOnboardingScript(sessionId: string, repoRoot: string): PromptScript {
  const [visionExampleA, visionExampleB] = pickTwo(VISION_EXAMPLES);
  const [timelineExampleA, timelineExampleB] = pickTwo(TIMELINE_EXAMPLES);
  const [qualityExampleA, qualityExampleB] = pickTwo(QUALITY_EXAMPLES);
  const [teamExampleA, teamExampleB] = pickTwo(TEAM_EXAMPLES);
  const [experienceExampleA, experienceExampleB] = pickTwo(EXPERIENCE_EXAMPLES);
  const [budgetExampleA, budgetExampleB] = pickTwo(BUDGET_EXAMPLES);
  const [deploymentExampleA, deploymentExampleB] = pickTwo(DEPLOYMENT_EXAMPLES);
  const [securityExampleA, securityExampleB] = pickTwo(SECURITY_EXAMPLES);
  const [scaleExampleA, scaleExampleB] = pickTwo(SCALE_EXAMPLES);

  return {
    name: 'onboarding',
    sessionId,
    repoRoot,
    segments: [
      phaseHeader('Phase 1 · Context Hook + Vision'),
      {
        kind: 'say',
        speaker: 'assistant',
        text: `I'm your DroidForge architect. Let me scan your repo so I can tailor everything to the work-in-progress you already have.`
      },
      {
        kind: 'tool',
        name: 'smart_scan',
        input: { repoRoot: { literal: repoRoot } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Review the SMART_SCAN findings and share two or three quick "Maybe you're building..." guesses. Use the repo's own language so the user can confirm or redirect fast.`
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Now invite the user to paint the full picture. Ask: "Tell me about your project. What are you building, who's it for, and what's your situation?" Keep it conversational and offer two rotating examples such as "${visionExampleA}" or "${visionExampleB}".`
      },
      {
        kind: 'input',
        id: 'project-vision',
        label: 'Project vision, audience, and situation',
        placeholder: `Example: ${visionExampleA}`
      },
      {
        kind: 'tool',
        name: 'record_project_goal',
        input: {
          repoRoot: { literal: repoRoot },
          description: { fromInput: 'project-vision' }
        }
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: {
          repoRoot: { literal: repoRoot },
          projectVision: { fromInput: 'project-vision' }
        }
      },
      {
        kind: 'tool',
        name: 'get_onboarding_progress',
        input: { repoRoot: { literal: repoRoot } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Offer a tailored follow-up that locks in who this is for. Mirror their own wording and ask one clarifying question that can capture target audience and primary use patterns. Keep it a single conversational question.`
      },
      {
        kind: 'input',
        id: 'audience-clarifier',
        label: 'Clarify audience and usage context'
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: {
          repoRoot: { literal: repoRoot },
          targetAudience: { fromInput: 'audience-clarifier' }
        }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Ask one more mini-brainstorm question about standout goals or constraints (platform, polish moments, or anything they're obsessing over). Make it specific to what they just said.`
      },
      {
        kind: 'input',
        id: 'vision-followup',
        label: 'Standout goals or constraints'
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Mirror the vision back in two or three bullet points using their own phrases. End with "Did I miss anything big?" before moving on.`
      },
      {
        kind: 'input',
        id: 'vision-mirror-feedback',
        label: 'Corrections or additions to the mirrored vision',
        placeholder: 'Optional: add anything we missed'
      },
      phaseHeader('Phase 2 · Core 6 Checklist'),
      {
        kind: 'tool',
        name: 'get_onboarding_progress',
        input: { repoRoot: { literal: repoRoot } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Explain the six-item checklist (vision, audience, timeline, quality vs speed, team size, experience). Show which ones are already locked by marking them with a checkmark and highlight the ones still open. Only ask about one missing item at a time and confirm any inferences before logging them with record_onboarding_data.`
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `If timeline is still open, ask about launch windows or critical dates. Provide two quick examples such as "${timelineExampleA}" or "${timelineExampleB}".`
      },
      {
        kind: 'input',
        id: 'timeline-response',
        label: 'Timeline constraints',
        placeholder: timelineExampleA
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: {
          repoRoot: { literal: repoRoot },
          timelineConstraints: { fromInput: 'timeline-response' }
        }
      },
      {
        kind: 'tool',
        name: 'get_onboarding_progress',
        input: { repoRoot: { literal: repoRoot } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `If quality vs speed is still missing, frame the trade-off using their context. Offer two examples like "${qualityExampleA}" or "${qualityExampleB}".`
      },
      {
        kind: 'input',
        id: 'quality-speed-response',
        label: 'Quality vs speed preference',
        placeholder: qualityExampleA
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: {
          repoRoot: { literal: repoRoot },
          qualityVsSpeed: { fromInput: 'quality-speed-response' }
        }
      },
      {
        kind: 'tool',
        name: 'get_onboarding_progress',
        input: { repoRoot: { literal: repoRoot } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `If team size is open, confirm who is actually building this. Use two examples like "${teamExampleA}" or "${teamExampleB}" and log their confirmation.`
      },
      {
        kind: 'input',
        id: 'team-size-response',
        label: 'Team size and collaborators',
        placeholder: teamExampleA
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: {
          repoRoot: { literal: repoRoot },
          teamSize: { fromInput: 'team-size-response' }
        }
      },
      {
        kind: 'tool',
        name: 'get_onboarding_progress',
        input: { repoRoot: { literal: repoRoot } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `If experience level is still missing, ask how comfortable they are with the stack. Examples: "${experienceExampleA}" or "${experienceExampleB}".`
      },
      {
        kind: 'input',
        id: 'experience-response',
        label: 'Experience level',
        placeholder: experienceExampleA
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: {
          repoRoot: { literal: repoRoot },
          experienceLevel: { fromInput: 'experience-response' }
        }
      },
      {
        kind: 'tool',
        name: 'get_onboarding_progress',
        input: { repoRoot: { literal: repoRoot } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `If any of the Core 6 are still missing, continue the checklist loop: call out what remains, ask a single conversational question with exactly two examples, and log the answer immediately. Do not proceed until all six are confirmed. Once complete, mirror the core discoveries back and confirm before continuing.`
      },
      phaseHeader('Phase 3 · Methodology Recommendation'),
      {
        kind: 'tool',
        name: 'get_onboarding_progress',
        input: { repoRoot: { literal: repoRoot } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Now that the Core 6 are locked, synthesize what you heard. Recommend three methodologies with explicit "because you said..." explanations tied to their own language. After the three tailored recommendations, present the Top 6 catalog customized to their situation, then mention that the full catalog is available on request.`
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: buildMethodologyCatalog()
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Invite them to choose by number, name, or delegation ("you decide"). If they delegate, confirm the choice back using their context before calling select_methodology.`
      },
      {
        kind: 'input',
        id: 'methodology-choice',
        label: 'Preferred methodology (number, name, or delegation statement)',
        placeholder: 'Example: 2 or "Test-Driven Development" or "you decide"'
      },
      {
        kind: 'tool',
        name: 'select_methodology',
        input: {
          repoRoot: { literal: repoRoot },
          choice: { fromInput: 'methodology-choice' },
          otherText: { fromInput: 'methodology-choice' }
        }
      },
      phaseHeader('Phase 4 · Delivery Wrap-up'),
      {
        kind: 'tool',
        name: 'get_onboarding_progress',
        input: { repoRoot: { literal: repoRoot } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Resume the checklist for the last four delivery items. Frame each question in light of the chosen methodology and keep using two examples to speed up answers. Log each response immediately with record_onboarding_data.`
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Ask about budget constraints with examples like "${budgetExampleA}" or "${budgetExampleB}".`
      },
      {
        kind: 'input',
        id: 'budget-response',
        label: 'Budget constraints',
        placeholder: budgetExampleA
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: {
          repoRoot: { literal: repoRoot },
          budgetConstraints: { fromInput: 'budget-response' }
        }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Ask how they want to deploy given the methodology, with examples like "${deploymentExampleA}" or "${deploymentExampleB}".`
      },
      {
        kind: 'input',
        id: 'deployment-response',
        label: 'Deployment and scale preferences',
        placeholder: deploymentExampleA
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: {
          repoRoot: { literal: repoRoot },
          deploymentRequirements: { fromInput: 'deployment-response' }
        }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Ask about security or compliance guardrails, offering examples like "${securityExampleA}" or "${securityExampleB}".`
      },
      {
        kind: 'input',
        id: 'security-response',
        label: 'Security and compliance requirements',
        placeholder: securityExampleA
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: {
          repoRoot: { literal: repoRoot },
          securityRequirements: { fromInput: 'security-response' }
        }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Ask about scalability expectations or load, using examples like "${scaleExampleA}" or "${scaleExampleB}".`
      },
      {
        kind: 'input',
        id: 'scale-response',
        label: 'Deployment scale expectations',
        placeholder: scaleExampleA
      },
      {
        kind: 'tool',
        name: 'record_onboarding_data',
        input: {
          repoRoot: { literal: repoRoot },
          scalabilityNeeds: { fromInput: 'scale-response' }
        }
      },
      {
        kind: 'tool',
        name: 'get_onboarding_progress',
        input: { repoRoot: { literal: repoRoot } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `If any delivery items are still missing, keep looping: call out what remains, ask a single conversational question with two examples, and log the response. Once all ten data points are captured, recap everything (vision through security) and ask for final corrections before forging.`
      },
      phaseHeader('Phase 5 · Personalized Roster Reveal'),
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Confirm all ten data points are captured and remind the user they'll need to restart the droid CLI after forging to load the new commands.`
      },
      {
        kind: 'tool',
        name: 'recommend_droids',
        input: { repoRoot: { literal: repoRoot } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Introduce each recommended droid in first person, two sentences max, reusing the user's phrases (audience, constraints, methodology tie-ins). Mention the command slug (df-<role>) once per introduction and connect their remit back to the methodology.`
      },
      {
        kind: 'input',
        id: 'custom-droids',
        label: 'Optional custom specialists (one per line)',
        helper: 'Example: df-ml-advisor — keeps our HIPAA safeguards aligned with ${scaleExampleA.toLowerCase()}'
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Confirm the roster (including any custom additions) and proceed to forge once the user agrees.`
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
        text: `Close with a "We heard you" recap that links each roster role back to the ten discovery data points. Remind them again to restart their CLI so the df-* commands load, and outline the first next step they can try.`
      },
      {
        kind: 'summary',
        title: 'Next steps with your forged roster',
        lines: [
          'Restart your CLI session so the new df-* commands register.',
          'Review the personalized roster intros and handbook we just generated.',
          'Invoke a specialist with /df-<role> once you are ready to start.',
          'Use /forge-task when you want the orchestrator to triage work.',
          'Need to reset later? Run /forge-removeall to clear the roster.'
        ]
      }
    ]
  };
}
