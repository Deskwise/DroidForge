import fs from 'node:fs/promises';
import path from 'node:path';
import { mkdirp } from 'mkdirp';
import kleur from 'kleur';
import { readDroidMetadata, type DroidMetadata } from './shared/readDroidMetadata.js';

function getFrameworkExamples(frameworks: string[]): string {
  // Normalize frameworks to lowercase for consistent matching
  const normalizedFrameworks = frameworks.map(f => f.toLowerCase());

  // Check for framework categories emitted by scanRepo()
  const hasFrontend = normalizedFrameworks.includes('frontend') ||
    normalizedFrameworks.some(f => ['react', 'next', 'vue', 'svelte', 'angular', 'nuxt'].includes(f));

  const hasBackend = normalizedFrameworks.includes('backend') ||
    normalizedFrameworks.some(f => ['express', 'koa', 'fastify', 'hono', 'nestjs'].includes(f));

  const hasTesting = normalizedFrameworks.includes('testing') ||
    normalizedFrameworks.some(f => ['jest', 'vitest', 'mocha', 'ava', 'playwright', 'cypress'].includes(f));

  const hasMotion = normalizedFrameworks.includes('motion') ||
    normalizedFrameworks.some(f => ['framer-motion'].includes(f));

  let examples = '';

  if (hasFrontend) {
    examples += `
#### Frontend Development Example
\`\`\`bash
# Run UI/UX droid for component development
factory run ui-ux

Expected output:
🎨 UI/UX droid analyzing frontend components...
 Current task: Implement responsive navigation
 Tools available: Read, Write, Edit
 Scope: src/components/**/*.tsx
\`\`\``;
  }

  if (hasBackend) {
    examples += `
#### Backend API Example
\`\`\`bash
# Run API droid for endpoint development
factory run api

Expected output:
🔌 API droid analyzing backend routes...
 Current task: Add authentication middleware
 Tools available: Read, Write, Shell, Edit
 Scope: src/routes/**/*.js
\`\`\``;
  }

  if (hasTesting) {
    examples += `
#### Testing Framework Example
\`\`\`bash
# Run QA droid for test coverage
factory run qa

Expected output:
🧪 QA droid analyzing test coverage...
 Current task: Add unit tests for utility functions
 Tools available: Read, Write, Shell, Edit
 Scope: tests/**/*.test.js
\`\`\``;
  }

  if (hasMotion) {
    examples += `
#### Motion/Animation Example
\`\`\`bash
# Run UI/UX droid for animation implementation
factory run ui-ux

Expected output:
🎨 UI/UX droid implementing motion components...
 Current task: Add smooth page transitions
 Tools available: Read, Write, Edit
 Scope: src/components/**/*.tsx
\`\`\``;
  }

  if (!hasFrontend && !hasBackend && !hasTesting && !hasMotion) {
    examples += `
#### Generic Example
\`\`\`bash
# Run development droid
factory run dev

Expected output:
  Development droid analyzing codebase...
 Current task: Feature implementation
 Tools available: Read, Write, Edit
 Scope: src/**/*.ts
\`\`\``;
  }

  return examples;
}

