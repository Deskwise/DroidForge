import path from 'node:path';

export type ScriptType = 'shell' | 'python' | 'npm' | 'make' | 'powershell' | 'unknown';

export function inferScriptType(scriptPath: string): ScriptType {
  const ext = path.extname(scriptPath).toLowerCase();
  const basename = path.basename(scriptPath).toLowerCase();
  
  if (scriptPath.startsWith('npm:')) return 'npm';
  if (basename === 'makefile' || ext === '.mk') return 'make';
  if (ext === '.ps1') return 'powershell';
  if (ext === '.sh' || ext === '.bash') return 'shell';
  if (ext === '.py') return 'python';
  
  return 'unknown';
}

export function generateProofCommands(scriptPath: string, frameworks: string[]): string[] {
  const scriptType = inferScriptType(scriptPath);
  const commands: string[] = [];
  
  switch (scriptType) {
    case 'shell':
      commands.push(`bash ${scriptPath}; ec=$?; echo "Exit code: $ec"; test $ec -eq 0 && echo PASS || echo FAIL`);
      break;
      
    case 'python':
      commands.push(`python3 ${scriptPath}; ec=$?; echo "Exit code: $ec"; test $ec -eq 0 && echo PASS || echo FAIL`);
      break;
      
    case 'npm':
      const npmScript = scriptPath.replace('npm:', '');
      commands.push(`npm run ${npmScript}; ec=$?; echo "Exit code: $ec"; test $ec -eq 0 && echo PASS || echo FAIL`);
      break;
      
    case 'powershell':
      commands.push(`pwsh -File ${scriptPath}; ec=$?; echo "Exit code: $ec"; test $ec -eq 0 && echo PASS || echo FAIL`);
      break;
      
    case 'make':
      // Handle Makefile: prefix explicitly
      let target = '';
      if (scriptPath.includes(':')) {
        const parts = scriptPath.split(':');
        target = parts[1] || '';
      }
      const makeCmd = target ? `make ${target}` : 'make';
      commands.push(`${makeCmd}; ec=$?; echo "Exit code: $ec"; test $ec -eq 0 && echo PASS || echo FAIL`);
      break;
      
    default:
      commands.push(`echo "Unknown script type for ${scriptPath}"`);
      break;
  }
  
  // Add framework-specific proof commands
  if (frameworks.includes('frontend') || frameworks.includes('react') || frameworks.includes('vue') || frameworks.includes('angular')) {
    commands.push('test -d dist || test -d build && echo "Build artifacts found"');
    commands.push('test -f dist/index.html || test -f build/index.html && echo "HTML entry found"');
  }
  
  if (frameworks.includes('backend') || frameworks.includes('express') || frameworks.includes('fastapi') || frameworks.includes('django')) {
    commands.push('curl -f http://localhost:3000/health || echo "Health check endpoint validation"');
  }
  
  if (frameworks.includes('testing') || frameworks.includes('jest') || frameworks.includes('pytest') || frameworks.includes('vitest')) {
    commands.push('test -d coverage && echo "Coverage report generated"');
    commands.push('grep -q "PASS\\|passed\\|OK" test-results.txt || echo "Test results validation"');
  }
  
  return commands;
}
