import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { readDroidMetadata, readDroidMetadataWithType } from '../../dist/writers/shared/readDroidMetadata.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

describe('readDroidMetadata', () => {
  const testDir = './tmp-test-droids';

  function createTestDroid(name, content) {
    const droidDir = join(testDir, '.factory', 'droids');
    mkdirSync(droidDir, { recursive: true });
    writeFileSync(join(droidDir, `${name}.md`), content, 'utf8');
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

  test('should read valid droid files and return metadata', async () => {
    const droidContent = `---
name: test-droid
role: Test Assistant
description: A test droid
tools:
  - read
  - write
scope:
  - test
procedure:
  - test procedure
proof: test proof
---`;

    createTestDroid('test-droid', droidContent);

    const droids = await readDroidMetadata(testDir);

    assert.equal(droids.length, 1);
    assert.equal(droids[0].name, 'test-droid');
    assert.equal(droids[0].role, 'Test Assistant');
    assert.equal(droids[0].description, 'A test droid');
    assert.deepEqual(droids[0].tools, ['read', 'write']);
    assert.deepEqual(droids[0].scope, ['test']);
    assert.deepEqual(droids[0].procedure, ['test procedure']);
    assert.equal(droids[0].proof, 'test proof');
  });

  test('should handle multiple droid files', async () => {
    const droid1Content = `---
name: droid-1
role: Role 1
description: First droid
tools:
  - read
scope:
  - src
procedure:
  - procedure 1
proof: proof 1
---`;

    const droid2Content = `---
name: droid-2
role: Role 2
description: Second droid
tools:
  - write
scope:
  - docs
procedure:
  - procedure 2
proof: proof 2
---`;

    createTestDroid('droid-1', droid1Content);
    createTestDroid('droid-2', droid2Content);

    const droids = await readDroidMetadata(testDir);

    assert.equal(droids.length, 2);
    assert.equal(droids[0].name, 'droid-1');
    assert.equal(droids[1].name, 'droid-2');
  });

  test('should filter out droids missing both name and role', async () => {
    const invalidContent = `---
description: Invalid droid
tools: []
scope: []
procedure: []
proof: ''
---`;

    createTestDroid('invalid', invalidContent);

    const droids = await readDroidMetadata(testDir);

    assert.equal(droids.length, 0);
  });

  test('should use fallback name when role exists but name is missing', async () => {
    const droidContent = `---
role: Test Assistant
description: A test droid
tools:
  - read
scope:
  - test
procedure:
  - test procedure
proof: test proof
---`;

    createTestDroid('test-droid', droidContent);

    const droids = await readDroidMetadata(testDir);

    assert.equal(droids.length, 1);
    // The fallback name should be the role when name is missing
    assert.equal(droids[0].name, 'Test Assistant');
    assert.equal(droids[0].role, 'Test Assistant');
  });

  test('should handle empty factory directory', async () => {
    const droids = await readDroidMetadata(testDir);
    assert.equal(droids.length, 0);
  });

  test('should handle malformed YAML gracefully', async () => {
    const malformedContent = `---
name: malformed-droid
role: test
description: Bad YAML
tools:
  - read
  - unclosed array [
scope:
procedure:
proof: test
---`;

    createTestDroid('malformed', malformedContent);

    const droids = await readDroidMetadata(testDir);

    assert.equal(droids.length, 0);
  });
});

describe('readDroidMetadataWithType', () => {
  const testDir = './tmp-test-droids-type';

  function createTestDroid(name, content) {
    const droidDir = join(testDir, '.factory', 'droids');
    mkdirSync(droidDir, { recursive: true });
    writeFileSync(join(droidDir, `${name}.md`), content, 'utf8');
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

  test('should infer script type for script- prefixed droids', async () => {
    const droidContent = `---
name: script-build
role: Build Script
description: Build script droid
tools:
  - shell
scope:
  - build
procedure:
  - run build
proof: echo "build complete"
---`;

    createTestDroid('script-build', droidContent);

    const droids = await readDroidMetadataWithType(testDir);

    assert.equal(droids.length, 1);
    assert.equal(droids[0].type, 'script');
  });

  test('should infer script type for npm- prefixed droids', async () => {
    const droidContent = `---
name: npm-install
role: Install Dependencies
description: Install npm packages
tools:
  - shell
scope:
  - npm
procedure:
  - npm install
proof: npm list
---`;

    createTestDroid('npm-install', droidContent);

    const droids = await readDroidMetadataWithType(testDir);

    assert.equal(droids.length, 1);
    assert.equal(droids[0].type, 'script');
  });

  test('should infer generic type for known generic droids', async () => {
    const droidContent = `---
name: planner
role: Project Planner
description: Plans project work
tools:
  - read
scope:
  - docs
procedure:
  - analyze docs
proof: echo "plan complete"
---`;

    createTestDroid('planner', droidContent);

    const droids = await readDroidMetadataWithType(testDir);

    assert.equal(droids.length, 1);
    assert.equal(droids[0].type, 'generic');
  });

  test('should infer contextual type for other droids', async () => {
    const droidContent = `---
name: api-developer
role: API Developer
description: Develops APIs
tools:
  - read
  - write
scope:
  - src/api
procedure:
  - develop api
proof: curl tests
---`;

    createTestDroid('api-developer', droidContent);

    const droids = await readDroidMetadataWithType(testDir);

    assert.equal(droids.length, 1);
    assert.equal(droids[0].type, 'contextual');
  });
});