import { FileClaim, ClaimConflict } from '../orchestrator/fileClaims.js';
import kleur from 'kleur';

export interface ConflictResolutionReport {
  conflicts: ClaimConflict[];
  resolutions: ConflictResolution[];
  warnings: string[];
}

export interface ConflictResolution {
  conflict: ClaimConflict;
  strategy: 'merge' | 'prioritize' | 'split' | 'manual';
  resolution: string;
  confidence: number;
}

export async function resolveConflicts(conflicts: ClaimConflict[]): Promise<ConflictResolutionReport> {
  const resolutions: ConflictResolution[] = [];
  const warnings: string[] = [];

  for (const conflict of conflicts) {
    const resolution = await analyzeConflict(conflict);
    resolutions.push(resolution);

    if (resolution.confidence < 0.7) {
      warnings.push(`  Low confidence resolution for ${conflict.droid1} vs ${conflict.droid2}: ${resolution.resolution}`);
    }
  }

  return {
    conflicts,
    resolutions,
    warnings
  };
}

async function analyzeConflict(conflict: ClaimConflict): Promise<ConflictResolution> {
  const { droid1, droid2, pattern } = conflict;

  // Define resolution strategies based on droid types and patterns
  const strategies = [
    {
      strategy: 'merge' as const,
      priority: 1,
      condition: (d1: string, d2: string) =>
        (isGenericDroid(d1) && isGenericDroid(d2)) ||
        (isScriptDroid(d1) && isScriptDroid(d2)),
      getResolution: (d1: string, d2: string) => `Merge ${d1} and ${d2} into a unified droid`,
      confidence: 0.9
    },
    {
      strategy: 'prioritize' as const,
      priority: 2,
      condition: (d1: string, d2: string) =>
        (isDevDroid(d1) && isReviewerDroid(d2)) ||
        (isGenericDroid(d1) && isContextualDroid(d2)),
      getResolution: (d1: string, d2: string) => `Prioritize ${d1} over ${d2} (generic  specialized)`,
      confidence: 0.8
    },
    {
      strategy: 'split' as const,
      priority: 3,
      condition: (d1: string, d2: string) =>
        hasDifferentDomains(d1, d2, pattern),
      getResolution: (d1: string, d2: string) => `Split scope: ${d1} handles primary, ${d2} handles secondary`,
      confidence: 0.7
    },
    {
      strategy: 'manual' as const,
      priority: 4,
      condition: () => true, // Always available as fallback
      getResolution: (d1: string, d2: string) => `Manual review required: ${d1} vs ${d2} conflict on ${pattern}`,
      confidence: 0.5
    }
  ];

  // Find the best matching strategy
  const applicableStrategies = strategies.filter(s => s.condition(droid1, droid2));
  applicableStrategies.sort((a, b) => a.priority - b.priority);

  const bestStrategy = applicableStrategies[0];

  return {
    conflict,
    strategy: bestStrategy.strategy,
    resolution: bestStrategy.getResolution(droid1, droid2),
    confidence: bestStrategy.confidence
  };
}

// Helper functions for droid type detection
function isGenericDroid(name: string): boolean {
  const genericDroids = ['planner', 'dev', 'reviewer', 'qa', 'auditor'];
  return genericDroids.includes(name.toLowerCase());
}

function isScriptDroid(name: string): boolean {
  return name.toLowerCase().startsWith('script-') ||
         name.toLowerCase().startsWith('npm-');
}

function isDevDroid(name: string): boolean {
  return name.toLowerCase() === 'dev';
}

function isReviewerDroid(name: string): boolean {
  return name.toLowerCase() === 'reviewer';
}

function isContextualDroid(name: string): boolean {
  const contextualDroids = [
    'ui-ux', 'api', 'domain-specialist', 'explainer', 'qa-e2e',
    'animation-specialist', 'security-specialist'
  ];
  return contextualDroids.includes(name.toLowerCase());
}

