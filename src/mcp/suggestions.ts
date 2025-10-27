import type { DroidSuggestion, OnboardingSession } from './types.js';
import { METHODOLOGY_ROLES } from './generation/methodologyRoles.js';

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

export function buildSuggestions(session: OnboardingSession | null): DroidSuggestion[] {
  const methodology = session?.methodology ?? 'agile';
  const methodologyRole = METHODOLOGY_ROLES[methodology] || METHODOLOGY_ROLES.agile;

  const methodologyLead: DroidSuggestion = {
    id: `df-${methodology}-lead`,
    label: methodologyRole.name,
    summary: methodologyRole.purpose,
    default: true
  };

  return [methodologyLead, ...BASE_SUGGESTIONS];
}
