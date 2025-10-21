import fs from 'node:fs/promises';
import path from 'node:path';
import { mkdirp } from 'mkdirp';
import kleur from 'kleur';
import { globby } from 'globby';
import matter from 'gray-matter';

interface DroidMetadata {
  name: string;
  role: string;
  description: string;
  tools: string[];
  scope: string[];
  procedure: string[];
  proof: string;
  outputSchema?: any;
  lastReviewed?: string;
}

async function readDroidMetadata(cwd: string): Promise<DroidMetadata[]> {
  try {
    const droidFiles = await globby('.factory/droids/*.md', { cwd });
    const droids: DroidMetadata[] = [];

    for (const filePath of droidFiles) {
      try {
        const content = await fs.readFile(path.join(cwd, filePath), 'utf8');
        const { data: frontmatter } = matter(content);

        if (frontmatter.name) {
          droids.push({
            name: frontmatter.name,
            role: frontmatter.role || '',
            description: frontmatter.description || '',
            tools: frontmatter.tools || [],
            scope: frontmatter.scope || [],
            procedure: frontmatter.procedure || [],
            proof: frontmatter.proof || '',
            outputSchema: frontmatter.outputSchema,
            lastReviewed: frontmatter.lastReviewed
          });
        }
      } catch (err) {
        console.warn(kleur.yellow(`Warning: Could not parse ${filePath}: ${err}`));
      }
    }

    return droids;
  } catch (err) {
    return [];
  }
}

function inferDroidType(name: string): 'generic' | 'script' | 'contextual' {
  if (name.startsWith('script-') || name.startsWith('npm-')) {
    return 'script';
  }
  if (['planner', 'dev', 'reviewer', 'qa', 'auditor'].includes(name)) {
    return 'generic';
  }
  return 'contextual';
}

function getScopeSummary(scope: string[]): string {
  if (scope.length === 0) return 'No scope defined';
  if (scope.length <= 3) return scope.join(', ');
  return `${scope.slice(0, 3).join(', ')}...`;
}

export async function writeAgentsMd(opts: { bootstrap?: boolean; dryRun?: boolean } = {}) {
  const { bootstrap = false, dryRun = false } = opts;

  const cwd = process.cwd();
  const dest = path.join(cwd, 'AGENTS.md');
  const droids = await readDroidMetadata(cwd);

  let body = `# Agents & Droids

This repo uses Factory droids (interactive only).

`;

  if (bootstrap) {
    body += `- Global orchestrator installed at ~/.factory/droids/orchestrator.md\n\n`;
  }

  if (droids.length === 0) {
    body += `> No droids found. Run \`factory init\` to bootstrap the system.\n`;
  } else {
    // Droid Map table
    body += `## Droid Map

| Name | Role | Tools | Scope Summary |
|------|------|-------|---------------|
`;

    for (const droid of droids) {
      const tools = droid.tools.length > 0 ? droid.tools.join(', ') : 'None';
      const scopeSummary = getScopeSummary(droid.scope);
      body += `| ${droid.name} | ${droid.role} | ${tools} | ${scopeSummary} |\n`;
    }

    // Invocation Examples
    body += `
## Invocation Examples

### Generic Droids
\`\`\`bash
factory run planner
factory run dev
factory run reviewer
factory run qa
factory run auditor
\`\`\`

### Script Droids
\`\`\`bash
factory run script-build
factory run script-test
factory run script-deploy
\`\`\`

### Contextual Droids
\`\`\`bash
factory run ui-ux
factory run api
factory run database
factory run security
\`\`\`

### Global Orchestrator
\`\`\`bash
factory run orchestrator
\`\`\`

## Quick Reference

### Core Droids
- **planner**: Project planning and architecture
- **dev**: Development and implementation
- **reviewer**: Code review and validation
- **qa**: Quality assurance and testing
- **auditor**: Security and compliance auditing

### Script Droids
- **script-***: Automated task execution
- **npm-***: Package management tasks

### Contextual Droids
- **ui-ux**: User interface and experience
- **api**: API development and integration
- **database**: Database design and management
- **security**: Security analysis and implementation
`;
  }

  if (dryRun) {
    console.log(kleur.yellow('[DRY-RUN] Would write AGENTS.md'));
    console.log(kleur.gray('Preview (first 200 chars):'));
    console.log(kleur.gray(body.slice(0, 200)));
    return;
  }

  await mkdirp(cwd);
  await fs.writeFile(dest, body + '\n', 'utf8');
}
