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
