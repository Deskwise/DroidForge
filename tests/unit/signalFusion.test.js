import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { fuseSignals } from '../../dist/orchestrator/signalFusion.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

describe('fuseSignals', () => {
  const testDir = './tmp-test-fusion';
  const originalCwd = process.cwd();

  function createProjectBrief(brief) {
    const briefDir = join(testDir, '.factory');
    mkdirSync(briefDir, { recursive: true });
    writeFileSync(join(briefDir, 'project-brief.yaml'), brief, 'utf8');
  }

  function cleanup() {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore if directory doesn't exist
    }
  }

  test.beforeEach(() => {
    cleanup();
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });

  test.afterEach(() => {
    process.chdir(originalCwd);
    cleanup();
  });

  test('should fuse signals with valid project brief', async () => {
    const brief = `version: 1
mode: bootstrap
persona: pragmatic
autonomy: L2
intent:
  goal: Build a web application
  context: Modern web stack
  constraints:
    - Performance
    - Security
domain:
  type: web
  stack:
    - react
    - node
preferences:
  testingStyle: unit
  docStyle: markdown
  toolWidening: conservative
signals:
  frameworks: []
  scripts: []
  prdPaths: []`;

    createProjectBrief(brief);

    const signals = {
      frameworks: ['frontend', 'testing'],
      prdPaths: ['README.md', 'docs/prd.md'],
      testConfigs: ['jest.config.js']
    };

    const scripts = {
      files: ['scripts/build.sh'],
      npmScripts: [
        { name: 'build', command: 'tsc -p .', path: 'npm:build' },
        { name: 'dev', command: 'node src/index.js', path: 'npm:dev' }
      ]
    };

    const plan = await fuseSignals(signals, scripts);

    assert.equal(plan.brief.mode, 'bootstrap');
    assert.equal(plan.brief.persona, 'pragmatic');
    assert.equal(plan.brief.autonomy, 'L2');
    assert.equal(plan.brief.intent.goal, 'Build a web application');

    // Check that signals were merged into brief
    assert(plan.brief.signals.frameworks.includes('frontend'));
    assert(plan.brief.signals.frameworks.includes('testing'));
    assert(plan.brief.signals.prdPaths.includes('README.md'));
    assert(plan.brief.signals.scripts.includes('npm:build'));
    assert(plan.brief.signals.scripts.includes('npm:dev'));

    // Check plan structure
    assert.deepEqual(plan.signals.frameworks, ['frontend', 'testing']);
    assert.deepEqual(plan.signals.prdPaths, ['README.md', 'docs/prd.md']);
    assert.deepEqual(plan.signals.testConfigs, ['jest.config.js']);
    assert.deepEqual(plan.scripts, scripts);
  });

  test('should throw error when project brief is missing', async () => {
    const signals = { frameworks: [], prdPaths: [], testConfigs: [] };
    const scripts = { files: [], npmScripts: [] };

    await assert.rejects(
      () => fuseSignals(signals, scripts),
      /Missing \.factory\/project-brief\.yaml/
    );
  });

  test('should throw error when project brief is invalid', async () => {
    const invalidBrief = `version: 1
mode: bootstrap
# Missing required fields`;

    createProjectBrief(invalidBrief);

    const signals = { frameworks: [], prdPaths: [], testConfigs: [] };
    const scripts = { files: [], npmScripts: [] };

    await assert.rejects(
      () => fuseSignals(signals, scripts),
      /Invalid project brief structure/
    );
  });

  test('should merge signals correctly with existing brief signals', async () => {
    const brief = `version: 1
mode: feature
persona: vibe
autonomy: L1
intent:
  goal: Add new feature
  context: Feature development
  constraints:
    - Time constraints
domain:
  type: web
  stack:
    - vue
preferences:
  testingStyle: integration
  docStyle: comprehensive
  toolWidening: liberal
signals:
  frameworks: ['backend']
  scripts: ['npm:existing-script']
  prdPaths: ['docs/existing.md']`;

    createProjectBrief(brief);

    const signals = {
      frameworks: ['frontend', 'backend'],
      prdPaths: ['docs/existing.md', 'docs/new.md'],
      testConfigs: ['vitest.config.ts']
    };

    const scripts = {
      files: ['scripts/new.sh'],
      npmScripts: [
        { name: 'build', command: 'vite build', path: 'npm:build' },
        { name: 'existing-script', command: 'echo hello', path: 'npm:existing-script' }
      ]
    };

    const plan = await fuseSignals(signals, scripts);

    // Check that signals were merged and deduplicated
    assert(plan.brief.signals.frameworks.includes('backend'));
    assert(plan.brief.signals.frameworks.includes('frontend'));
    assert(plan.brief.signals.prdPaths.includes('docs/existing.md'));
    assert(plan.brief.signals.prdPaths.includes('docs/new.md'));
    assert(plan.brief.signals.scripts.includes('npm:existing-script'));
    assert(plan.brief.signals.scripts.includes('npm:build'));
  });

  test('should handle empty signals and scripts', async () => {
    const brief = `version: 1
mode: maintenance
persona: pro
autonomy: L3
intent:
  goal: Maintenance tasks
  context: Regular maintenance
  constraints: []
domain:
  type: cli
  stack:
    - node
preferences:
  testingStyle: minimal
  docStyle: concise
  toolWidening: restrictive
signals:
  frameworks: []
  scripts: []
  prdPaths: []`;

    createProjectBrief(brief);

    const signals = { frameworks: [], prdPaths: [], testConfigs: [] };
    const scripts = { files: [], npmScripts: [] };

    const plan = await fuseSignals(signals, scripts);

    assert.equal(plan.brief.mode, 'maintenance');
    assert.deepEqual(plan.signals.frameworks, []);
    assert.deepEqual(plan.signals.prdPaths, []);
    assert.deepEqual(plan.signals.testConfigs, []);
    assert.deepEqual(plan.scripts, scripts);
  });

  test('should persist updated brief to disk', async () => {
    const brief = `version: 1
mode: bootstrap
persona: pragmatic
autonomy: L2
intent:
  goal: Initial project
  context: Starting new project
  constraints: []
domain:
  type: web
  stack:
    - react
preferences:
  testingStyle: unit
  docStyle: markdown
  toolWidening: conservative
signals:
  frameworks: []
  scripts: []
  prdPaths: []`;

    createProjectBrief(brief);

    const signals = {
      frameworks: ['frontend', 'testing'],
      prdPaths: ['README.md'],
      testConfigs: ['jest.config.js']
    };

    const scripts = {
      files: ['scripts/test.sh'],
      npmScripts: [{ name: 'test', command: 'jest', path: 'npm:test' }]
    };

    await fuseSignals(signals, scripts);

    // Read the persisted brief
    const { readFileSync } = await import('node:fs');
    const updatedBrief = readFileSync(join(testDir, '.factory', 'project-brief.yaml'), 'utf8');

    assert(updatedBrief.includes('frontend'));
    assert(updatedBrief.includes('testing'));
    assert(updatedBrief.includes('npm:test'));
  });
});