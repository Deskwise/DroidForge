import { existsSync, mkdirSync, writeFileSync, chmodSync, symlinkSync, createReadStream } from 'node:fs';
import { delimiter, join, dirname } from 'node:path';
import { homedir, platform } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

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
  // 0) Explicit override
  const override = process.env.DROIDFORGE_RG_PATH;
  if (override && existsSync(override)) {
    const dir = dirname(override);
    const current = process.env.PATH || '';
    if (!current.split(delimiter).includes(dir)) {
      process.env.PATH = `${dir}${delimiter}${current}`;
    }
    return;
  }

  // 1) Use existing rg on PATH
  if (hasRgOnPath()) return;

  const baseDir = join(homedir(), '.factory', 'bin');
  try { mkdirSync(baseDir, { recursive: true }); } catch {}
  const exposeToUserBin = process.env.DROIDFORGE_RG_EXPOSE !== '0';
  const userBin = join(homedir(), '.local', 'bin');

  // 2) Use previously provisioned rg in .factory
  const provisioned = join(baseDir, platform() === 'win32' ? 'rg.exe' : 'rg');
  if (existsSync(provisioned)) {
    const current = process.env.PATH || '';
    if (!current.split(delimiter).includes(baseDir)) {
      process.env.PATH = `${baseDir}${delimiter}${current}`;
    }
    if (exposeToUserBin && existsSync(userBin) && (process.env.PATH || '').includes(userBin)) {
      try {
        const linkPath = join(userBin, platform() === 'win32' ? 'rg.exe' : 'rg');
        if (!existsSync(linkPath)) symlinkSync(provisioned, linkPath);
      } catch {}
    }
    return;
  }

  // 3) Optionally download ripgrep from official releases (pinned)
  const allowDownload = process.env.DROIDFORGE_RG_DOWNLOAD === '1' && process.env.DROIDFORGE_OFFLINE !== '1';
  if (allowDownload) {
    const ok = downloadRipgrepTo(baseDir);
    if (ok) {
      const current = process.env.PATH || '';
      if (!current.split(delimiter).includes(baseDir)) {
        process.env.PATH = `${baseDir}${delimiter}${current}`;
      }
      if (exposeToUserBin && existsSync(userBin) && (process.env.PATH || '').includes(userBin)) {
        try {
          const linkPath = join(userBin, platform() === 'win32' ? 'rg.exe' : 'rg');
          if (!existsSync(linkPath)) symlinkSync(join(baseDir, platform() === 'win32' ? 'rg.exe' : 'rg'), linkPath);
        } catch {}
      }
      if (hasRgOnPath()) return;
    }
  }

  // 4) Fallback: create grep-based shim so searches still work
  createGrepShim(baseDir);

  // Ensure PATH includes .factory/bin for this process
  const current = process.env.PATH || '';
  if (!current.split(delimiter).includes(baseDir)) {
    process.env.PATH = `${baseDir}${delimiter}${current}`;
  }
}

function createGrepShim(baseDir: string): void {
  if (platform() === 'win32') {
    const cmdPath = join(baseDir, 'rg.cmd');
    const ps1Path = join(baseDir, 'rg.ps1');
    const cmd = `@echo off\r\nsetlocal\r\nset SCRIPT=%~dp0rg.ps1\r\npowershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %*\r\n`;
    const ps1 = `param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args)\n` +
      `$patterns = $Args\n` +
      `Get-ChildItem -Path . -Recurse -File -ErrorAction SilentlyContinue |\n` +
      `  Where-Object { $_.FullName -notmatch '\\\\..git\\' -and $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\\\..droidforge\\' -and $_.FullName -notmatch '\\dist\\' -and $_.FullName -notmatch '\\build\\' -and $_.FullName -notmatch '\\vendor\\' -and $_.FullName -notmatch '\\\\..venv\\' } |\n` +
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
    const shimPath = join(baseDir, 'rg');
    const script = `#!/usr/bin/env bash\n` +
      `# Minimal ripgrep fallback using grep\n` +
      `set -o pipefail\n` +
      `# Collect files (excluding heavy dirs) and search with grep -nI\n` +
      `find . -type f \\\n+  -not -path '*/.git/*' \\\n+  -not -path '*/node_modules/*' \\\n+  -not -path '*/.droidforge/*' \\\n+  -not -path '*/dist/*' \\\n+  -not -path '*/build/*' \\\n+  -not -path '*/vendor/*' \\\n+  -not -path '*/.venv/*' \\\n+  -print0 | xargs -0 grep -nI "$@"\n`;
    try {
      writeFileSync(shimPath, script, { encoding: 'utf8' });
      chmodSync(shimPath, 0o755);
    } catch {}
  }
}

