import { existsSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { homedir, platform } from 'node:os';

function pathHas(dir: string, name: string): boolean {
  try {
    return existsSync(join(dir, name));
  } catch {
    return false;
  }
}

function hasRgOnPath(): boolean {
  const pathEnv = process.env.PATH || '';
  const parts = pathEnv.split(delimiter).filter(Boolean);
  for (const dir of parts) {
    if (platform() === 'win32') {
      if (pathHas(dir, 'rg.exe') || pathHas(dir, 'rg.cmd') || pathHas(dir, 'rg.bat') || pathHas(dir, 'rg.ps1')) {
        return true;
      }
    } else {
      if (pathHas(dir, 'rg')) return true;
    }
  }
  return false;
}

export function ensureRipgrep(): void {
  if (hasRgOnPath()) {
    return; // rg available
  }

  const baseDir = join(homedir(), '.factory', 'bin');
  try { mkdirSync(baseDir, { recursive: true }); } catch {}

  if (platform() === 'win32') {
    // Create a small cmd shim that calls a PowerShell script implementing a simple recursive search
    const cmdPath = join(baseDir, 'rg.cmd');
    const ps1Path = join(baseDir, 'rg.ps1');
    const cmd = `@echo off\r\nsetlocal\r\nset SCRIPT=%~dp0rg.ps1\r\npowershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %*\r\n`;
    const ps1 = `param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args)\n` +
      `$patterns = $Args\n` +
      `Get-ChildItem -Path . -Recurse -File -ErrorAction SilentlyContinue |\n` +
      `  Where-Object { $_.FullName -notmatch '\\\.git\\' -and $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\\\.droidforge\\' -and $_.FullName -notmatch '\\dist\\' -and $_.FullName -notmatch '\\build\\' -and $_.FullName -notmatch '\\vendor\\' -and $_.FullName -notmatch '\\\\.venv\\' } |\n` +
      `  ForEach-Object {\n` +
      `    $file = $_.FullName\n` +
      `    try {\n` +
      `      Select-String -Path $file -Pattern $patterns -SimpleMatch -ErrorAction SilentlyContinue | ForEach-Object {\n` +
      `        "$($file):$($_.LineNumber):$($_.Line)"\n` +
      `      }\n` +
      `    } catch {}\n` +
      `  }\n`;
    try {
      writeFileSync(cmdPath, cmd, { encoding: 'utf8' });
      writeFileSync(ps1Path, ps1, { encoding: 'utf8' });
    } catch {}
  } else {
    // POSIX: create a bash shim that uses find + xargs + grep
    const shimPath = join(baseDir, 'rg');
    const script = `#!/usr/bin/env bash\n` +
      `# Minimal ripgrep fallback using grep\n` +
      `set -o pipefail\n` +
      `# Collect files (excluding heavy dirs) and search with grep -nI\n` +
      `find . -type f \\` +
      `\n  -not -path '*/.git/*' \\\n+      \n  -not -path '*/node_modules/*' \\\n+      \n  -not -path '*/.droidforge/*' \\\n+      \n  -not -path '*/dist/*' \\\n+      \n  -not -path '*/build/*' \\\n+      \n  -not -path '*/vendor/*' \\\n+      \n  -not -path '*/.venv/*' \\\n+      \n  -print0 | xargs -0 grep -nI "$@"\n`;
    try {
      writeFileSync(shimPath, script, { encoding: 'utf8' });
      chmodSync(shimPath, 0o755);
    } catch {}
  }

  // Prepend to PATH for this process so any child tools can see it
  const current = process.env.PATH || '';
  if (!current.split(delimiter).includes(baseDir)) {
    process.env.PATH = `${baseDir}${delimiter}${current}`;
  }
}

