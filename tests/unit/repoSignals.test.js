import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { scanRepo } from '../../dist/detectors/repoSignals.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

describe('scanRepo', () => {
  const testDir = './tmp-test-repo';
  const originalCwd = process.cwd();

  function createFile(path, content) {
    const fullPath = join(testDir, path);
    mkdirSync(fullPath.split('/').slice(0, -1).join('/'), { recursive: true });
    writeFileSync(fullPath, content, 'utf8');
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

  test('should detect README.md file', async () => {
    createFile('README.md', '# Test Project\n\nThis is a test project.');

    const result = await scanRepo('.');

    assert.deepEqual(result.prdPaths, ['README.md']);
  });

  test('should detect PRD files in various locations', async () => {
    createFile('docs/prd/project.md', '# Project PRD\n\nVision: Build something great.');
    createFile('docs/requirements/feature.md', '# Feature PRD');
    createFile('prd/technical.md', '# Technical PRD');

    const result = await scanRepo('.');

    assert.deepEqual(result.prdPaths.sort(), [
      'docs/prd/project.md',
      'docs/requirements/feature.md',
      'prd/technical.md'
    ]);
  });

  test('should parse PRD content correctly', async () => {
    const prdContent = `# Project Vision

## Vision
Build amazing software that changes the world.

## Features
- Feature 1: User authentication
- Feature 2: Real-time collaboration
- Feature 3: Analytics dashboard

## Acceptance Criteria
- Users can log in securely
- Multiple users can collaborate in real-time
- Analytics dashboard shows meaningful insights`;

    createFile('README.md', prdContent);

    const result = await scanRepo('.');

    assert(result.prdContent);
    assert(result.prdContent.vision.includes('Build amazing software'));
    assert.equal(result.prdContent.features.length, 3);
    assert.equal(result.prdContent.acceptanceCriteria.length, 3);
  });

  test('should detect frontend frameworks from package.json', async () => {
    const packageJson = {
      dependencies: {
        'react': '^18.0.0',
        'next': '^14.0.0',
        'vue': '^3.0.0',
        'express': '^4.18.0'
      },
      devDependencies: {
        'vite': '^5.0.0',
        'svelte': '^4.0.0'
      }
    };

    createFile('package.json', JSON.stringify(packageJson, null, 2));

    const result = await scanRepo('.');

    assert(result.frameworks.includes('frontend'));
    assert(result.frameworks.includes('backend'));
  });

  test('should detect testing frameworks from package.json', async () => {
    const packageJson = {
      devDependencies: {
        'jest': '^29.0.0',
        'vitest': '^1.0.0',
        'playwright': '^1.40.0',
        'cypress': '^13.0.0',
        'mocha': '^10.0.0'
      }
    };

    createFile('package.json', JSON.stringify(packageJson, null, 2));

    const result = await scanRepo('.');

    assert(result.frameworks.includes('testing'));
  });

  test('should detect motion frameworks', async () => {
    const packageJson = {
      dependencies: {
        'framer-motion': '^10.0.0'
      }
    };

    createFile('package.json', JSON.stringify(packageJson, null, 2));

    const result = await scanRepo('.');

    assert(result.frameworks.includes('motion'));
  });

  test('should detect test configuration files', async () => {
    createFile('jest.config.js', 'module.exports = {};');
    createFile('vitest.config.ts', 'import { defineConfig } from "vitest/config";');
    createFile('playwright.config.ts', 'import { defineConfig } from "@playwright/test";');
    createFile('cypress.config.js', 'module.exports = {};');
    createFile('pytest.ini', '[pytest]');

    const result = await scanRepo('.');

    assert.equal(result.testConfigs.length, 5);
    assert(result.testConfigs.some(file => file.includes('jest.config.js')));
    assert(result.testConfigs.some(file => file.includes('vitest.config.ts')));
    assert(result.testConfigs.some(file => file.includes('playwright.config.ts')));
    assert(result.testConfigs.some(file => file.includes('cypress.config.js')));
    assert(result.testConfigs.some(file => file.includes('pytest.ini')));
  });

  test('should handle empty repository', async () => {
    const result = await scanRepo('.');

    assert.deepEqual(result.prdPaths, []);
    assert.deepEqual(result.frameworks, []);
    assert.deepEqual(result.testConfigs, []);
    assert.equal(result.prdContent, null);
  });

  test('should merge content from multiple PRD files', async () => {
    createFile('README.md', `# Main Project

## Vision
Create the best product ever.

## Features
- Core feature: User management
`);

    createFile('docs/prd/technical.md', `# Technical PRD

## Vision
With modern architecture.

## Features
- Technical feature: API endpoints
- Another feature: Database schema
`);

    const result = await scanRepo('.');

    assert(result.prdContent);
    assert(result.prdContent.vision.includes('Create the best product ever.'));
    assert(result.prdContent.vision.includes('With modern architecture.'));
    assert.equal(result.prdContent.features.length, 3);
  });

  test('should handle repository without package.json', async () => {
    createFile('README.md', '# Simple Project\n\nNo package.json here.');

    const result = await scanRepo('.');

    assert.deepEqual(result.frameworks, []);
    assert.deepEqual(result.testConfigs, []);
    assert.deepEqual(result.prdPaths, ['README.md']);
  });
});