export async function writeDroidGuide(opts: { bootstrap?: boolean; dryRun?: boolean; frameworks?: string[] } = {}) {
  const { bootstrap = false, dryRun = false, frameworks = [] } = opts;

  const cwd = process.cwd();
  const dir = path.join(cwd, 'docs');
  const dest = path.join(dir, 'droid-guide.md');
  const droids = await readDroidMetadata(cwd);

  let body = `# Droid Guide

## Introduction

The Factory droid system provides autonomous agents for software development tasks. Droids are interactive agents that can read, analyze, and modify code based on their defined roles and scopes.

### Key Concepts
- **Droids**: Autonomous agents with specific roles (planner, dev, reviewer, qa, etc.)
- **Factory CLI**: Command-line interface for running droids
- **Scope**: Defines what files and operations a droid can access
- **Proof**: Validation commands that verify droid actions
- **Autonomy Levels**: L1 (confirmations), L2 (batch confirmations), L3 (fully autonomous)

`;

  if (bootstrap) {
    body += `- Global orchestrator installed at ~/.factory/droids/orchestrator.md\n\n`;
  }

  if (droids.length === 0) {
    body += `> No droids found. Run \`factory init\` to bootstrap the system.\n`;
  } else {
    body += `## Invocation Patterns

### Basic Command Syntax
\`\`\`bash
factory run <droid-name>
factory run orchestrator  # Global orchestrator
\`\`\`

### Generic Droids
Use the role name directly:
\`\`\`bash
factory run planner      # Project planning and architecture
factory run dev          # Development and implementation
factory run reviewer     # Code review and validation
factory run qa           # Quality assurance and testing
factory run auditor      # Security and compliance auditing
\`\`\`

### Script Droids
For automation tasks:
\`\`\`bash
factory run script-build    # Build automation
factory run script-test     # Test automation
factory run script-deploy   # Deployment automation
factory run npm-install     # Package management
\`\`\`

### Contextual Droids
For specialized domains:
\`\`\`bash
factory run ui-ux          # User interface and experience
factory run api            # API development and integration
factory run database       # Database design and management
factory run security       # Security analysis and implementation
\`\`\`

## Autonomy Levels

### Level 1 (L1) - Step-by-Step Confirmation
- **When to use**: Learning, sensitive operations, production code
- **Behavior**: Prompts for confirmation before each action
- **Example**:
  \`\`\`bash
  factory run dev --autonomy L1
  \`\`\`

### Level 2 (L2) - Batch Confirmation
- **When to use**: Routine tasks, well-understood workflows
- **Behavior**: Groups related actions and confirms in batches
- **Example**:
  \`\`\`bash
  factory run dev --autonomy L2
  \`\`\`

### Level 3 (L3) - Fully Autonomous
- **When to use**: Repetitive tasks, trusted environments, CI/CD
- **Behavior**: Executes complete workflows without interruption
- **Example**:
  \`\`\`bash
  factory run dev --autonomy L3
  \`\`\`

## Proof Expectations

### What are Proof Commands?
Proof commands are validation steps that verify droid actions completed successfully. They run automatically after droid operations.

### Common Proof Patterns

#### Exit Code Verification
\`\`\`bash
# Verify command succeeded
exit_code=$?
if [ $exit_code -eq 0 ]; then echo "PASS"; else echo "FAIL"; fi
\`\`\`

#### File Existence Checks
\`\`\`bash
# Verify files were created/modified
if [ -f "src/components/Button.tsx" ]; then echo "PASS"; else echo "FAIL"; fi
\`\`\`

#### Test Execution
\`\`\`bash
# Run tests to verify functionality
npm test
if [ $? -eq 0 ]; then echo "PASS"; else echo "FAIL"; fi
\`\`\`

#### Build Verification
\`\`\`bash
# Verify build succeeds
npm run build
if [ $? -eq 0 ]; then echo "PASS"; else echo "FAIL"; fi
\`\`\`

### Interpreting Proof Results
- **PASS**: Droid actions completed successfully
- **FAIL**: Something went wrong - check logs and retry
- **SKIP**: Proof command not applicable (e.g., no tests to run)

## Troubleshooting

### Common Issues and Solutions

#### Droid Not Found
\`\`\`
Error: Droid 'xyz' not found
\`\`\`
**Solution**: Check available droids with \`factory list\` or run \`factory init\`

#### Proof Failed
\`\`\`
Error: Proof validation failed
\`\`\`
**Solution**:
1. Review the droid's actions in the logs
2. Check if files were created/modified correctly
3. Run the proof command manually to debug
4. Retry with higher autonomy level if needed

#### Tool Permission Denied
\`\`\`
Error: Tool 'Write' not permitted in scope
\`\`\`
**Solution**:
1. Check the droid's defined scope in \`.factory/droids/*.md\`
2. Verify target files are within allowed directories
3. Update scope if necessary and regenerate droids

#### Scope Conflicts
\`\`\`
Error: Scope conflict - multiple droids accessing same files
\`\`\`
**Solution**:
1. Review droid scopes for overlaps
2. Use more specific scope patterns
3. Consider combining related functionality

## Examples by Framework
${getFrameworkExamples(frameworks)}

## Droid Reference

`;

    for (const droid of droids) {
      body += `### ${droid.name}
**Role**: ${droid.role}
**Description**: ${droid.description}

**Tools**: ${droid.tools.length > 0 ? droid.tools.join(', ') : 'None'}

**Scope**:
${droid.scope.length > 0 ? droid.scope.map(s => `- ${s}`).join('\n') : '- No scope defined'}

**Procedure**:
${droid.procedure.length > 0 ? droid.procedure.map(p => `1. ${p}`).join('\n') : '- No procedure defined'}

**Proof**: \`${droid.proof || 'None defined'}\`

`;
    }
  }

  if (dryRun) {
    console.log(kleur.yellow('[DRY-RUN] Would write docs/droid-guide.md'));
    console.log(kleur.gray('Preview (first 200 chars):'));
    console.log(kleur.gray(body.slice(0, 200)));
    return;
  }

  await mkdirp(dir);
  await fs.writeFile(dest, body + '\n', 'utf8');
}
