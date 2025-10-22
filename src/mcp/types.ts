import type { DroidDefinition, DroidManifest, PRDContent } from '../types.js';

export type OnboardingState =
  | 'collecting-goal'
  | 'methodology'
  | 'roster'
  | 'forging'
  | 'complete'
  | 'aborted';

export interface ScanSnapshot {
  summary: string;
  frameworks: string[];
  testConfigs: string[];
  prdPaths: string[];
  scripts: string[];
  prdContent: PRDContent | null;
}

export interface OnboardingSession {
  sessionId: string;
  repoRoot: string;
  createdAt: string;
  state: OnboardingState;
  scan?: ScanSnapshot;
  description?: string;
  methodology?: string;
  selectedDroids?: string[];
  customDroids?: CustomDroidSeed[];
}

export interface ToolContext {
  sessionId?: string;
  repoRoot: string;
}

export interface SmartScanInput extends ToolContext {}

export interface SmartScanOutput {
  summary: string;
  signals: string[];
  primaryLanguage: string | null;
  hints: string[];
  prdFiles: string[];
}

export interface RecordProjectGoalInput extends ToolContext {
  description: string;
}

export interface RecordProjectGoalOutput {
  ack: true;
}

export type MethodologyChoice =
  | 'agile'
  | 'waterfall'
  | 'kanban'
  | 'tdd'
  | 'sdd'
  | 'startup'
  | 'enterprise'
  | 'none'
  | 'other';

export interface SelectMethodologyInput extends ToolContext {
  choice: MethodologyChoice;
  otherText?: string;
}

export interface SelectMethodologyOutput {
  methodology: string;
}

export interface DroidSuggestion {
  id: string;
  label: string;
  summary: string;
  default: boolean;
}

export interface CustomDroidSeed {
  slug: string;
  label: string;
  goal: string;
  abilities: string[];
  description?: string;
}

export interface RecommendDroidsOutput {
  suggestions: DroidSuggestion[];
  mandatory: {
    id: string;
    summary: string;
  };
}

export interface RecommendDroidsInput extends ToolContext {}

export interface ForgeRosterInput extends ToolContext {
  selected: Array<{
    id: string;
    label: string;
    abilities: string[];
    goal: string;
  }>;
  custom?: CustomDroidSeed[];
}

export interface ForgeRosterOutput {
  bootLog: string[];
  outputPaths: string[];
  manifestPath: string;
  manifest: DroidManifest;
}

export interface AddCustomDroidInput extends ToolContext {
  description: string;
}

export interface AddCustomDroidOutput {
  droidId: string;
  manifestPath: string;
  manifest: DroidManifest;
  guideHint: string;
}

export interface GenerateUserGuideInput extends ToolContext {
  roster: string[];
  savePath?: string;
}

export interface GenerateUserGuideOutput {
  markdown: string;
  savePath: string;
}

export interface InstallCommandPayload {
  slug: string;
  type: 'markdown' | 'executable';
  body: string;
  permissions?: number;
}

export interface InstallCommandsInput extends ToolContext {
  commands?: InstallCommandPayload[];
}

export interface InstallCommandsOutput {
  installed: string[];
}

export interface CleanupRepoInput {
  repoRoot: string;
  keepGuide?: boolean;
}

export interface CleanupRepoOutput {
  removed: string[];
}

export interface CreateSnapshotInput {
  repoRoot: string;
  label?: string;
}

export interface CreateSnapshotOutput {
  snapshotId: string;
  paths: string[];
}

export interface RestoreSnapshotInput {
  repoRoot: string;
  snapshotId: string;
}

export interface RestoreSnapshotOutput {
  restored: string[];
}

export interface ListSnapshotsInput {
  repoRoot: string;
}

export interface SnapshotInfo {
  id: string;
  label?: string;
  createdAt: string;
  note?: string;
}

export interface ListSnapshotsOutput {
  snapshots: SnapshotInfo[];
}

export interface FetchLogsInput {
  repoRoot: string;
  limit?: number;
}

export interface LogEntry {
  timestamp: string;
  event: string;
  details?: string;
}

export interface FetchLogsOutput {
  entries: LogEntry[];
}

export interface GetStatusInput {
  repoRoot: string;
}

export interface GetStatusOutput {
  status: 'ready' | 'needs-onboarding' | 'incomplete';
  activeDroids: string[];
  lastRun: string | null;
  methodology: string | null;
}

export interface RouteRequestInput extends ToolContext {
  request: string;
  droidId?: string;
}

export interface RouteRequestOutput {
  acknowledged: boolean;
  routedTo: string;
}

export interface ToolDefinition<I = unknown, O = unknown> {
  name: string;
  description: string;
  handler: (input: I) => Promise<O>;
}

export interface ToolInvocation<I = unknown> {
  name: string;
  input: I;
}
