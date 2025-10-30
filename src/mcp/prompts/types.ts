export type Speaker = 'assistant' | 'system';

export type ResolvableText =
  | string
  | { literal: string }
  | { fromInput: string }
  | { fromChoice: string }
  | { fromTool: string; path?: string }
  | { concat: ResolvableText[] };

export interface SaySegment {
  kind: 'say';
  speaker: Speaker;
  text: ResolvableText;
}

export interface InputSegment {
  kind: 'input';
  id: string;
  label: string;
  placeholder?: string;
  helper?: string;
}

export interface ChoiceOption {
  value: string;
  title: string;
  description?: string;
}

export interface ChoiceSegment {
  kind: 'choice';
  id: string;
  label: string;
  options: ChoiceOption[];
}

export interface ToolSegment {
  kind: 'tool';
  name: string;
  input: Record<string, unknown>;
}

export interface SummarySegment {
  kind: 'summary';
  title: string;
  lines: string[];
}

export type PromptSegment = SaySegment | InputSegment | ChoiceSegment | ToolSegment | SummarySegment;

export interface PromptScript {
  name: string;
  sessionId?: string;
  repoRoot?: string;
  segments: PromptSegment[];
}
