import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

describe('End-to-End Workflow Tests', () => {
  const testDir = './tmp-e2e-test';
  const originalCwd = process.cwd();

  function createFile(path, content) {
    const fullPath = join(testDir, path);
    mkdirSync(fullPath.split('/').slice(0, -1).join('/'), { recursive: true });
    writeFileSync(fullPath, content, 'utf8');
  }

  function runDroidForge(args, input = '', options = {}) {
    try {
      const result = execSync(`echo "${input}" | node ${join(originalCwd, 'bin/droidforge.mjs')} ${args}`, {
        cwd: testDir,
        encoding: 'utf8',
        timeout: 15000,
        shell: true,
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

  test('should complete full workflow: init -> scan -> synthesize', async () => {
    // Step 1: Initialize project
    createFile('package.json', JSON.stringify({
      name: 'test-workflow-project',
      scripts: { build: 'echo "building"', test: 'echo "testing"' }
    }, null, 2));

    createFile('README.md', `# Test Workflow Project

## Vision
Create a complete test workflow.

## Features
- User management
- Real-time updates

## Acceptance Criteria
- Users can register and login
- Real-time features work seamlessly`);

    const initResult = runDroidForge('init');
    assert(initResult.success);
    assert(initResult.output.includes('✅ Initialized'));

    // Step 2: Scan the project
    const scanResult = runDroidForge('scan');
    assert(scanResult.success);

    const scanOutput = JSON.parse(scanResult.output);
    assert(scanOutput.signals.prdPaths.includes('README.md'));
    assert(scanOutput.scripts.npmScripts.length >= 2);

    // Step 3: Create a project brief to avoid interview
    createFile('.factory/project-brief.yaml', `version: 1
mode: bootstrap
persona: pragmatic
autonomy: L2
intent:
  goal: Complete test workflow
  context: Testing end-to-end functionality
  constraints:
    - Must be automated
    - Should be reliable
domain:
  type: test
  stack:
    - node
preferences:
  testingStyle: e2e
  docStyle: comprehensive
  toolWidening: conservative
signals:
  frameworks: []
  scripts: []
  prdPaths: []`);

    // Step 4: Run synthesize with dry-run
    const synthesizeResult = runDroidForge('synthesize --dry-run', 'n');
    assert(synthesizeResult.success);
    assert(synthesizeResult.output.includes('[DRY-RUN MODE]'));
    assert(synthesizeResult.output.includes('✅ Droid synthesis complete!'));
    assert(synthesizeResult.output.includes('[DRY-RUN] Would update AGENTS.md'));

    // Step 5: Verify the droids that would be created
    assert(synthesizeResult.output.includes('planner'));
    assert(synthesizeResult.output.includes('dev'));
    assert(synthesizeResult.output.includes('qa'));
    assert(synthesizeResult.output.includes('auditor'));
  });

  test('should handle script wrapping workflow', () => {
    // Create a basic setup
    createFile('package.json', JSON.stringify({
      name: 'script-wrapper-test',
      scripts: { test: 'echo "testing"', build: 'echo "building"' }
    }, null, 2));

    createFile('scripts/deploy.sh', `#!/bin/bash
echo "Deploying application..."
echo "Deployment complete!"
exit 0`);

    createFile('.factory/project-brief.yaml', `version: 1
mode: feature
persona: pragmatic
autonomy: L2
intent:
  goal: Add deployment script
  context: Script automation
  constraints: []
domain:
  type: automation
  stack: []
preferences:
  testingStyle: unit
  docStyle: markdown
  toolWidening: conservative
signals:
  frameworks: []
  scripts: []
  prdPaths: []`);

    // Test script wrapping
    const addScriptResult = runDroidForge('add-script scripts/deploy.sh --dry-run', 'n');
    assert(addScriptResult.success);
    assert(addScriptResult.output.includes('[DRY-RUN MODE]'));
    assert(addScriptResult.output.includes('scripts/deploy.sh'));
    assert(addScriptResult.output.includes('Wrap script as droid'));

    // Test reanalyze
    const reanalyzeResult = runDroidForge('reanalyze --dry-run', 'n');
    assert(reanalyzeResult.success);
    assert(reanalyzeResult.output.includes('[DRY-RUN MODE]'));
    assert(reanalyzeResult.output.includes('Analyzing changes since last synthesis...'));
  });

  test('should detect various project types correctly', () => {
    // Test 1: React project
    createFile('package.json', JSON.stringify({
      name: 'react-test-project',
      dependencies: {
        'react': '^18.0.0',
        'next': '^14.0.0',
        'express': '^4.18.0'
      },
      devDependencies: {
        'jest': '^29.0.0',
        'playwright': '^1.40.0'
      },
      scripts: { build: 'next build', dev: 'next dev', test: 'jest' }
    }, null, 2));

    createFile('jest.config.js', 'module.exports = {};');
    createFile('playwright.config.ts', 'import { defineConfig } from "@playwright/test";');
    createFile('README.md', '# React Project\n\nA Next.js application with testing.');

    const scanResult = runDroidForge('scan');
    assert(scanResult.success);

    const output = JSON.parse(scanResult.output);
    assert(output.signals.frameworks.includes('frontend'));
    assert(output.signals.frameworks.includes('backend'));
    assert(output.signals.frameworks.includes('testing'));
    assert(output.signals.testConfigs.length >= 2);
    assert(output.signals.prdPaths.includes('README.md'));
    assert(output.scripts.npmScripts.length >= 3);
  });

  test('should handle edge cases gracefully', () => {
    // Test empty repository
    const emptyResult = runDroidForge('scan');
    assert(emptyResult.success);

    const emptyOutput = JSON.parse(emptyResult.output);
    assert.deepEqual(emptyOutput.signals.prdPaths, []);
    assert.deepEqual(emptyOutput.signals.frameworks, []);
    assert.deepEqual(emptyOutput.signals.testConfigs, []);
    assert.equal(emptyOutput.scripts.files.length, 0);

    // Test repository with invalid package.json
    createFile('package.json', 'invalid json content');
    const invalidResult = runDroidForge('scan');
    assert(invalidResult.success); // Should not crash
  });

  test('should validate help and version commands', () => {
    const helpResult = runDroidForge('--help');
    assert(helpResult.success);
    assert(helpResult.output.includes('🤖 DroidForge'));
    assert(helpResult.output.includes('🚀 Quick Start'));
    assert(helpResult.output.includes('Commands'));

    const versionResult = runDroidForge('--version');
    assert(versionResult.success);
    assert(versionResult.output.includes('0.1.0'));
  });
});