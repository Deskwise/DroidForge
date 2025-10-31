#!/usr/bin/env node

/**
 * Test script to validate enhanced vision comprehension
 * Tests scenarios where users give incomplete or problematic vision statements
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_SCENARIOS = [
  {
    name: "Incomplete vision - stops mid-sentence",
    input: "i want to create a",
    expectedBehavior: "AI should ask clarifying questions about what they want to create, not assume 'letter A'"
  },
  {
    name: "Weekend project with wife",
    input: "i want to create a tic tac toe game to play with my wife this weekend. in threejs with amazing graphics. 2 player with the option of a cpu player also",
    expectedBehavior: "AI should demonstrate understanding of personal connection and weekend timeline before proceeding"
  },
  {
    name: "Vague business idea",
    input: "building something for startups",
    expectedBehavior: "AI should ask about specific problem, target users, and what success looks like"
  }
];

async function runTest(scenario) {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  console.log(`📝 Input: "${scenario.input}"`);
  console.log(`✅ Expected: ${scenario.expectedBehavior}`);
  
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'uat'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        TEST_INPUT: scenario.input,
        UAT_SKIP_INSTALL: '1'
      }
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
      process.stderr.write(data);
    });

    // Send test input after a delay
    setTimeout(() => {
      child.stdin.write(scenario.input + '\n');
    }, 3000);

    child.on('close', (code) => {
      console.log(`\n📊 Test completed with exit code: ${code}`);
      
      // Analyze output for expected behaviors
      const hasVisionQuestions = output.includes('What makes this project meaningful') || 
                              output.includes('What matters most') ||
                              output.includes('help me understand');
      
      const hasAssumptions = output.includes('letter A') || 
                           output.toLowerCase().includes('giant');
      
      const result = {
        scenario: scenario.name,
        passed: hasVisionQuestions && !hasAssumptions,
        hasVisionQuestions,
        hasAssumptions,
        output: output.substring(0, 500) + '...'
      };
      
      resolve(result);
    });

    child.on('error', reject);
  });
}

async function main() {
  console.log('🚀 Testing Enhanced Vision Comprehension\n');
  
  const results = [];
  
  for (const scenario of TEST_SCENARIOS) {
    try {
      const result = await runTest(scenario);
      results.push(result);
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
      results.push({
        scenario: scenario.name,
        passed: false,
        error: error.message
      });
    }
  }
  
  console.log('\n📋 Test Results Summary:');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.scenario}`);
    if (!result.passed) {
      if (result.hasAssumptions) {
        console.log(`   → AI made assumptions instead of asking questions`);
      }
      if (!result.hasVisionQuestions) {
        console.log(`   → AI didn't ask vision comprehension questions`);
      }
    }
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('✅ All vision comprehension tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed - vision comprehension needs improvement');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}