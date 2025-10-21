import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

describe('CLI Commands Integration Tests', () => {
  const testDir = './tmp-integration-test';
  const originalCwd = process.cwd();

  function createFile(path, content) {
    const fullPath = join(testDir, path);
    mkdirSync(fullPath.split('/').slice(0, -1).join('/'), { recursive: true });
    writeFileSync(fullPath, content, 'utf8');
  }

  function runDroidForge(args, options = {}) {
    try {
      const result = execSync(`node ${join(originalCwd, 'bin/droidforge.mjs')} ${args}`, {
        cwd: testDir,
        encoding: 'utf8',
        timeout: 10000,
        ...options
      });
      return { success: true, output: result };
    } catch (error) {
      return { success: false, output: error.stdout || error.stderr, error: error };
    }
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
  });

  test.afterEach(() => {
    cleanup();
  });

  test('should show help with enhanced formatting', () => {
    const result = runDroidForge('--help');

    assert(result.success);
    assert(result.output.includes('🤖 DroidForge - Transform your repo into a Factory droid army'));
    assert(result.output.includes('🚀 Quick Start:'));
    assert(result.output.includes('📖 Common Workflows:'));
    assert(result.output.includes('synthesize [options]'));
    assert(result.output.includes('add-script [options] <path>'));
  });

  test('should scan empty repository', () => {
    const result = runDroidForge('scan');

    assert(result.success);

    const output = JSON.parse(result.output);
    assert.deepEqual(output.signals.prdPaths, []);
    assert.deepEqual(output.signals.frameworks, []);
    assert.deepEqual(output.signals.testConfigs, []);
    assert.equal(output.scripts.files.length, 0);
  });

  test('should detect README.md file', () => {
    createFile('README.md', '# Test Project\n\nThis is a test project.\n\n## Vision\nBuild great software.');

    const result = runDroidForge('scan');

    assert(result.success);

    const output = JSON.parse(result.output);
    assert.deepEqual(output.signals.prdPaths, ['README.md']);
    assert(output.signals.prdContent);
    assert(output.signals.prdContent.vision.includes('Build great software'));
  });

  test('should detect package.json and frameworks', () => {
    const packageJson = {
      name: 'test-project',
      dependencies: {
        'react': '^18.0.0',
        'express': '^4.18.0'
      },
      devDependencies: {
        'jest': '^29.0.0',
        'vitest': '^1.0.0'
      },
      scripts: {
        'build': 'tsc',
        'test': 'jest',
        'dev': 'node src/index.js'
      }
    };

    createFile('package.json', JSON.stringify(packageJson, null, 2));

    const result = runDroidForge('scan');

    assert(result.success);

    const output = JSON.parse(result.output);
    assert(output.signals.frameworks.includes('frontend'));
    assert(output.signals.frameworks.includes('backend'));
    assert(output.signals.frameworks.includes('testing'));

    assert.equal(output.scripts.npmScripts.length, 3);
    assert(output.scripts.npmScripts.some(s => s.name === 'build'));
    assert(output.scripts.npmScripts.some(s => s.name === 'test'));
    assert(output.scripts.npmScripts.some(s => s.name === 'dev'));
  });

  test('should detect test configuration files', () => {
    createFile('jest.config.js', 'module.exports = {};');
    createFile('vitest.config.ts', 'import { defineConfig } from "vitest/config";');
    createFile('playwright.config.ts', 'import { defineConfig } from "@playwright/test";');

    const result = runDroidForge('scan');

    assert(result.success);

    const output = JSON.parse(result.output);
    assert.equal(output.signals.testConfigs.length, 3);
    assert(output.signals.testConfigs.some(file => file.includes('jest.config.js')));
    assert(output.signals.testConfigs.some(file => file.includes('vitest.config.ts')));
    assert(output.signals.testConfigs.some(file => file.includes('playwright.config.ts')));
  });

  test('should detect PRD files in various locations', () => {
    createFile('docs/prd/project.md', '# Project PRD\n\nVision: Build something great.');
    createFile('prd/technical.md', '# Technical PRD\n\nTechnical requirements.');

    const result = runDroidForge('scan');

    assert(result.success);

    const output = JSON.parse(result.output);
    assert(output.signals.prdPaths.length >= 2);
    assert(output.signals.prdPaths.some(path => path.includes('docs/prd/project.md')));
    assert(output.signals.prdPaths.some(path => path.includes('prd/technical.md')));
  });

  test('should create basic project structure with init', () => {
    // First create a package.json to simulate a real project
    createFile('package.json', JSON.stringify({
      name: 'test-project',
      scripts: { build: 'echo "building"' }
    }, null, 2));

    const result = runDroidForge('init');

    assert(result.success);
    assert(result.output.includes('✅ Initialized'));

    // Check that files were created
    const { existsSync } = await import('node:fs');
    const { join } = await import('node:path');

    assert(existsSync(join(testDir, 'AGENTS.md')));
    assert(existsSync(join(testDir, 'docs')));
    assert(existsSync(join(testDir, '.factory')));
    assert(existsSync(join(testDir, '.factory/droids-manifest.json')));
  });

  test('should run synthesize in dry-run mode', () => {
    // Create a basic project setup
    createFile('package.json', JSON.stringify({
      name: 'test-project',
      dependencies: { 'react': '^18.0.0' },
      scripts: { build: 'tsc', test: 'jest' }
    }, null, 2));

    createFile('README.md', `# Test Project

## Vision
Build a React application with testing.

## Features
- User authentication
- Real-time updates

## Acceptance Criteria
- Users can log in securely
- Real-time features work properly`);

    createFile('.factory/project-brief.yaml', `version: 1
mode: bootstrap
persona: pragmatic
autonomy: L2
intent:
  goal: Build a React application
  context: Modern web development
  constraints:
    - Performance
    - Security
domain:
  type: web
  stack: []
preferences:
  testingStyle: unit
  docStyle: markdown
  toolWidening: conservative
signals:
  frameworks: []
  scripts: []
  prdPaths: []`);

    const result = runDroidForge('synthesize --dry-run');

    assert(result.success);
    assert(result.output.includes('[DRY-RUN MODE]'));
    assert(result.output.includes('🔍 Scanning repository...'));
    assert(result.output.includes('📜 Discovering scripts...'));
    assert(result.output.includes('🧠 Fusing signals with project intent...'));
    assert(result.output.includes('🤖 Generating droids...'));
    assert(result.output.includes('✅ Droid synthesis complete!'));
    assert(result.output.includes('[DRY-RUN] Would update AGENTS.md'));
  });

  test('should handle add-script in dry-run mode', () => {
    createFile('scripts/build.sh', '#!/bin/bash\necho "Building project..."');

    // Create a basic brief to avoid interview
    createFile('.factory/project-brief.yaml', `version: 1
mode: bootstrap
persona: pragmatic
autonomy: L2
intent:
  goal: Test project
  context: Testing
  constraints: []
domain:
  type: test
  stack: []
preferences:
  testingStyle: unit
  docStyle: markdown
  toolWidening: conservative
signals:
  frameworks: []
  scripts: []
  prdPaths: []`);

    const result = runDroidForge('add-script scripts/build.sh --dry-run');

    assert(result.success);
    assert(result.output.includes('[DRY-RUN MODE]'));
    assert(result.output.includes('scripts/build.sh'));
    assert(result.output.includes('[DRY-RUN] Would wrap script'));
  });

  test('should handle reanalyze in dry-run mode', () => {
    // Create a basic project setup
    createFile('package.json', JSON.stringify({
      name: 'test-project',
      scripts: { build: 'tsc' }
    }, null, 2));

    createFile('.factory/project-brief.yaml', `version: 1
mode: maintenance
persona: pragmatic
autonomy: L2
intent:
  goal: Maintain project
  context: Project maintenance
  constraints: []
domain:
  type: test
  stack: []
preferences:
  testingStyle: unit
  docStyle: markdown
  toolWidening: conservative
signals:
  frameworks: []
  scripts: []
  prdPaths: []`);

    const result = runDroidForge('reanalyze --dry-run');

    assert(result.success);
    assert(result.output.includes('[DRY-RUN MODE]'));
    assert(result.output.includes('Analyzing changes since last synthesis...'));
  });
});