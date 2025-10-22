import type { DroidSuggestion, OnboardingSession } from './types.js';

const BASE_SUGGESTIONS: DroidSuggestion[] = [
  {
    id: 'df-architect',
    label: 'df-architect',
    summary: 'Keeps the project lean, organized, and scalable.',
    default: true
  },
  {
    id: 'df-tester',
    label: 'df-tester',
    summary: 'Protects quality with targeted regression coverage.',
    default: true
  },
  {
    id: 'df-builder',
    label: 'df-builder',
    summary: 'Automates scaffolding and repetitive implementation.',
    default: true
  },
  {
    id: 'df-doc',
    label: 'df-doc',
    summary: 'Captures progress notes and lightweight documentation.',
    default: true
  },
  {
    id: 'df-analyzer',
    label: 'df-analyzer',
    summary: 'Surfaces performance, tech-debt, and dependency risks early.',
    default: false
  }
];

export function buildSuggestions(_session: OnboardingSession | null): DroidSuggestion[] {
  return BASE_SUGGESTIONS;
}
