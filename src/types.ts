import { DroidSpec } from './orchestrator/droidPlanner';
import { ClaimConflict } from './orchestrator/fileClaims';

export type Mode = 'new-project' | 'feature' | 'action' | 'maintenance';
export type Persona = 'vibe' | 'pragmatic' | 'pro';
export type AutonomyLevel = 'L1' | 'L2' | 'L3';

export interface ProjectBrief {
  version: number;
  mode: Mode;
  persona: Persona;
  autonomy: AutonomyLevel;
  intent: {
    goal: string;
    context: string;
    constraints: string[];
  };
  domain: {
    type: string;
    stack: string[];
  };
  preferences: {
    testingStyle: string;
    docStyle: string;
    toolWidening: string;
  };
  signals: {
    frameworks: string[];
    scripts: string[];
    prdPaths: string[];
  };
  analysis?: {
    domain: string;
    complexity: 'simple' | 'medium' | 'complex';
    technicalLevel: 'beginner' | 'intermediate' | 'expert';
    userGoal: string;
    requirements: string[];
    domainSpecific: string[];
  };
}

export interface PRDContent {
  vision: string;
  features: string[];
  acceptanceCriteria: string[];
}

export interface DroidPlan {
  brief: ProjectBrief;
  signals: {
    frameworks: string[];
    prdPaths: string[];
    testConfigs: string[];
  };
  prdContent: PRDContent | null;
  scripts: { 
    files: string[];
    npmScripts: Array<{name: string; command: string; path: string}>;
  };
}

/**
 * Signals type for detection results
 */
export interface Signals {
  frameworks: string[];
  prdPaths: string[];
  testConfigs: string[];
}

/**
 * Options for synthesizing droids, including autonomy and dry-run mode.
 */
export interface SynthesisOptions {
  signals?: Signals;
  scripts?: {
    files: string[];
    npmScripts: Array<{name: string; command: string; path: string}>;
  };
  addSingleScript?: string;
  mode?: 'reanalyze' | 'fresh';
  plan: DroidPlan;
  dryRun: boolean;
}

export type { ProjectBrief as default };

export type ChangeType = 'add' | 'retire' | 'merge' | 'refresh-proof' | 'narrow-tools' | 'update-scope';

export interface DroidChange {
  type: ChangeType;
  droidName: string;
  reason: string;
  details: Record<string, any>;
  userModified: boolean;
}

export interface ReanalysisReport {
  timestamp: string;
  changes: DroidChange[];
  existingDroids: ExistingDroid[];
  newSpecs: DroidSpec[];
  conflicts: ClaimConflict[];
}

export interface ExistingDroid {
  name: string;
  filePath: string;
  frontmatter: {
    name: string;
    tools: string[];
    scope: string[];
    procedure: string[];
    proof: string[];
    outputSchema: any;
    lastReviewed?: string;
  };
  body: string;
  userModified: boolean;
}

