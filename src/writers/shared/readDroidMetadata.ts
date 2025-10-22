import fs from 'node:fs/promises';
import path from 'node:path';
import { globby } from 'globby';
import matter from 'gray-matter';
import kleur from 'kleur';

export interface DroidMetadata {
  name: string;
  role?: string;
  description: string;
  tools: string[];
  scope: string[];
  procedure: string[];
  proof: string;
  outputSchema?: any;
  lastReviewed?: string;
}

export interface DroidMetadataWithType extends DroidMetadata {
  type: 'generic' | 'script' | 'contextual';
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

function normalizeToolName(tool: string): string {
  const normalized = tool.toLowerCase().trim();

  // Map known aliases to canonical forms
  const aliasMap: Record<string, string> = {
    'read': 'read',
    'write': 'write',
    'shell': 'shell',
    'edit': 'edit',
    'bash': 'shell',
    'terminal': 'shell',
    'cmd': 'shell',
    'file': 'write',
    'create': 'write',
    'modify': 'edit',
    'update': 'edit'
  };

  return aliasMap[normalized] || normalized;
}

export async function readDroidMetadata(cwd: string): Promise<DroidMetadata[]> {
  try {
    const droidFiles = await globby('.droidforge/droids/*.md', { cwd });

    // Parallelize file reads using Promise.all
    const fileReadPromises = droidFiles.map(async (filePath) => {
      try {
        const content = await fs.readFile(path.join(cwd, filePath), 'utf8');
        const { data: frontmatter } = matter(content);

        if (!frontmatter.name && !frontmatter.role) {
          console.warn(kleur.yellow(`Warning: Skipping ${filePath}: missing both 'name' and 'role' fields`));
          return null;
        }

        // Graceful fallback for missing name field
        let name = frontmatter.name;
        if (!name) {
          name = frontmatter.role || path.basename(filePath, '.md');
          console.warn(kleur.yellow(`Warning: Using fallback name '${name}' for ${filePath}: missing 'name' field`));
        }

        return {
          name,
          role: frontmatter.role,
          description: frontmatter.description || '',
          tools: Array.isArray(frontmatter.tools)
            ? frontmatter.tools.map(normalizeToolName)
            : [],
          scope: frontmatter.scope || [],
          procedure: frontmatter.procedure || [],
          proof: frontmatter.proof || '',
          outputSchema: frontmatter.outputSchema,
          lastReviewed: frontmatter.lastReviewed
        };
      } catch (err) {
        console.warn(kleur.yellow(`Warning: Could not parse ${filePath}: ${err}`));
        return null;
      }
    });

    const results = await Promise.all(fileReadPromises);

    // Filter out null results and return valid droids
    return results.filter((droid) => droid !== null) as DroidMetadata[];
  } catch (err) {
    return [];
  }
}

export async function readDroidMetadataWithType(cwd: string): Promise<DroidMetadataWithType[]> {
  const droids = await readDroidMetadata(cwd);

  return droids.map(droid => ({
    ...droid,
    type: inferDroidType(droid.name)
  }));
}