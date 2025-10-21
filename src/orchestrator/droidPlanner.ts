import type { DroidPlan, Mode } from '../types.js';
import { generateScopePatterns } from './fileClaims.js';
import { generateProofCommands } from './proofGenerator.js';

/**
 * Specification for a droid to be created.
 *
 * @property tools - Initial/minimal tool set for the droid. Tools start with ['Read'] for
 *                   generic/contextual droids, or ['Read', 'Shell'] for script droids.
 *                   May be widened during synthesis with user approval to include 'Write'
 *                   or additional tools based on autonomy level and preferences.
 */
export interface DroidSpec {
  name: string;
  type: 'generic' | 'script' | 'contextual';
  role: string;
  description: string;
  tools: string[];
  scope: string[];
  procedure: string[];
  proof: string[];
  outputSchema: string;
  scriptPath?: string;
  lastReviewed?: string;
}

interface ContextualDroidDef {
  role: string;
  description: string;
}

/**
 * Helper to build a single-line proof command that captures and evaluates exit codes correctly.
 * Follows the pattern from proofGenerator.ts to avoid split-command $? bugs.
 */
function buildExitCheckedCommand(baseCmd: string): string {
  return `${baseCmd}; ec=$?; echo "Exit code: $ec"; test $ec -eq 0 && echo PASS || echo FAIL`;
}

export function inferContextualDroids(frameworks: string[]): ContextualDroidDef[] {
  const droids: ContextualDroidDef[] = [];
  
  // Frontend frameworks
  if (frameworks.some(f => ['react', 'vue', 'angular', 'svelte', 'frontend'].includes(f.toLowerCase()))) {
    droids.push({
      role: 'ui-ux',
      description: 'UI/UX specialist for frontend components, layouts, and styling'
    });
  }
  
  // Backend frameworks
  if (frameworks.some(f => ['express', 'fastapi', 'django', 'flask', 'nestjs', 'backend', 'api'].includes(f.toLowerCase()))) {
    droids.push({
      role: 'api',
      description: 'API specialist for backend routes, controllers, and services'
    });
  }
  
  // Testing frameworks
  if (frameworks.some(f => ['jest', 'pytest', 'vitest', 'cypress', 'playwright', 'testing'].includes(f.toLowerCase()))) {
    droids.push({
      role: 'qa-e2e',
      description: 'End-to-end testing specialist for integration and E2E tests'
    });
  }
  
  // Animation/motion frameworks
  if (frameworks.some(f => ['framer-motion', 'gsap', 'anime', 'motion'].includes(f.toLowerCase()))) {
    droids.push({
      role: 'animation-specialist',
      description: 'Animation specialist for motion design and interactive animations'
    });
  }
  
  // Always add domain specialist for feature/action modes
  droids.push({
    role: 'domain-specialist',
    description: 'Domain specialist with deep understanding of business logic and requirements'
  });
  
  return droids;
}

/**
 * Create a generic droid spec with minimal tools.
 * Tools start as ['Read'] and may be widened to ['Read', 'Write'] during synthesis
 * based on user approval and autonomy settings.
 */
function createGenericDroidSpec(role: string, mode: Mode, frameworks: string[]): DroidSpec {
  const scope = generateScopePatterns(role, frameworks);
  const outputSchema = `Summary: <1-2 lines>
Results:
- proof: <PASS|FAIL>
Artifacts:
- <files>
Notes:
- <next steps>`;
  
  const procedures: Record<string, string[]> = {
    planner: [
      'Analyze PRD and requirements documents',
      'Draft implementation plan with milestones',
      'Validate plan against constraints',
      'Request approval before execution'
    ],
    dev: [
      'Read relevant context and existing code',
      'Implement changes following coding standards',
      'Run proof commands to verify changes',
      'Report results and request review'
    ],
    reviewer: [
      'Read proposed changes and diffs',
      'Check code against project standards',
      'Identify potential issues or improvements',
      'Provide constructive feedback'
    ],
    qa: [
      'Run test suites and verify outputs',
      'Check coverage and test results',
      'Verify expected artifacts exist',
      'Report pass/fail status with details'
    ],
    auditor: [
      'Scan configuration files for issues',
      'Check security and dependency vulnerabilities',
      'Verify compliance with standards',
      'Report findings and recommendations'
    ]
  };
  
  let proof: string[];
  if (role === 'qa') {
    // Detect which test runner based on frameworks
    if (frameworks.some(f => ['jest', 'vitest', 'testing'].includes(f.toLowerCase()))) {
      proof = [buildExitCheckedCommand('npm test')];
    } else if (frameworks.some(f => ['pytest', 'python'].includes(f.toLowerCase()))) {
      proof = [buildExitCheckedCommand('pytest')];
    } else {
      // Fallback: try npm test first, then pytest
      proof = [buildExitCheckedCommand('npm test || pytest')];
    }
  } else {
    proof = ['echo "No automated proof for this role"'];
  }
  
  return {
    name: role,
    type: 'generic',
    role,
    description: `Generic ${role} droid for ${mode} mode`,
    tools: ['Read'],
    scope,
    procedure: procedures[role] || ['Read context', 'Perform role duties', 'Report results'],
    proof,
    outputSchema,
    lastReviewed: new Date().toISOString()
  };
}

