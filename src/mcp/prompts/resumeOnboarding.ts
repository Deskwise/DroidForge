import type { OnboardingState } from '../types.js';
import type { PromptScript } from './types.js';

const STATE_MESSAGES: Record<Exclude<OnboardingState, 'complete' | 'aborted'>, string> = {
  'collecting-goal': 'We paused before capturing your project goal. Let’s pick up right there.',
  methodology: 'You stopped while choosing a methodology. Ready to pick one now?',
  roster: 'We were curating the roster. I’ll show you the suggestions again so you can confirm.',
  forging: 'The forge sequence was in progress. I’ll replay the boot logs so you can confirm everything looks right.'
};

export function createResumeOnboardingScript(sessionId: string, repoRoot: string, state: OnboardingState): PromptScript {
  const message = state in STATE_MESSAGES ? STATE_MESSAGES[state as keyof typeof STATE_MESSAGES] : 'Let’s resume where we left off.';
  return {
    name: 'resume_onboarding',
    sessionId,
    repoRoot,
    segments: [
      { kind: 'say', speaker: 'assistant', text: message },
      { kind: 'tool', name: 'get_status', input: { repoRoot } },
      { kind: 'say', speaker: 'assistant', text: 'When you are ready, rerun `/forge-start` to continue the guided flow.' }
    ]
  };
}
