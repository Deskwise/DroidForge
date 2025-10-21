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
  const analysis = plan.brief.analysis;

  if (!analysis) {
    // Fallback for old briefs without analysis
    return createFallbackDroids(plan);
  }

  const specs: DroidSpec[] = [];

  // Create domain-specific droids based on natural language analysis
  specs.push(...createDomainSpecificDroids(analysis));

  // Add common droids based on complexity and requirements
  specs.push(...createCommonDroids(analysis));

  // Add technical level-specific droids
  specs.push(...createTechnicalDroids(analysis));

  return specs;
}

function createDomainSpecificDroids(analysis: any): DroidSpec[] {
  const specs: DroidSpec[] = [];
  const { domain, requirements, complexity } = analysis;

  switch (domain) {
  case 'medical/dental':
    specs.push(
      createDroidSpec('frontend-dental', 'frontend', {
        description: 'Specialized in creating intuitive user interfaces for dental and medical applications',
        scope: ['patient booking forms', 'treatment displays', 'medical history views', 'appointment calendars'],
        domainExpertise: ['HIPAA compliance', 'medical terminology', 'patient privacy', 'appointment scheduling']
      }),
      createDroidSpec('backend-dental', 'backend', {
        description: 'Expert in dental practice management systems and medical data handling',
        scope: ['patient records', 'appointment scheduling', 'billing systems', 'insurance integration'],
        domainExpertise: ['HIPAA compliance', 'medical databases', 'practice management', 'secure data handling']
      })
    );
    if (requirements.includes('booking_system')) {
      specs.push(createDroidSpec('scheduler-dental', 'fullstack', {
        description: 'Specialized in dental appointment scheduling and calendar management',
        scope: ['appointment booking', 'calendar integration', 'availability management', 'patient reminders'],
        domainExpertise: ['time slot management', 'patient communications', 'scheduling conflicts', 'automated reminders']
      }));
    }
    break;

  case 'restaurant':
    specs.push(
      createDroidSpec('frontend-restaurant', 'frontend', {
        description: 'Creates engaging user interfaces for restaurant and food service applications',
        scope: ['menu displays', 'ordering systems', 'reservation forms', 'customer reviews'],
        domainExpertise: ['restaurant UX patterns', 'food presentation', 'ordering flows', 'customer engagement']
      }),
      createDroidSpec('backend-restaurant', 'backend', {
        description: 'Expert in restaurant management systems and food service operations',
        scope: ['inventory management', 'order processing', 'table management', 'kitchen coordination'],
        domainExpertise: ['restaurant operations', 'POS integration', 'inventory tracking', 'order management']
      })
    );
    break;

  case 'fitness':
    specs.push(
      createDroidSpec('frontend-fitness', 'frontend', {
        description: 'Specialized in fitness and workout application interfaces',
        scope: ['workout displays', 'progress tracking', 'exercise libraries', 'user profiles'],
        domainExpertise: ['fitness app patterns', 'progress visualization', 'workout planning', 'motivation design']
      }),
      createDroidSpec('backend-fitness', 'backend', {
        description: 'Expert in fitness tracking and workout management systems',
        scope: ['workout data', 'user progress', 'exercise libraries', 'performance analytics'],
        domainExpertise: ['fitness data modeling', 'performance tracking', 'workout algorithms', 'health metrics']
      })
    );
    break;

  case 'e-commerce':
    specs.push(
      createDroidSpec('frontend-ecommerce', 'frontend', {
        description: 'Creates compelling shopping experiences and product presentations',
        scope: ['product catalogs', 'shopping carts', 'checkout flows', 'user accounts'],
        domainExpertise: ['e-commerce UX', 'conversion optimization', 'product presentation', 'trust signals']
      }),
      createDroidSpec('backend-ecommerce', 'backend', {
        description: 'Expert in e-commerce platforms and transaction processing',
        scope: ['product management', 'order processing', 'payment integration', 'inventory tracking'],
        domainExpertise: ['payment systems', 'order management', 'e-commerce security', 'scalability patterns']
      })
    );
    break;

  default:
    // General purpose droids for unspecified domains
    specs.push(
      createDroidSpec('frontend-general', 'frontend', {
        description: 'Versatile frontend developer for various application types',
        scope: ['user interfaces', 'responsive design', 'user experience', 'component development'],
        domainExpertise: ['modern frontend frameworks', 'UI/UX principles', 'responsive design', 'accessibility']
      }),
      createDroidSpec('backend-general', 'backend', {
        description: 'Full-stack backend developer for general application development',
        scope: ['API development', 'database design', 'authentication', 'business logic'],
        domainExpertise: ['RESTful APIs', 'database design', 'security patterns', 'system architecture']
      })
    );
  }

  return specs;
}