/**
 * Create a contextual droid spec with minimal tools.
 * Tools start as ['Read'] and may be widened to ['Read', 'Write'] during synthesis
 * based on user approval and autonomy settings.
 */
function createContextualDroidSpec(def: ContextualDroidDef, frameworks: string[]): DroidSpec {
  const scope = generateScopePatterns(def.role, frameworks);
  const outputSchema = `Summary: <1-2 lines>
Results:
- changes: <list>
Artifacts:
- <files>
Notes:
- <follow-ups>`;
  
  const procedures: Record<string, string[]> = {
    'ui-ux': [
      'Review UI/UX requirements and designs',
      'Implement or modify components and styles',
      'Verify responsive behavior and accessibility',
      'Report changes and request review'
    ],
    'api': [
      'Review API specifications and requirements',
      'Implement or modify routes and controllers',
      'Verify endpoint functionality',
      'Report changes and integration notes'
    ],
    'domain-specialist': [
      'Analyze business requirements from PRD',
      'Review and implement domain logic',
      'Ensure consistency with domain model',
      'Report implementation and edge cases'
    ],
    'qa-e2e': [
      'Review E2E test requirements',
      'Implement or update E2E test scenarios',
      'Run E2E tests and verify results',
      'Report test coverage and findings'
    ],
    'animation-specialist': [
      'Review animation and motion requirements',
      'Implement animations with performance in mind',
      'Verify smooth playback and timing',
      'Report implementation and optimization notes'
    ]
  };
  
  let proof: string[];
  if (frameworks.some(f => ['testing', 'jest', 'vitest'].includes(f.toLowerCase()))) {
    proof = [buildExitCheckedCommand('npm test')];
  } else if (frameworks.some(f => ['pytest', 'python'].includes(f.toLowerCase()))) {
    proof = [buildExitCheckedCommand('pytest')];
  } else {
    proof = ['echo "Manual verification required"'];
  }
  
  return {
    name: def.role,
    type: 'contextual',
    role: def.role,
    description: def.description,
    tools: ['Read'],
    scope,
    procedure: procedures[def.role] || ['Read context', 'Perform specialist duties', 'Report results'],
    proof,
    outputSchema,
    lastReviewed: new Date().toISOString()
  };
}

/**
 * Create a script droid spec with minimal tools.
 * Tools start as ['Read', 'Shell'] for script execution and may be widened
 * to ['Read', 'Shell', 'Write'] during synthesis based on user approval.
 */
function createScriptDroidSpec(scriptPath: string, frameworks: string[]): DroidSpec {
  let name: string;
  
  if (scriptPath.startsWith('npm:')) {
    // For npm scripts, keep npm-<name> format
    const npmName = scriptPath.replace('npm:', '');
    name = `npm-${npmName}`;
  } else {
    // For file scripts, replace non-alphanumeric with -, collapse repeats
    const baseName = scriptPath
      .replace(/[^a-zA-Z0-9]/g, '-')  // Replace non-alphanumeric with -
      .replace(/-+/g, '-')              // Collapse multiple dashes
      .replace(/^-|-$/g, '')            // Remove leading/trailing dashes
      .toLowerCase();
    name = `script-${baseName}`;
  }
  
  const proof = generateProofCommands(scriptPath, frameworks);
  const outputSchema = `Summary: <status>
Results:
- exitCode: <number>
- artifacts: <list>
Notes:
- <follow-ups>`;
  
  return {
    name,
    type: 'script',
    role: 'script-executor',
    description: `Wraps and executes ${scriptPath} with verification`,
    tools: ['Read', 'Shell'],
    scope: [scriptPath],
    procedure: [
      `Execute ${scriptPath}`,
      'Verify exit code is 0',
      'Check expected artifacts exist',
      'Report status'
    ],
    proof,
    outputSchema,
    scriptPath,
    lastReviewed: new Date().toISOString()
  };
}

