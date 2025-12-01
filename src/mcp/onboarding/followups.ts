import type { OnboardingSession } from '../types.js';

export interface FollowUpPrompt {
  key: string;
  question: string;
  example: string;
}

export const CONFIDENCE_THRESHOLD = 0.7;

const REQUIRED_FIELDS_ORDER = [
  'projectVision',
  'targetAudience',
  'timelineConstraints',
  'qualityVsSpeed',
  'teamSize',
  'experienceLevel',
  'budgetConstraints',
  'deploymentRequirements',
  'securityRequirements',
  'scalabilityNeeds'
] as const;

export const FOLLOW_UP_METADATA: Record<string, { question: string; example: string }> = {
  projectVision: {
    question: 'What is your project vision? Describe what you\'re building and why.',
    example: 'A React dashboard that helps founders track investor pipeline updates'
  },
  targetAudience: {
    question: 'Who is your target audience?',
    example: 'Startup founders and their teams'
  },
  timelineConstraints: {
    question: 'What are your timeline constraints?',
    example: '3 months to MVP, 6 months to launch'
  },
  qualityVsSpeed: {
    question: 'What matters more: quality or speed?',
    example: 'Quality - we need this to be production-ready'
  },
  teamSize: {
    question: 'What is your team size?',
    example: '2-3 developers'
  },
  experienceLevel: {
    question: 'What is your team\'s experience level?',
    example: 'Senior engineers with 5+ years experience'
  },
  budgetConstraints: {
    question: 'What are your budget constraints?',
    example: 'Moderate budget, can invest in quality tools'
  },
  deploymentRequirements: {
    question: 'What are your deployment requirements?',
    example: 'Cloud deployment, preferably AWS'
  },
  securityRequirements: {
    question: 'What are your security requirements?',
    example: 'High security, SOC 2 compliance needed'
  },
  scalabilityNeeds: {
    question: 'What are your scalability needs?',
    example: 'Need to handle 10k+ concurrent users'
  }
};

/**
 * Determines the next follow-up question based on missing or low-confidence data.
 * Returns null if all required fields have high confidence values.
 */
export function getNextQuestion(session: OnboardingSession): FollowUpPrompt | null {
  const requiredData = session.onboarding?.requiredData ?? {};

  for (const field of REQUIRED_FIELDS_ORDER) {
    const entry = requiredData[field];
    
    // Check if field is missing, null, or has low confidence
    const isMissing = !entry;
    const hasNullValue = entry?.value === null || entry?.value === undefined;
    const hasLowConfidence = entry?.confidence !== undefined && entry.confidence < CONFIDENCE_THRESHOLD;
    
    if (isMissing || hasNullValue || hasLowConfidence) {
      const metadata = FOLLOW_UP_METADATA[field];
      if (!metadata) {
        continue; // Skip if no metadata defined
      }
      
      return {
        key: field,
        question: metadata.question,
        example: metadata.example
      };
    }
  }

  // All fields have high confidence
  return null;
}

