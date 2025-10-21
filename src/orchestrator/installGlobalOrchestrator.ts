import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { mkdirp } from 'mkdirp';
import mustache from 'mustache';

export async function installGlobalOrchestrator() {
  const home = os.homedir();
  const dir = path.join(home, '.factory', 'droids');
  await mkdirp(dir);
  const dest = path.join(dir, 'orchestrator.md');
  const tplPath = new URL('../../templates/orchestrator.md.hbs', import.meta.url);
  const tpl = await fs.readFile(tplPath, 'utf8');
  const body = mustache.render(tpl, { model: 'gpt-5-high' });
  await fs.writeFile(dest, body, 'utf8');
}
