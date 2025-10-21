import fs from 'node:fs/promises';
import path from 'node:path';
import { mkdirp } from 'mkdirp';
import inquirer from 'inquirer';
import yaml from 'js-yaml';
import kleur from 'kleur';
import type { ProjectBrief, Mode, Persona, AutonomyLevel } from '../types.js';

const BRIEF_DIR = '.factory';
const BRIEF_PATH = path.join(BRIEF_DIR, 'project-brief.yaml');

async function fileExists(p: string) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

export async function conductInterview(): Promise<ProjectBrief> {
  const cwd = process.cwd();
  const briefAbs = path.join(cwd, BRIEF_PATH);
  const hasBrief = await fileExists(briefAbs);

  if (hasBrief) {
    const { update } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'update',
        message: 'A project brief already exists. Do you want to update it?',
        default: true,
      },
    ]) as { update: boolean };
    if (!update) {
      const raw = await fs.readFile(briefAbs, 'utf8');
      const parsed = yaml.load(raw) as ProjectBrief | undefined;
      const valid = !!(
        parsed &&
        (parsed as any).mode &&
        (parsed as any).persona &&
        (parsed as any).autonomy &&
        (parsed as any).intent
      );

      if (valid) {
        console.log(kleur.green('✔ Using existing project brief'));
        return parsed as ProjectBrief;
      }

      console.log(kleur.yellow('⚠ Existing brief is missing required fields (mode/persona/autonomy/intent).'));
      const choice = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'Brief is invalid. What would you like to do?',
          choices: [
            { name: 'Update the brief now', value: 'update' },
            { name: 'Abort (fix manually later)', value: 'abort' },
          ],
        },
      ]) as { action: 'update' | 'abort' };

      if (choice.action === 'abort') {
        throw new Error('Aborted: invalid project brief. Re-run to update the brief.');
      }
      // fall through to update flow
    }
  }

  console.log(kleur.cyan('Let’s capture a quick project brief…'));

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'Mode (what kind of effort is this?)',
      choices: [
        { name: 'bootstrap — create core scaffolding and baselines', value: 'bootstrap' },
        { name: 'feature — deliver a focused feature end-to-end', value: 'feature' },
        { name: 'action — perform a one-off change/refactor', value: 'action' },
        { name: 'maintenance — upgrades, choreography, docs hardening', value: 'maintenance' },
      ],
    },
    {
      type: 'list',
      name: 'persona',
      message: 'Persona (style of output and choices)?',
      choices: [
        { name: 'vibe — explorative, creative, broader options', value: 'vibe' },
        { name: 'pragmatic — practical defaults, balanced rigor', value: 'pragmatic' },
        { name: 'pro — production-grade rigor and constraints', value: 'pro' },
      ],
    },
    {
      type: 'list',
      name: 'autonomy',
      message: 'Autonomy level?',
      choices: [
        { name: 'L1 — suggestions only, minimal changes', value: 'L1' },
        { name: 'L2 — guided changes with confirmations', value: 'L2' },
        { name: 'L3 — end-to-end execution with guardrails', value: 'L3' },
      ],
    },
    { type: 'input', name: 'goal', message: 'Primary goal (one sentence):' },
    { type: 'input', name: 'context', message: 'Key context (stack, constraints, users):' },
    {
      type: 'input',
      name: 'constraints',
      message: 'Constraints (comma-separated):',
      default: '',
    },
  ]) as {
    mode: Mode;
    persona: Persona;
    autonomy: AutonomyLevel;
    goal: string;
    context: string;
    constraints: string;
  };

  const constraints = (answers.constraints || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);

  const brief: ProjectBrief = {
    version: 1,
    mode: answers.mode,
    persona: answers.persona,
    autonomy: answers.autonomy,
    intent: {
      goal: answers.goal,
      context: answers.context,
      constraints,
    },
    domain: { type: 'unknown', stack: [] },
    preferences: {
      testingStyle: 'balanced',
      docStyle: 'concise',
      toolWidening: 'conservative',
    },
    signals: { frameworks: [], scripts: [], prdPaths: [] },
  };

  await mkdirp(path.join(cwd, BRIEF_DIR));
  const serialized = yaml.dump(brief, { noRefs: true, lineWidth: 120 });
  await fs.writeFile(briefAbs, serialized, 'utf8');
  console.log(kleur.green(`✔ Project brief saved to ${BRIEF_PATH}`));
  return brief;
}
