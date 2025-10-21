import fs from 'node:fs/promises';
import path from 'node:path';
import { readDroidMetadata, readDroidMetadataWithType } from '../readDroidMetadata.js';

// Simple test framework
async function runTest(testName: string, testFn: () => Promise<void>) {
  try {
    await testFn();
    console.log(`✅ ${testName}`);
  } catch (error) {
    console.error(`❌ ${testName}:`, error);
    process.exit(1);
  }
}

// Test data
const testDroid1 = `---
name: test-droid-1
role: Testing Assistant
description: A test droid for verification
tools:
  - read
  - write
scope:
  - testing
procedure:
  - test procedures
proof: Test proof
---`;

const testDroid2 = `---
name: script-npm-install
role: Package Installer
description: Installs npm packages
tools:
  - shell
scope:
  - packages
procedure:
  - install packages
proof: Installation proof
---`;

async function setupTestDirectory() {
  const testDir = './tmp-test-droids';
  const droidsDir = path.join(testDir, '.factory', 'droids');

  // Create test directory structure
  await fs.rm(testDir, { recursive: true, force: true });
  await fs.mkdir(droidsDir, { recursive: true });

  // Write test droid files
  await fs.writeFile(path.join(droidsDir, 'test-droid-1.md'), testDroid1);
  await fs.writeFile(path.join(droidsDir, 'script-npm-install.md'), testDroid2);

  return testDir;
}

async function cleanupTestDirectory(testDir: string) {
  await fs.rm(testDir, { recursive: true, force: true });
}

async function testReadDroidMetadataReturnsObjectsNotPromises() {
  const testDir = await setupTestDirectory();

  try {
    const droids = await readDroidMetadata(testDir);

    // Verify we get an array
    if (!Array.isArray(droids)) {
      throw new Error('Expected array, got ' + typeof droids);
    }

    // Verify we get the expected number of droids
    if (droids.length !== 2) {
      throw new Error(`Expected 2 droids, got ${droids.length}`);
    }

    // Verify each item is a plain object, not a Promise
    for (const droid of droids) {
      if (typeof droid !== 'object' || droid === null) {
        throw new Error(`Expected object, got ${typeof droid}`);
      }

      // Verify it's not a Promise
      if (droid instanceof Promise) {
        throw new Error('Got Promise instead of plain object');
      }

      // Verify required fields exist and are correct types
      if (typeof droid.name !== 'string') {
        throw new Error(`Expected string name, got ${typeof droid.name}`);
      }

      if (typeof droid.description !== 'string') {
        throw new Error(`Expected string description, got ${typeof droid.description}`);
      }

      if (!Array.isArray(droid.tools)) {
        throw new Error(`Expected array tools, got ${typeof droid.tools}`);
      }

      if (typeof droid.proof !== 'string') {
        throw new Error(`Expected string proof, got ${typeof droid.proof}`);
      }
    }

    // Verify specific droid data
    const droid1 = droids.find(d => d.name === 'test-droid-1');
    if (!droid1) {
      throw new Error('test-droid-1 not found');
    }
    if (droid1.role !== 'Testing Assistant') {
      throw new Error(`Expected role 'Testing Assistant', got '${droid1.role}'`);
    }

    const droid2 = droids.find(d => d.name === 'script-npm-install');
    if (!droid2) {
      throw new Error('script-npm-install not found');
    }
    if (droid2.tools.length !== 1 || droid2.tools[0] !== 'shell') {
      throw new Error(`Expected ['shell'], got ${JSON.stringify(droid2.tools)}`);
    }

  } finally {
    await cleanupTestDirectory(testDir);
  }
}

async function testReadDroidMetadataWithType() {
  const testDir = await setupTestDirectory();

  try {
    const droids = await readDroidMetadataWithType(testDir);

    // Verify we get an array
    if (!Array.isArray(droids)) {
      throw new Error('Expected array, got ' + typeof droids);
    }

    // Verify each droid has a type field
    for (const droid of droids) {
      if (!('type' in droid)) {
        throw new Error('Droid missing type field');
      }

      if (!['generic', 'script', 'contextual'].includes(droid.type)) {
        throw new Error(`Invalid type: ${droid.type}`);
      }
    }

    // Verify specific type inference
    const scriptDroid = droids.find(d => d.name === 'script-npm-install');
    if (!scriptDroid || scriptDroid.type !== 'script') {
      throw new Error(`script-npm-install should have type 'script', got '${scriptDroid?.type}'`);
    }

    const regularDroid = droids.find(d => d.name === 'test-droid-1');
    if (!regularDroid || regularDroid.type !== 'contextual') {
      throw new Error(`test-droid-1 should have type 'contextual', got '${regularDroid?.type}'`);
    }

  } finally {
    await cleanupTestDirectory(testDir);
  }
}

async function testWritersCanProcessResults() {
  const testDir = await setupTestDirectory();

  try {
    // This test ensures that downstream writers don't throw when processing the results
    const droids = await readDroidMetadata(testDir);

    // Simulate what writers do with the data
    const names = droids.map(d => d.name);
    const roles = droids.map(d => d.role || 'No role');
    const toolsList = droids.map(d => d.tools.join(', '));

    if (names.length !== 2 || roles.length !== 2 || toolsList.length !== 2) {
      throw new Error('Writers would not receive expected data structure');
    }

    // Verify data is usable in template-like operations
    for (const droid of droids) {
      const summary = `${droid.name} (${droid.role || 'No role'}) - Tools: ${droid.tools.join(', ')}`;
      if (typeof summary !== 'string' || summary.length === 0) {
        throw new Error('Generated summary would be invalid for writers');
      }
    }

  } finally {
    await cleanupTestDirectory(testDir);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Running readDroidMetadata unit tests...\n');

  await runTest('readDroidMetadata returns objects not promises', testReadDroidMetadataReturnsObjectsNotPromises);
  await runTest('readDroidMetadataWithType adds type field', testReadDroidMetadataWithType);
  await runTest('Writers can process results without errors', testWritersCanProcessResults);

  console.log('\n✅ All tests passed! The Promise.all fix is working correctly.');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { testReadDroidMetadataReturnsObjectsNotPromises, testReadDroidMetadataWithType, testWritersCanProcessResults };