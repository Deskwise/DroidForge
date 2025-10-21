import { isMatch } from 'micromatch';
import { globby } from 'globby';

export interface FileClaim {
  droidName: string;
  patterns: string[];
}

export interface ClaimConflict {
  droid1: string;
  droid2: string;
  pattern: string;
}

export interface ValidationResult {
  valid: boolean;
  conflicts: ClaimConflict[];
}

export async function validateClaims(claims: FileClaim[], cwd?: string): Promise<ValidationResult> {
  const conflicts: ClaimConflict[] = [];
  const root = cwd || process.cwd();
  
  // Get all actual files in the repository
  let repoFiles: string[] = [];
  try {
    repoFiles = await globby(['**/*'], { 
      cwd: root, 
      gitignore: true,
      dot: true,
      onlyFiles: true
    });
  } catch (error) {
    // If we can't read files, fall back to pattern comparison
    console.warn('Could not expand files for claims validation, using pattern comparison');
    return validateClaimsWithPatterns(claims);
  }
  
  // Build a map of which files each claim matches
  const claimFiles = new Map<string, Set<string>>();
  
  for (const claim of claims) {
    const matchedFiles = new Set<string>();
    for (const file of repoFiles) {
      for (const pattern of claim.patterns) {
        if (isMatch(file, pattern)) {
          matchedFiles.add(file);
          break;
        }
      }
    }
    claimFiles.set(claim.droidName, matchedFiles);
  }
  
  // Find overlaps: when two claims match the same file
  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      const claim1 = claims[i];
      const claim2 = claims[j];
      const files1 = claimFiles.get(claim1.droidName) || new Set();
      const files2 = claimFiles.get(claim2.droidName) || new Set();
      
      // Find intersection
      const overlap = [...files1].filter(f => files2.has(f));
      
      if (overlap.length > 0) {
        conflicts.push({
          droid1: claim1.droidName,
          droid2: claim2.droidName,
          pattern: `${overlap.length} file(s): ${overlap.slice(0, 3).join(', ')}${overlap.length > 3 ? '...' : ''}`
        });
      }
    }
  }
  
  return {
    valid: conflicts.length === 0,
    conflicts
  };
}

// Fallback for when we can't read actual files
function validateClaimsWithPatterns(claims: FileClaim[]): ValidationResult {
  const conflicts: ClaimConflict[] = [];
  
  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      const claim1 = claims[i];
      const claim2 = claims[j];
      
      for (const pattern1 of claim1.patterns) {
        for (const pattern2 of claim2.patterns) {
          if (pattern1 === pattern2) {
            conflicts.push({
              droid1: claim1.droidName,
              droid2: claim2.droidName,
              pattern: `Identical pattern: ${pattern1}`
            });
          }
        }
      }
    }
  }
  
  return {
    valid: conflicts.length === 0,
    conflicts
  };
}

export function generateScopePatterns(role: string, frameworks: string[], scriptPath?: string): string[] {
  // Script droids get only their specific script
  if (scriptPath) {
    return [scriptPath];
  }
  
  // Generic droids get role-specific patterns
  const patterns: string[] = [];
  
  switch (role) {
    case 'planner':
      patterns.push('docs/**/*.md', 'README.md', '.factory/**');
      break;
      
    case 'dev':
      patterns.push('src/**/*.{ts,js,tsx,jsx,py,go,rs}', 'lib/**/*.{ts,js,tsx,jsx,py,go,rs}');
      break;
      
    case 'reviewer':
      patterns.push('src/**/*.{ts,js,py,tsx,jsx,vue,go,rs}', 'lib/**/*.{ts,js,py,tsx,jsx,vue,go,rs}');
      break;
      
    case 'qa':
      patterns.push('**/*.test.*', '**/*.spec.*', 'tests/**', '__tests__/**', 'test/**');
      break;
      
    case 'auditor':
      patterns.push('config/**', '*.config.*', '.*rc', '.*rc.*', 'package.json', 'requirements.txt', 'Cargo.toml', 'go.mod');
      break;
      
    // Contextual droids
    case 'ui-ux':
      patterns.push('src/components/**', 'src/pages/**', 'src/**/*.{css,scss,sass,less}', 'src/**/*.{tsx,jsx,vue}');
      break;
      
    case 'api':
      patterns.push('src/api/**', 'src/routes/**', 'src/controllers/**', 'src/handlers/**', 'src/services/**');
      break;
      
    case 'domain-specialist':
      patterns.push('src/**', 'lib/**', 'docs/prd/**');
      break;
      
    case 'qa-e2e':
      patterns.push('e2e/**', 'tests/e2e/**', '**/*.e2e.*', 'cypress/**', 'playwright/**');
      break;
      
    case 'animation-specialist':
      patterns.push('src/animations/**', 'src/motion/**', 'src/**/*.animation.*', 'src/**/*.motion.*');
      break;
      
    default:
      patterns.push('src/**', 'docs/**');
      break;
  }
  
  return patterns;
}
