# Human-in-the-Loop Workflow

HITL checkpoints ensure human oversight at key milestones.

## Core Principle

Human approval is required **after completing each major task** (not after every subtask). This balances oversight with agent autonomy.

## When to Stop

After Autopilot finishes all subtasks for a major task:

1. Mark the task done:
   ```bash
   npx task-master set-status --id=<taskId> --status=done
   ```

2. Post this announcement:
   ```
   ✅ MAJOR TASK COMPLETE
   =======================
   Task ID: [X]
   Title: [Task Title]
   
   Summary:
   - [What was implemented]
   - [Key decisions made]
   
   Tests: [PASS/FAIL]
   
   Awaiting your approval to proceed to next task.
   ```

3. **STOP. Do not start next task until human approves.**

## Human Response Options

| Response | Agent Action |
|----------|--------------|
| "Approved" / "Continue" | Proceed to next task |
| "Audit Task X" | Switch to Auditor mode, generate report |
| "Wait" / "Hold" | Do nothing until further instruction |
| "Fix [issue]" | Address the issue, then re-announce |

## Audit Phase (Optional but Recommended)

After implementation, before merge:

1. User says: "Audit Task X"
2. Agent reads `tdd/AUDITOR.md`
3. Agent runs tests, inspects code, generates report
4. Report goes in `docs/audits/audit-task-X.md`
5. If PASS: commit report, ready to merge
6. If FAIL: list issues for remediation

## Why This Matters

- Prevents runaway agents from making unwanted changes
- Creates natural review points
- Maintains human control over project direction
- Builds audit trail for compliance

