---
title: "Human-in-the-Loop Workflow"
description: "How agents work with human review between subtasks"
---

# Human-in-the-Loop Workflow

## 🎯 Core Principle

**Every subtask completion requires human review before proceeding to the next subtask.**

This ensures:
- Each subtask is completed perfectly with zero errors
- Code quality is maintained through review
- Prevents cascading failures from incomplete work
- Allows for course correction between subtasks

## 📋 Workflow Steps

### For Each Subtask:

1. **Start work**
   ```bash
   npx task-master autopilot start <subtaskId>
   # or for manual: npx task-master set-status --id=<subtaskId> --status=in-progress
   ```

2. **Implement the subtask**
   - Write code
   - Write/update tests
   - Run tests to ensure they pass
   - Use `npx task-master update-subtask` to document progress

3. **Complete and commit**
   ```bash
   # For Autopilot workflow:
   npx task-master autopilot complete --phase=RED --tests="..."
   npx task-master autopilot complete --phase=GREEN --tests="..."
   npx task-master autopilot commit

   # For Manual workflow:
   npx task-master set-status --id=<subtaskId> --status=done
   tm-commit -m "feat: implement subtask X"
   ```

4. **STOP and notify user** ⛔
   ```
   "Subtask X is complete. All tests passing. Ready for review before proceeding."
   ```

5. **Wait for user instruction** ⏸️
   - Do NOT start next subtask
   - Do NOT run `autopilot next`
   - Do NOT assume you should continue
   - Wait for explicit: "Proceed to next subtask" or "Start subtask Y"

6. **When user approves, proceed to next subtask**
   ```bash
   npx task-master autopilot start <nextSubtaskId>
   # or: npx task-master set-status --id=<nextSubtaskId> --status=in-progress
   ```

## ⚠️ Common Mistakes to Avoid

❌ **Wrong**: `autopilot commit` → immediately `autopilot next`
✅ **Correct**: `autopilot commit` → notify user → wait for approval → `autopilot start <next>`

❌ **Wrong**: Assuming you should proceed after commit
✅ **Correct**: Always wait for explicit user instruction

❌ **Wrong**: Starting work on next subtask without telling the user previous is done
✅ **Correct**: Clearly communicate completion and wait for next assignment

## 📝 Agent Communication Template

After completing a subtask, say:

```
"Subtask {id} - {title} is now complete:

✅ Implementation: {what was built}
✅ Tests: All {num} tests passing
✅ Documentation: {docs updated}
✅ Commit: {hash} - {message}

Ready for your review before I proceed to the next subtask."
```

## 🔧 When to Use `autopilot next`

The `autopilot next` command should **only** be used when:

1. User explicitly says: "Proceed to next subtask" or "Start the next one"
2. You're resuming a workflow after a break: `autopilot resume` then `autopilot next`
3. User approves continuation after review

**Never use autopilot next automatically after commit.**

## 🎯 Success Criteria

✅ Each subtask completed perfectly with zero errors
✅ User notified after each subtask completion
✅ User reviews before next subtask starts
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
