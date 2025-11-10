import type { ExecutionPlan, ExecutionStatus, NodeSchedule, PollSnapshot } from './execution/manager.js';
import type { DroidManifest, PRDContent, OnboardingData } from '../types.js';

export type { ExecutionPlan, ExecutionStatus, NodeSchedule, PollSnapshot } from './execution/manager.js';

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
  scanComputedAt?: string;
  scanSignals?: string[];
  scanHints?: string[];
  scanPrimaryLanguage?: string | null;
  description?: string;
  // Extended onboarding data per spec
  onboarding: OnboardingData;
  methodology?: string;
  methodologyConfirmed?: boolean;
  selectedDroids?: string[];
  customDroids?: CustomDroidSeed[];
}

export interface ToolContext {
  sessionId?: string;
  repoRoot: string;
}

export interface SmartScanInput extends ToolContext {
  forceRescan?: boolean;
}

export interface SmartScanOutput {
  sessionId: string;
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

export interface RecordOnboardingDataInput extends ToolContext {
  onboardingData?: OnboardingData;
  projectVision?: string;
  targetAudience?: string;
  timelineConstraints?: string;
  qualityVsSpeed?: string;
  teamSize?: string;
  experienceLevel?: string;
  budgetConstraints?: string;
  deploymentRequirements?: string;
  securityRequirements?: string;
  scalabilityNeeds?: string;
  inferred?: Record<string, string>;
}

export interface RecordOnboardingDataOutput {
  saved: (keyof RecordOnboardingDataInput)[];
}

export interface GetOnboardingProgressInput extends ToolContext {}

export interface GetOnboardingProgressOutput {
  collected: Record<string, boolean>;
  missing: string[];
  collectedCount: number;
  complete: boolean;
}

export type MethodologyChoice =
  | 'agile'
  | 'tdd'
  | 'bdd'
  | 'waterfall'
  | 'kanban'
  | 'lean'
  | 'ddd'
  | 'devops'
  | 'rapid'
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
  introText?: string;
  coverageRecap?: string;
}

export interface RecommendDroidsInput extends ToolContext {}

export interface ForgeRosterInput extends ToolContext {
  selected?: Array<{
    id: string;
    label: string;
    abilities: string[];
    goal: string;
  }>;
  custom?: CustomDroidSeed[];
  customInput?: string;
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
  roster?: string[];
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
  confirm?: string | boolean;
  confirmationString?: string;
  keepGuide?: string | boolean;
}

export interface CleanupRepoPreview {
  droids: Array<{
    id: string;
    uuid: string;
    displayName: string;
    purpose: string;
  }>;
  filesToRemove: string[];
  droidCount: number;
  fileCount: number;
}

export interface CleanupRepoOutput {
  removed: string[];
  preview?: CleanupRepoPreview;
  error?: {
    code: 'CONFIRMATION_REQUIRED' | 'CONFIRMATION_MISMATCH';
    message: string;
    expected?: string;
    received?: string;
  };
  message?: string;
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
  executionId?: string;
}

export interface PlanExecutionInput extends ToolContext {
  executionId?: string;
  plan: ExecutionPlan;
}

export interface PlanExecutionOutput {
  executionId: string;
  status: ExecutionStatus;
}

export interface StartExecutionInput extends ToolContext {
  executionId: string;
}

export interface StartExecutionOutput {
  executionId: string;
  status: ExecutionStatus;
}

export interface PollExecutionInput extends ToolContext {
  executionId: string;
}

export interface PollExecutionOutput extends PollSnapshot {}

export interface PauseExecutionInput extends ToolContext {
  executionId: string;
}

export interface PauseExecutionOutput {
  executionId: string;
  status: ExecutionStatus;
}

export interface ResumeExecutionInput extends ToolContext {
  executionId: string;
}

export interface ResumeExecutionOutput {
  executionId: string;
  status: ExecutionStatus;
}

export interface AbortExecutionInput extends ToolContext {
  executionId: string;
}

export interface AbortExecutionOutput {
  executionId: string;
  status: ExecutionStatus;
}

export interface MergeExecutionInput extends ToolContext {
  executionId: string;
}

export interface MergeExecutionOutput {
  executionId: string;
  status: ExecutionStatus;
}

export interface NextExecutionTaskInput extends ToolContext {
  executionId: string;
}

export interface NextExecutionTaskOutput {
  executionId: string;
  task: NodeSchedule | null;
}

export interface CompleteExecutionTaskInput extends ToolContext {
  executionId: string;
  nodeId: string;
  outcome: 'succeeded' | 'failed';
  detail?: Record<string, unknown>;
}

export interface CompleteExecutionTaskOutput {
  executionId: string;
  status: ExecutionStatus;
}

export interface ExecutionSummary {
  executionId: string;
  status: ExecutionStatus;
  createdAt: string;
  lastUpdated: string;
  requestCount: number;
}

export interface ListExecutionsInput extends ToolContext {}

export interface ListExecutionsOutput {
  executions: ExecutionSummary[];
}

export interface RouteRequestOutput {
  acknowledged: boolean;
  routedTo: string;
  executionId?: string;
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