function hasDifferentDomains(droid1: string, droid2: string, pattern: string): boolean {
  // Different patterns might indicate different domains
  const fileExtensions = pattern.match(/\.[a-z]+$/g);
  if (!fileExtensions) return false;

  const domains = {
    'frontend': ['jsx', 'tsx', 'vue', 'svelte', 'html', 'css', 'scss', 'less'],
    'backend': ['js', 'ts', 'java', 'py', 'go', 'rs', 'php', 'rb'],
    'config': ['json', 'yaml', 'yml', 'toml', 'ini', 'env', 'rc'],
    'test': ['test', 'spec', 'e2e', 'cy', 'playwright'],
    'docs': ['md', 'txt', 'rst', 'adoc']
  };

  const detectedDomains = new Set<string>();

  fileExtensions.forEach(ext => {
    for (const [domain, extensions] of Object.entries(domains)) {
      if (extensions.includes(ext)) {
        detectedDomains.add(domain);
      }
    }
  });

  return detectedDomains.size > 1;
}

export function generateConflictReport(resolution: ConflictResolutionReport): string {
  const { conflicts, resolutions, warnings } = resolution;

  let report = '';

  if (conflicts.length > 0) {
    report += kleur.red(`\n🔥 Found ${conflicts.length} file claim conflict(s):\n`);

    conflicts.forEach((conflict, index) => {
      report += `${index + 1}. ${kleur.yellow(conflict.droid1)} ↔ ${kleur.yellow(conflict.droid2)}\n`;
      report += `   Pattern: ${conflict.pattern}\n`;

      const resolution = resolutions.find(r => r.conflict === conflict);
      if (resolution) {
        const icon = resolution.strategy === 'merge' ? '' :
          resolution.strategy === 'prioritize' ? '👑' :
            resolution.strategy === 'split' ? '✂' : '❓';
        report += `   ${icon} ${resolution.resolution} (confidence: ${Math.round(resolution.confidence * 100)}%)\n`;
      }
      report += '\n';
    });
  } else {
    report += kleur.green('\n No file claim conflicts detected\n');
  }

  if (warnings.length > 0) {
    report += kleur.yellow('\n Warnings:\n');
    warnings.forEach(warning => {
      report += `• ${warning}\n`;
    });
  }

  return report;
}

export function suggestScopeAdjustments(resolution: ConflictResolutionReport): string[] {
  const suggestions: string[] = [];

  for (const conflictResolution of resolution.resolutions) {
    const { conflict, strategy, confidence } = conflictResolution;

    switch (strategy) {
    case 'merge':
      suggestions.push(`Consider creating a merged droid: "${conflict.droid1}-${conflict.droid2}"`);
      suggestions.push('Define complementary scopes for each droid\'s specialty');
      break;

    case 'prioritize':
      suggestions.push(`Make ${conflict.droid1} read-only and ${conflict.droid2} handle modifications`);
      suggestions.push('Add explicit handoff procedures between droids');
      break;

    case 'split':
      suggestions.push(`Refine patterns to be more specific: ${conflict.pattern}`);
      suggestions.push(`Consider file-based scoping: "${conflict.droid1}/src" vs "${conflict.droid2}/tests"`);
      break;

    case 'manual':
      suggestions.push('Review the overlapping responsibilities carefully');
      suggestions.push('Consider if both droids are necessary or if one can be eliminated');
      suggestions.push('Define clear handoff points and communication protocols');
      break;
    }

    if (confidence < 0.7) {
      suggestions.push(' Low confidence - manually verify this resolution');
    }
  }

  return suggestions;
}

export function validateClaimPatterns(claims: FileClaim[]): string[] {
  const issues: string[] = [];

  // Check for duplicate patterns
  const patternCounts = new Map<string, number>();
  for (const claim of claims) {
    for (const pattern of claim.patterns) {
      patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
    }
  }

  for (const [pattern, count] of patternCounts.entries()) {
    if (count > 3) {
      issues.push(` Pattern "${pattern}" is claimed by ${count} droids - consider splitting or merging`);
    }
  }

  // Check for overly broad patterns
  const broadPatterns = ['**/*', '*.*', 'src/**', '.*'];
  for (const claim of claims) {
    for (const pattern of claim.patterns) {
      if (broadPatterns.includes(pattern)) {
        issues.push(` Very broad pattern "${pattern}" claimed by ${claim.droidName} - consider more specific scope`);
      }
    }
  }

  // Check for potentially unsafe patterns
  const unsafePatterns = ['**/node_modules/**', '**/.git/**', '**/.vscode/**'];
  for (const claim of claims) {
    for (const pattern of claim.patterns) {
      if (unsafePatterns.some(unsafe => pattern.includes(unsafe))) {
        issues.push(` Potentially unsafe pattern "${pattern}" claimed by ${claim.droidName}`);
      }
    }
  }

  return issues;
}