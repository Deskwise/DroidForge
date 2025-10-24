#!/usr/bin/env node

/**
 * DroidForge Parallel Orchestration POC
 * 
 * Spawns multiple droid exec processes to work on different phases in parallel.
 * Coordinates through shared files (PROGRESS.md, TODO lists).
 * 
 * Cross-platform: Works on Windows/Linux/macOS
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  repoRoot: __dirname,
  logDir: path.join(__dirname, 'logs'),
  staggerDelay: 30000, // 30 seconds between starts
  progressCheckInterval: 60000, // Check progress every minute
  autonomyLevel: 'medium',
  model: 'claude-sonnet-4-5-20250929'
};

// Workstream definitions
const WORKSTREAMS = [
  {
    name: 'CoreDev',
    phases: 'Phases 1-4',
    description: 'Synchronization, locks, deadlock detection, persistence',
    files: 'manager.ts, synchronization.ts, resourceLocks.ts, deadlockDetector.ts, persistence.ts',
    todoFile: 'TODO_WS1_CORE.md',
    priority: 'CRITICAL_PATH'
  },
  {
    name: 'IsolationDev',
    phases: 'Phase 5',
    description: 'Staging directories and atomic merging',
    files: 'staging.ts, merger.ts',
    todoFile: 'TODO_WS2_ISOLATION.md',
    priority: 'HIGH'
  },
  {
    name: 'InfraDev',
    phases: 'Phases 6, 7, 9',
    description: 'Event bus, resource matching, observability',
    files: 'eventBus.ts, resourceMatcher.ts, metrics.ts, healthCheck.ts',
    todoFile: 'TODO_WS3_INFRA.md',
    priority: 'MEDIUM'
  },
  {
    name: 'TestDev',
    phases: 'Phase 8',
    description: 'Comprehensive test suite for all phases',
    files: '__tests__/*.test.ts',
    todoFile: 'TODO_WS4_TESTS.md',
    priority: 'HIGH'
  }
];

// Utility functions
function ensureLogDir() {
  if (!fs.existsSync(CONFIG.logDir)) {
    fs.mkdirSync(CONFIG.logDir, { recursive: true });
  }
}

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  
  // Also append to main log file
  fs.appendFileSync(
    path.join(CONFIG.logDir, 'orchestrator.log'),
    logMessage + '\n'
  );
}

function createPromptForDroid(workstream) {
  return `You are ${workstream.name}, a specialized development agent working on DroidForge parallel orchestration.

## Your Assignment

**Phases:** ${workstream.phases}
**Description:** ${workstream.description}

## Required Reading (Read these first!)

1. PARALLELIZATION_ROADMAP.md - Your detailed instructions for ${workstream.phases}
2. INTERFACES.md - TypeScript interfaces you MUST follow
3. FILE_OWNERSHIP.md - Files you're allowed to modify
4. ${workstream.todoFile} - Your task checklist

## Your Files (YOU MAY ONLY MODIFY THESE)

${workstream.files}

## STRICT RULES

1. **File Boundaries:** Only modify files listed above. DO NOT touch other workstreams' files.
2. **Interfaces:** Follow all interfaces defined in INTERFACES.md exactly.
3. **Progress Updates:** Update ${workstream.todoFile} after completing each task.
4. **Status Reporting:** Update PROGRESS.md when you finish major milestones.
5. **Code Quality:** Write tests, use TypeScript strict mode, follow existing patterns.
6. **Dependencies:** If you need a dependency (like async-mutex), install it with npm install.

## Workflow

1. Read all required documents above
2. Work through tasks in ${workstream.todoFile} sequentially
3. Check off completed items with [x]
4. Update PROGRESS.md at milestones
5. Run tests as you go: npm test
6. Commit your work with clear messages

## Success Criteria

- All tasks in ${workstream.todoFile} complete
- All tests pass
- Code builds successfully (npm run build)
- No lint errors (npm run lint)
- Interfaces match INTERFACES.md
- Only your assigned files modified

Begin by reading the required documents, then start working through your TODO list.
Remember: You're working in parallel with other droids. Stay in your lane!`;
}

function spawnDroid(workstream, index) {
  return new Promise((resolve, reject) => {
    log(`Starting ${workstream.name} (${workstream.phases})...`);
    
    const prompt = createPromptForDroid(workstream);
    const logFile = path.join(CONFIG.logDir, `${workstream.name}.log`);
    const jsonLogFile = path.join(CONFIG.logDir, `${workstream.name}.json`);
    
    // Write prompt to file for reference
    fs.writeFileSync(
      path.join(CONFIG.logDir, `${workstream.name}-prompt.txt`),
      prompt
    );
    
    const args = [
      'exec',
      '--auto', CONFIG.autonomyLevel,
      '--model', CONFIG.model,
      '--output-format', 'json',
      '--cwd', CONFIG.repoRoot,
      prompt
    ];
    
    const droid = spawn('droid', args, {
      cwd: CONFIG.repoRoot,
      env: { ...process.env }
    });
    
    // Capture stdout to JSON log
    const jsonLogStream = fs.createWriteStream(jsonLogFile, { flags: 'a' });
    droid.stdout.pipe(jsonLogStream);
    
    // Capture stderr to text log
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    droid.stderr.pipe(logStream);
    
    droid.on('error', (error) => {
      log(`ERROR: ${workstream.name} failed to start: ${error.message}`, 'ERROR');
      reject(error);
    });
    
    droid.on('close', (code) => {
      if (code === 0) {
        log(`✓ ${workstream.name} completed successfully`);
        resolve({ workstream, code, success: true });
      } else {
        log(`✗ ${workstream.name} exited with code ${code}`, 'WARN');
        resolve({ workstream, code, success: false });
      }
    });
    
    return {
      pid: droid.pid,
      workstream,
      process: droid
    };
  });
}

async function checkProgress() {
  try {
    const progressPath = path.join(CONFIG.repoRoot, 'PROGRESS.md');
    if (fs.existsSync(progressPath)) {
      const content = fs.readFileSync(progressPath, 'utf-8');
      
      // Parse completion percentages
      const wsProgress = WORKSTREAMS.map(ws => {
        const regex = new RegExp(`${ws.name}.*?(\\d+)%`, 'i');
        const match = content.match(regex);
        return {
          name: ws.name,
          progress: match ? parseInt(match[1]) : 0
        };
      });
      
      const avgProgress = wsProgress.reduce((sum, ws) => sum + ws.progress, 0) / wsProgress.length;
      
      log(`Progress: ${wsProgress.map(ws => `${ws.name}=${ws.progress}%`).join(', ')} | Avg=${avgProgress.toFixed(1)}%`);
      
      return wsProgress;
    }
  } catch (error) {
    log(`Warning: Could not check progress: ${error.message}`, 'WARN');
  }
  return null;
}

async function runIntegrationTests() {
  log('Running integration tests...');
  
  return new Promise((resolve) => {
    const npm = spawn('npm', ['test'], {
      cwd: CONFIG.repoRoot,
      stdio: 'inherit'
    });
    
    npm.on('close', (code) => {
      if (code === 0) {
        log('✓ All tests passed');
        resolve(true);
      } else {
        log('✗ Tests failed', 'ERROR');
        resolve(false);
      }
    });
  });
}

async function runBuild() {
  log('Running build...');
  
  return new Promise((resolve) => {
    const npm = spawn('npm', ['run', 'build'], {
      cwd: CONFIG.repoRoot,
      stdio: 'inherit'
    });
    
    npm.on('close', (code) => {
      if (code === 0) {
        log('✓ Build successful');
        resolve(true);
      } else {
        log('✗ Build failed', 'ERROR');
        resolve(false);
      }
    });
  });
}

async function runLint() {
  log('Running lint...');
  
  return new Promise((resolve) => {
    const npm = spawn('npm', ['run', 'lint'], {
      cwd: CONFIG.repoRoot,
      stdio: 'inherit'
    });
    
    npm.on('close', (code) => {
      if (code === 0) {
        log('✓ Lint passed');
        resolve(true);
      } else {
        log('✗ Lint failed', 'ERROR');
        resolve(false);
      }
    });
  });
}

async function main() {
  const startTime = Date.now();
  
  log('='.repeat(80));
  log('DroidForge Parallel Orchestration POC');
  log('='.repeat(80));
  log(`Starting at ${new Date().toLocaleString()}`);
  log(`Repository: ${CONFIG.repoRoot}`);
  log(`Workstreams: ${WORKSTREAMS.length}`);
  log('');
  
  // Ensure log directory exists
  ensureLogDir();
  
  // Check prerequisites
  log('Checking prerequisites...');
  
  const requiredFiles = [
    'PARALLELIZATION_ROADMAP.md',
    'INTERFACES.md',
    'FILE_OWNERSHIP.md',
    'PROGRESS.md',
    ...WORKSTREAMS.map(ws => ws.todoFile)
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(CONFIG.repoRoot, file);
    if (!fs.existsSync(filePath)) {
      log(`ERROR: Required file missing: ${file}`, 'ERROR');
      log('Please create all coordination files before running.');
      process.exit(1);
    }
  }
  
  log('✓ All required files present');
  log('');
  
  // Start droids with staggered delays
  log('Starting droids in parallel (staggered)...');
  const droidPromises = [];
  
  for (let i = 0; i < WORKSTREAMS.length; i++) {
    const workstream = WORKSTREAMS[i];
    
    // Stagger starts to avoid API rate limits
    if (i > 0) {
      log(`Waiting ${CONFIG.staggerDelay / 1000}s before starting ${workstream.name}...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.staggerDelay));
    }
    
    droidPromises.push(spawnDroid(workstream, i));
  }
  
  log('');
  log('All droids started! Monitoring progress...');
  log('You can monitor progress in real-time:');
  log(`  - Overall: cat PROGRESS.md`);
  log(`  - Logs: tail -f logs/*.log`);
  log('  - Droids: ps aux | grep "droid exec"`);
  log('');
  
  // Monitor progress while droids work
  const progressInterval = setInterval(async () => {
    await checkProgress();
  }, CONFIG.progressCheckInterval);
  
  // Wait for all droids to complete
  log('Waiting for all droids to complete...');
  const results = await Promise.all(droidPromises);
  
  clearInterval(progressInterval);
  
  // Summary
  log('');
  log('='.repeat(80));
  log('EXECUTION SUMMARY');
  log('='.repeat(80));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  
  results.forEach(result => {
    const status = result.success ? '✓' : '✗';
    log(`${status} ${result.workstream.name}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  });
  
  log('');
  log(`Total workstreams: ${results.length}`);
  log(`Successful: ${successful}`);
  log(`Failed: ${failed}`);
  
  const endTime = Date.now();
  const durationMs = endTime - startTime;
  const durationHours = (durationMs / 1000 / 60 / 60).toFixed(2);
  
  log(`Total time: ${durationHours} hours`);
  log('');
  
  // Run integration checks if all succeeded
  if (failed === 0) {
    log('All droids completed successfully! Running integration checks...');
    log('');
    
    const testsPass = await runIntegrationTests();
    const buildPass = await runBuild();
    const lintPass = await runLint();
    
    log('');
    log('='.repeat(80));
    log('FINAL RESULTS');
    log('='.repeat(80));
    log(`Tests: ${testsPass ? '✓ PASS' : '✗ FAIL'}`);
    log(`Build: ${buildPass ? '✓ PASS' : '✗ FAIL'}`);
    log(`Lint: ${lintPass ? '✓ PASS' : '✗ FAIL'}`);
    
    if (testsPass && buildPass && lintPass) {
      log('');
      log('🎉 SUCCESS! All droids completed and integration passed! 🎉');
      log('');
      log('Next steps:');
      log('1. Review git diff to see changes');
      log('2. Test the changes manually');
      log('3. Create a PR or commit to main');
      log('4. Document learnings in PARALLEL_POC_TESTING_METHODOLOGY.md');
      
      process.exit(0);
    } else {
      log('');
      log('⚠️ Some integration checks failed. Review logs for details.');
      process.exit(1);
    }
  } else {
    log('');
    log(`⚠️ ${failed} workstream(s) failed. Check logs for details.`);
    log('You can:');
    log('1. Review logs in logs/ directory');
    log('2. Fix issues and restart failed workstreams');
    log('3. Continue with successful workstreams');
    
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('');
  log('Received SIGINT. Gracefully shutting down...');
  log('Note: Droids will continue running. Kill them manually if needed:');
  log('  pkill -f "droid exec"');
  process.exit(130);
});

// Run main function
main().catch(error => {
  log(`FATAL ERROR: ${error.message}`, 'ERROR');
  console.error(error);
  process.exit(1);
});