export function planDroids(plan: DroidPlan): DroidSpec[] {
  const specs: DroidSpec[] = [];
  const mode = plan.brief.mode;
  const frameworks = plan.signals.frameworks;
  
  // Mode-based logic
  if (mode === 'bootstrap') {
    // Core generic droids
    specs.push(createGenericDroidSpec('planner', mode, frameworks));
    specs.push(createGenericDroidSpec('dev', mode, frameworks));
    specs.push(createGenericDroidSpec('reviewer', mode, frameworks));
    specs.push(createGenericDroidSpec('qa', mode, frameworks));
    specs.push(createGenericDroidSpec('auditor', mode, frameworks));
    
    // Contextual droids based on frameworks
    const contextualDroids = inferContextualDroids(frameworks);
    for (const def of contextualDroids) {
      specs.push(createContextualDroidSpec(def, frameworks));
    }
  } else if (mode === 'feature') {
    // Only contextual droids for feature mode
    const contextualDroids = inferContextualDroids(frameworks);
    for (const def of contextualDroids) {
      specs.push(createContextualDroidSpec(def, frameworks));
    }
  } else if (mode === 'action') {
    // Create scoped droids based on goal keywords
    const goal = plan.brief.intent.goal.toLowerCase();
    
    if (goal.includes('refactor')) {
      specs.push({
        name: 'refactor-agent',
        type: 'contextual',
        role: 'refactor-agent',
        description: 'Short-lived agent for refactoring tasks',
        tools: ['Read'],
        scope: ['src/**', 'lib/**'],
        procedure: ['Analyze refactor scope', 'Plan changes', 'Execute refactor', 'Verify functionality'],
        proof: [buildExitCheckedCommand('npm test || pytest')],
        outputSchema: 'Summary: <changes>\nResults:\n- files: <list>\nNotes:\n- <impact>',
        lastReviewed: new Date().toISOString()
      });
    }
    
    if (goal.includes('upgrade') || goal.includes('migrate')) {
      specs.push({
        name: 'dep-upgrade-guard',
        type: 'contextual',
        role: 'dep-upgrade-guard',
        description: 'Dependency upgrade and migration specialist',
        tools: ['Read'],
        scope: ['package.json', 'requirements.txt', 'Cargo.toml', 'go.mod', 'src/**'],
        procedure: ['Review upgrade requirements', 'Check breaking changes', 'Update dependencies', 'Run tests'],
        proof: [
          buildExitCheckedCommand('npm test || pytest'),
          buildExitCheckedCommand('npm audit || safety check')
        ],
        outputSchema: 'Summary: <upgrades>\nResults:\n- updated: <list>\nNotes:\n- <breaking-changes>',
        lastReviewed: new Date().toISOString()
      });
    }
  } else if (mode === 'maintenance') {
    // Same as bootstrap for maintenance
    specs.push(createGenericDroidSpec('planner', mode, frameworks));
    specs.push(createGenericDroidSpec('dev', mode, frameworks));
    specs.push(createGenericDroidSpec('reviewer', mode, frameworks));
    specs.push(createGenericDroidSpec('qa', mode, frameworks));
    specs.push(createGenericDroidSpec('auditor', mode, frameworks));
  }
  
  // Add script droids for all discovered scripts
  for (const scriptPath of plan.scripts.files) {
    specs.push(createScriptDroidSpec(scriptPath, frameworks));
  }
  
  // Add npm script droids
  for (const npmScript of plan.scripts.npmScripts) {
    specs.push(createScriptDroidSpec(npmScript.path, frameworks));
  }
  
  return specs;
}
