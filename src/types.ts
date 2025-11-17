export interface PRDContent {
  vision: string;
  features: string[];
  acceptanceCriteria: string[];
}

export interface ScriptInventory {
  files: string[];
  npmScripts: Array<{ name: string; command: string; path: string }>;
}

export interface DroidDefinition {
  id: string;
  uuid?: string;
  version?: string;
  displayName: string;
  purpose: string;
  abilities: string[];
  tools: Array<{ type: string; value?: string; paths?: string[] }>;
  createdAt: string;
  methodology: string | null;
  owner: string;
}

export interface DroidManifestEntry {
  id: string;
  role: string;
  status: 'active' | 'inactive';
  description?: string;
}

export interface DroidManifest {
  methodology: string | null;
  createdAt: string;
  updatedAt: string;
  primaryCommand: string;
  droids: DroidManifestEntry[];
  customDroids: DroidManifestEntry[];
  snapshots: Array<{ id: string; label?: string; createdAt: string }>;
}

export interface RequiredDataPoint {
  value: string | null;
  confidence: number;
  source: string;
}

export interface OnboardingData {
  // Nested model used by new onboarding flow and AI parsers
  requiredData: Record<string, RequiredDataPoint>;
  collectionMetadata: Record<string, unknown>;
  methodology: Record<string, unknown>;
  team: Record<string, unknown>;

  // Legacy flat fields kept for compatibility during migration
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
  aiRecommendations?: string[];
  inferredData?: Record<string, string>;
}
