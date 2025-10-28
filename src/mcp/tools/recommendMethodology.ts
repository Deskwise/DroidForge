import type { SessionStore } from '../sessionStore.js';
import type { ToolDefinition, OnboardingSession } from '../types.js';
import { recommendMethodologies } from '../prompts/methodologyRecommendations.js';

interface RecommendMethodologyInput {
  repoRoot: string;
  sessionId?: string;
}

interface RecommendMethodologyOutput {
  recommendations: string;
}

interface Deps {
  sessionStore: SessionStore;
}

export function createRecommendMethodologyTool(deps: Deps): ToolDefinition<RecommendMethodologyInput, RecommendMethodologyOutput> {
  return {
    name: 'recommend_methodology',
    description: 'Analyzes the project description and recommends top 3 methodologies.',
    handler: async input => {
      const { repoRoot, sessionId } = input;
      
      // Load session to get project description
      let session: OnboardingSession | null = null;
      if (sessionId) {
        session = await deps.sessionStore.load(repoRoot, sessionId);
      } else {
        session = await deps.sessionStore.loadActive(repoRoot);
      }
      
      if (!session || !session.description) {
        // No description yet - return generic recommendations
        return {
          recommendations: `Here are all 10 development methodologies I support. Each one shapes how your specialist droids will work together:`
        };
      }
      
      // Generate smart recommendations based on project description
      const recs = recommendMethodologies(session.description);
      const recommendationText = `For your project "${session.description}", I recommend:

${recs.map((rec, idx) => `${idx + 1}. ${rec.title}
   Why: ${rec.reason}`).join('\n\n')}

You'll see all 10 methodologies to choose from next.`;
      
      return { recommendations: recommendationText };
    }
  };
}
