---
title: "Human-in-the-Loop Workflow"
description: "How agents work with human review between subtasks"
---

# Human-in-the-Loop Workflow

## 🎯 Core Principle

**Every major task completion requires human review before proceeding to the next major task.**

This ensures:
- Each major task is completed perfectly with zero errors
- Code quality is maintained through review
- Prevents cascading failures from incomplete work
- Allows for course correction between major tasks

## 📋 Workflow Steps

### For Each Major Task:

1. **Start work**
   ```bash
   npx task-master autopilot start <taskId>
   # or for manual: npx task-master set-status --id=<taskId> --status=in-progress
   ```

2. **Implement the task and all its subtasks**
   - Complete all subtasks within the task
   - Write code and tests for each subtask
   - Run tests to ensure they pass
   - Use `npx task-master update-subtask` and `update-task` to document progress

3. **Complete and commit all subtasks**
   ```bash
   # For Autopilot workflow (repeat for each subtask):
   npx task-master autopilot complete --phase=RED --tests="..."
   npx task-master autopilot complete --phase=GREEN --tests="..."
   npx task-master autopilot commit
   # Continue with next subtask until all are done

   # For Manual workflow:
   npx task-master set-status --id=<subtaskId> --status=done
   tm-commit -m "feat: implement subtask X"
   ```

4. **Mark major task complete**
   ```bash
   npx task-master set-status --id=<taskId> --status=done
   ```

5. **STOP and notify user** ⛔
   ```
   "Task X is complete. All subtasks finished. All tests passing. Ready for review before proceeding."
   ```

6. **Wait for user instruction** ⏸️
   - Do NOT start next major task
   - Do NOT run `autopilot next`
   - Do NOT assume you should continue
   - Wait for explicit: "Proceed to next task" or "Start task Y"

7. **When user approves, proceed to next major task**
   ```bash
   npx task-master autopilot start <nextTaskId>
   # or: npx task-master set-status --id=<nextTaskId> --status=in-progress
   ```

## ⚠️ Common Mistakes to Avoid

❌ **Wrong**: `autopilot commit` (final subtask) → immediately `autopilot next`
✅ **Correct**: Complete all subtasks → mark task done → notify user → wait for approval → `autopilot start <next>`

❌ **Wrong**: Assuming you should proceed after completing a major task
✅ **Correct**: Always wait for explicit user instruction after major task completion

❌ **Wrong**: Starting work on next major task without telling the user previous is done
✅ **Correct**: Clearly communicate completion and wait for next assignment

## 📝 Agent Communication Template

After completing a major task, say:

```
"Task {id} - {title} is now complete:

✅ All subtasks completed: {list subtasks}
✅ Implementation: {what was built}
✅ Tests: All {num} tests passing
✅ Documentation: {docs updated}
✅ Commits: {list commit hashes/messages}

Ready for your review before I proceed to the next major task."
```

## 🔧 When to Use `autopilot next`

The `autopilot next` command should **only** be used when:

1. User explicitly says: "Proceed to next major task" or "Start the next one"
2. You're resuming a workflow after a break: `autopilot resume` then `autopilot next`
3. User approves continuation after review

**Never use autopilot next automatically after completing a major task.**

## 🎯 Success Criteria

✅ Each major task completed perfectly with zero errors
✅ All subtasks within the task completed
✅ User notified after major task completion
✅ User reviews before next major task starts
✅ Explicit user approval to proceed
✅ Clear communication of what's done

## 🛡️ Lightweight Operational Guardrails

To keep Autopilot runs resilient without adding new tools:

- **Pre-flight snapshot** before starting: verify a clean working tree and, if a prior session exists, copy `.taskmaster/sessions/workflow-state.json` to a dated backup.
- **Health check after `autopilot status`**: ensure the reported `currentSubtask` matches the subtask table. If not, note the issue and run `autopilot resume` before continuing.
- **Document the RED→GREEN handoff**: when completing a phase, record the test command, outcome, and timestamp in session notes.
- **End-of-day wrap-up**: the on-duty agent captures `autopilot status` output (phase + subtask) and logs it for the next shift, calling out any anomalies.

## 📚 Related Documentation

- `docs/guides/taskmaster-guardrails.md` - Mandatory guardrails
- `docs/guides/autopilot-agent-runbook.md` - Autopilot execution sequence
- `scripts/agent-onboard.sh` (if available) - Automated onboarding script
