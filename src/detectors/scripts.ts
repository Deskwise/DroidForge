import { globby } from 'globby';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function scanScripts(root: string) {
  const files = await globby([
    'scripts/**/*.{sh,py,ps1}',
    'Makefile'
  ], { cwd: root, gitignore: true });
  
  const npmScripts: Array<{name: string; command: string; path: string}> = [];
  
  // Check if package.json exists and extract npm scripts
  const packageJsonPath = path.join(root, 'package.json');
  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    
    if (packageJson.scripts && typeof packageJson.scripts === 'object') {
      for (const [name, command] of Object.entries(packageJson.scripts)) {
        if (typeof command === 'string') {
          npmScripts.push({
            name,
            command,
            path: `npm:${name}`
          });
        }
      }
    }
  } catch (error) {
    // package.json doesn't exist or can't be read, skip npm scripts
  }
  
  return { files, npmScripts };
}