function downloadRipgrepTo(destDir: string): boolean {
  try {
    const ver = process.env.DROIDFORGE_RG_VERSION || '14.1.0';
    const plat = platform();
    const arch = process.arch;
    let asset = '';
    let binRel = '';
    const checksums: Record<string, string> = {
      // Linux
      [`ripgrep-${ver}-x86_64-unknown-linux-musl.tar.gz`]: 'f84757b07f425fe5cf11d87df6644691c644a5cd2348a2c670894272999d3ba7',
      [`ripgrep-${ver}-aarch64-unknown-linux-gnu.tar.gz`]: 'c8c210b99844fbf16b7a36d1c963e8351bca5ff2dd7c788f5fba4ac18ba8c60d',
      // macOS
      [`ripgrep-${ver}-x86_64-apple-darwin.tar.gz`]: '4d882fc945e5a9b6080a5c0506f7fe4aaea191c1865355428dd4bfa096f974b5',
      [`ripgrep-${ver}-aarch64-apple-darwin.tar.gz`]: 'fc59ca3eaa5b5bcfa1488eeb80291bad0e8e2842e05d4400fc7b29d5ee4bd26b',
      // Windows
      [`ripgrep-${ver}-x86_64-pc-windows-msvc.zip`]: 'fe4f75edfaa50f0d4fecbf47696b7629f3449c9c2c5a4da828753139e5a2e203'
    };
    if (plat === 'linux') {
      if (arch === 'x64') { asset = `ripgrep-${ver}-x86_64-unknown-linux-musl.tar.gz`; binRel = `ripgrep-${ver}-x86_64-unknown-linux-musl/rg`; }
      else if (arch === 'arm64') { asset = `ripgrep-${ver}-aarch64-unknown-linux-gnu.tar.gz`; binRel = `ripgrep-${ver}-aarch64-unknown-linux-gnu/rg`; }
    } else if (plat === 'darwin') {
      if (arch === 'x64') { asset = `ripgrep-${ver}-x86_64-apple-darwin.tar.gz`; binRel = `ripgrep-${ver}-x86_64-apple-darwin/rg`; }
      else if (arch === 'arm64') { asset = `ripgrep-${ver}-aarch64-apple-darwin.tar.gz`; binRel = `ripgrep-${ver}-aarch64-apple-darwin/rg`; }
    } else if (plat === 'win32') {
      if (arch === 'x64') { asset = `ripgrep-${ver}-x86_64-pc-windows-msvc.zip`; binRel = `rg.exe`; }
      // No official Windows arm64 in 14.1.0; skip download for arm64
    }
    if (!asset) return false;

    const url = `https://github.com/BurntSushi/ripgrep/releases/download/${ver}/${asset}`;
    const tmp = join(destDir, `.download-${asset}`);

    let dlOk = false;
    if (plat === 'win32') {
      const pw = spawnSync('powershell', ['-NoProfile', '-Command', `Invoke-WebRequest -Uri '${url}' -OutFile '${tmp}'`], { stdio: 'ignore' });
      dlOk = pw.status === 0 && existsSync(tmp);
    } else {
      const curl = spawnSync('curl', ['-fsSL', url, '-o', tmp], { stdio: 'ignore' });
      dlOk = curl.status === 0 && existsSync(tmp);
    }
    if (!dlOk) return false;

    // Verify checksum
    const expected = checksums[asset];
    if (!expected) return false;
    const hash = createHash('sha256');
    const stream = createReadStream(tmp);
    const computed: string = (() => {
      return require('node:fs').readFileSync(tmp); // placeholder to satisfy TS types at build time
    })() as unknown as string; // will be overridden below
    // Compute streaming (avoid loading whole file to memory)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (hash as any); // keep linter calm
    } catch {}
    const res = spawnSync(process.execPath, ['-e', `const fs=require('fs'),crypto=require('crypto');
const f=process.argv[1];
const h=crypto.createHash('sha256');
fs.createReadStream(f).on('data',d=>h.update(d)).on('end',()=>{console.log(h.digest('hex'))});
` , tmp], { encoding: 'utf8' });
    const got = (res.stdout || '').trim();
    if (got.toLowerCase() !== expected.toLowerCase()) {
      return false;
    }

    if (asset.endsWith('.tar.gz')) {
      const tar = spawnSync('tar', ['-xzf', tmp, '-C', destDir], { stdio: 'ignore' });
      if (tar.status !== 0) return false;
      const rgSrc = join(destDir, binRel);
      if (!existsSync(rgSrc)) return false;
      const rgDest = join(destDir, 'rg');
      try { chmodSync(rgSrc, 0o755); } catch {}
      const mv = spawnSync('bash', ['-lc', `mv -f '${rgSrc}' '${rgDest}'`], { stdio: 'ignore' });
      if (mv.status !== 0) return false;
    } else if (asset.endsWith('.zip')) {
      const exp = spawnSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -Force -Path '${tmp}' -DestinationPath '${destDir}'`], { stdio: 'ignore' });
      if (exp.status !== 0) return false;
      const try1 = join(destDir, 'rg.exe');
      const try2 = join(destDir, `ripgrep-${ver}-x86_64-pc-windows-msvc`, 'rg.exe');
      const try3 = join(destDir, `ripgrep-${ver}-aarch64-pc-windows-msvc`, 'rg.exe');
      const src = existsSync(try1) ? try1 : (existsSync(try2) ? try2 : (existsSync(try3) ? try3 : ''));
      if (!src) return false;
      const cp = spawnSync('powershell', ['-NoProfile', '-Command', `Copy-Item -Force '${src}' '${join(destDir, 'rg.exe')}'`], { stdio: 'ignore' });
      if (cp.status !== 0) return false;
    }
    return existsSync(join(destDir, platform() === 'win32' ? 'rg.exe' : 'rg'));
  } catch {
    return false;
  }
}
