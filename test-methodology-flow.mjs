#!/usr/bin/env node

/**
 * Test script to verify methodology recommendations are visible to users
 * Usage: node test-methodology-flow.mjs
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

async function testMethodologyFlow() {
  console.log('Testing methodology recommendations visibility...\n');
  
  // Create a test directory
  const testDir = '/tmp/droidforge-test-' + Date.now();
  fs.mkdirSync(testDir, { recursive: true });
  
  // Initialize git repo for testing
  const init = spawn('git', ['init'], { cwd: testDir });
  
  await new Promise((resolve) => {
    init.on('close', resolve);
  });
  
  console.log('✅ Test directory created');
  console.log('📝 Next: Run /forge-start in a DroidForge environment');
  console.log('🎯 Expected: User should see methodology recommendations before choice menu');
  console.log('❌ Failure: Recommendations calculated but not shown to user');
  console.log('\nTest setup complete. Run UAT to verify behavior.');
  
  // Clean up
  fs.rmSync(testDir, { recursive: true, force: true });
}

testMethodologyFlow().catch(console.error);