function createCommonDroids(analysis: any): DroidSpec[] {
  const specs: DroidSpec[] = [];
  const { complexity, requirements, technicalLevel } = analysis;

  // Always include a code reviewer
  specs.push(createDroidSpec('reviewer', 'quality', {
    description: 'Code quality specialist focused on maintaining high standards',
    scope: ['code reviews', 'best practices', 'code style', 'quality assurance'],
    domainExpertise: ['code review patterns', 'quality standards', 'best practices', 'code maintainability']
  }));

  // Add QA for medium to complex projects
  if (complexity === 'medium' || complexity === 'complex') {
    specs.push(createDroidSpec('qa', 'testing', {
      description: 'Testing specialist focused on ensuring application reliability',
      scope: ['test planning', 'test execution', 'bug reporting', 'quality validation'],
      domainExpertise: ['testing methodologies', 'test automation', 'quality assurance', 'bug tracking']
    }));
  }

  // Add devops for complex projects
  if (complexity === 'complex') {
    specs.push(createDroidSpec('devops', 'deployment', {
      description: 'Deployment and infrastructure specialist',
      scope: ['deployment pipelines', 'infrastructure setup', 'monitoring', 'scaling'],
      domainExpertise: ['CI/CD pipelines', 'cloud deployment', 'monitoring systems', 'infrastructure as code']
    }));
  }

  // Add specialized droids based on requirements
  if (requirements.includes('payment_processing')) {
    specs.push(createDroidSpec('payments', 'backend', {
      description: 'Payment processing and financial transaction specialist',
      scope: ['payment integration', 'transaction security', 'billing systems', 'financial compliance'],
      domainExpertise: ['payment gateways', 'PCI compliance', 'transaction security', 'financial regulations']
    }));
  }

  if (requirements.includes('user_management')) {
    specs.push(createDroidSpec('auth', 'backend', {
      description: 'Authentication and authorization specialist',
      scope: ['user authentication', 'authorization systems', 'security', 'user management'],
      domainExpertise: ['OAuth implementations', 'JWT tokens', 'security best practices', 'user session management']
    }));
  }

  return specs;
}

function createTechnicalDroids(analysis: any): DroidSpec[] {
  const specs: DroidSpec[] = [];
  const { technicalLevel } = analysis;

  // Add additional technical droids based on user's technical level
  if (technicalLevel === 'expert') {
    specs.push(createDroidSpec('architect', 'system', {
      description: 'System architecture specialist for complex application design',
      scope: ['system architecture', 'scalability planning', 'technical decisions', 'design patterns'],
      domainExpertise: ['system design', 'architecture patterns', 'scalability principles', 'technical leadership']
    }));
  }

  return specs;
}

function createDroidSpec(name: string, role: string, customizations: any): DroidSpec {
  const baseTools = role === 'frontend' ?
    ['file:src/**/*', 'file:public/**/*', 'command:npm run dev'] :
    role === 'backend' ?
      ['file:server/**/*', 'file:api/**/*', 'command:npm start'] :
      ['file:**/*'];

  return {
    name,
    type: 'contextual',
    role,
    description: customizations.description,
    tools: baseTools,
    scope: customizations.scope || [],
    procedure: [
      `Analyze ${role} requirements`,
      `Implement ${customizations.domainExpertise?.[0] || 'solution'}`,
      'Test functionality',
      'Ensure quality standards'
    ],
    proof: [buildExitCheckedCommand('npm test')],
    outputSchema: `Implementation: ${role} components\nResults:\n- Features: <list>\nQuality: <validation>`,
    lastReviewed: new Date().toISOString(),
    ...customizations
  };
}

function createFallbackDroids(plan: DroidPlan): DroidSpec[] {
  // Simple fallback for old briefs
  return [
    createDroidSpec('frontend', 'frontend', {
      description: 'Frontend developer for user interface development',
      scope: ['user interfaces', 'components', 'styling'],
      domainExpertise: ['modern frontend development']
    }),
    createDroidSpec('backend', 'backend', {
      description: 'Backend developer for server-side functionality',
      scope: ['APIs', 'database', 'business logic'],
      domainExpertise: ['server-side development']
    })
  ];
}
