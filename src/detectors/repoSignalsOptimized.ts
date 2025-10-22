import { scanRepo } from './repoSignals.js';
import type { PRDContent } from '../types.js';

export async function scanRepoOptimized(root: string): Promise<{
  prdPaths: string[];
  frameworks: string[];
  testConfigs: string[];
  prdContent: PRDContent | null;
}> {
  return scanRepo(root);
}
