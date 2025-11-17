#!/usr/bin/env node

// DroidForge TODO Sync Script
// Synchronizes docs/todo metrics with Task Master status using the task-master CLI

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = dirname(__dirname);
const TODO_DIR = join(PROJECT_ROOT, 'docs', 'todo');

function computeStats(tasks) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress' || t.status === 'in_progress').length;
  const pendingTasks = Math.max(totalTasks - completedTasks - inProgressTasks, 0);

  let totalSubtasks = 0;
  let completedSubtasks = 0;

  for (const task of tasks) {
    if (Array.isArray(task.subtasks)) {
      totalSubtasks += task.subtasks.length;
      completedSubtasks += task.subtasks.filter(st => st.status === 'done').length;
    }
  }

  const pendingSubtasks = Math.max(totalSubtasks - completedSubtasks, 0);
  const completionPercentage = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const subtaskCompletionPercentage = totalSubtasks ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    pendingTasks,
    totalSubtasks,
    completedSubtasks,
    pendingSubtasks,
    completionPercentage,
    subtaskCompletionPercentage
  };
}

function updateMarkdownFile(filePath, replacements) {
  try {
    let content = readFileSync(filePath, 'utf8');

    for (const [pattern, replacement] of replacements) {
      content = content.replace(new RegExp(pattern, 'g'), replacement);
    }

    writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.warn(`Warning: could not update ${filePath}: ${error.message}`);
    return false;
  }
}

console.log('DroidForge TODO Sync');
console.log('====================');
console.log('Getting Task Master status (task-master list --with-subtasks --json)...');

try {
  const tmOutput = execSync('task-master list --with-subtasks --json', {
    encoding: 'utf8',
    cwd: PROJECT_ROOT
  });

  const taskData = JSON.parse(tmOutput);
  const tasks = Array.isArray(taskData.tasks) ? taskData.tasks : [];

  const stats = computeStats(tasks);

  console.log(`Tasks: ${stats.completedTasks}/${stats.totalTasks} (${stats.completionPercentage}%)`);
  console.log(`Subtasks: ${stats.completedSubtasks}/${stats.totalSubtasks} (${stats.subtaskCompletionPercentage}%)`);

  // Rewrite completion-metrics.md from current Task Master stats
  const metricsFile = join(TODO_DIR, 'completion-metrics.md');
  const metricsContent = `# Project Completion Metrics

## Overall Progress

### Phase 1 MVP: Intelligent Onboarding + Safe Serial Execution
- **Total Tasks:** ${stats.totalTasks}
- **Completed:** ${stats.completedTasks} (${stats.completionPercentage}%)
- **In Progress:** ${stats.inProgressTasks}
- **Pending:** ${stats.pendingTasks}

### Subtask Progress
- **Total Subtasks:** ${stats.totalSubtasks}
- **Completed:** ${stats.completedSubtasks} (${stats.subtaskCompletionPercentage}%)
- **Pending:** ${stats.pendingSubtasks}

## Task Area Breakdown

### 1. Intelligent Onboarding (Tasks 1-5)
- Task 1: Core data model and session state
- Task 2: AI-powered data extraction
- Task 3: Conversational follow-up logic
- Task 4: Methodology recommendation engine
- Task 5: Onboarding session management

### 2. Droid Roster Generation (Task 6)
- Task 6: Roster generation service

### 3. Safe Serial Execution (Tasks 7-9)
- Task 7: Execution manager core
- Task 8: Atomic worktree management
- Task 9: Resource locking system

### 4. Observability and Operations (Tasks 10-11)
- Task 10: Structured logging framework
- Task 11: Cleanup and revert tools

### 5. UAT and Documentation (Task 12)
- Task 12: UAT scripts and documentation

## Velocity Tracking

### Recent Completions
- Task 1: Completed 2025-11-14 (data model and deep merge)
- Task 2: Completed 2025-11-17 (AI parsing implementation)

### Current Sprint Velocity
- Tasks completed this sprint: 2
- Average task duration: about 3 days
- Sprint goal: complete Tasks 3–5 (Intelligent Onboarding)

## Blockers and Risks

### Current Blockers
- None identified

### Potential Risks
- Tasks 3–5 dependency chain could cause delays
- Task 6 (roster generation) has complex template dependencies
- Tasks 7–9 (execution) require careful Git workspace management

## Success Criteria

### Phase 1 complete when:
- All 12 tasks are marked "done" in Task Master
- Full end-to-end onboarding flow works
- Safe serial execution is demonstrated
- All tests pass via npm test
- Documentation is updated and UAT scripts pass

### Next milestone: Intelligent Onboarding complete
- Tasks 1–5 are completed
- A user can complete the full onboarding experience
- Methodology selection works
- Session persistence is validated
`;

  writeFileSync(metricsFile, metricsContent, 'utf8');
  console.log('Updated docs/todo/completion-metrics.md');

  // Determine status for a few key tasks
  const byId = id => tasks.find(t => t.id === id);
  const task1 = byId('1');
  const task2 = byId('2');
  const task3 = byId('3');

  const status1 = task1 && task1.status ? task1.status : 'unknown';
  const status2 = task2 && task2.status ? task2.status : 'unknown';
  const status3 = task3 && task3.status ? task3.status : 'unknown';

  // Update sync metadata
  const syncFile = join(TODO_DIR, 'task-master-sync.md');
  const today = new Date().toISOString().split('T')[0];

  updateMarkdownFile(syncFile, [
    ['\\*\\*Last Sync:\\*\\* \\d{4}-\\d{2}-\\d{2}', `**Last Sync:** ${today}`],
    ['\\*\\*Action:\\*.*', '**Action:** Auto-sync via scripts/sync-todo.mjs']
  ]);

  console.log('Task status overview:');
  console.log(`  Task 1: ${status1}`);
  console.log(`  Task 2: ${status2}`);
  console.log(`  Task 3: ${status3}`);

  console.log('Next actions based on Task Master:');
  if (status1 !== 'done') {
    console.log('  - Complete Task 1: Core onboarding data model and session state');
  }
  if (status2 !== 'done') {
    console.log('  - Complete Task 2: AI-powered data extraction');
  }
  if (status3 === 'done') {
    console.log('  - Start Task 4: Methodology recommendation engine');
  } else if (status3 === 'in-progress' || status3 === 'in_progress') {
    console.log('  - Continue Task 3: Conversational follow-up logic');
  } else {
    console.log('  - Start Task 3: Conversational follow-up logic');
  }

  console.log('');
  console.log('TODO sync complete.');
  console.log(`Metrics file: ${metricsFile}`);
  console.log(`Sync status file: ${syncFile}`);
} catch (error) {
  console.error('Failed to sync TODO:', error.message);
  process.exit(1);
}
