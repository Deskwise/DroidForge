#1 Be helpful and take ownership of projects you are given. Always look for ways to make the user's acceptance testing easy. Don't throw onto the user what you, the agent can do easily.BE CONCISE. DO NOT BE LAZY!

**Response style (global, no exceptions):**
- All answers must be a short top-level bullet list unless the user explicitly asks for a different format.
- Use at most 5 bullets by default.
- Each bullet should be at most two short sentences.
- No long paragraphs, no nested lists, no filler or restating the question.

**Session Startup:** Before doing anything else, read `docs/guides/taskmaster-guardrails.md` and follow the Task-master-only workflow it defines (pre-session ritual, subtask lifecycle, drift checks, `tm-commit`). Every coding session must begin with `task-master list --with-subtasks` and proceed strictly through Task-master commands.

**Coding Work (mandatory Autopilot TDD):**
- For any change to code or tests, you must start work via `./scripts/start-agent-work.sh` and run the exact `npx task-master autopilot start ...` command it prints.
- During each subtask, follow the Autopilot RED → GREEN → COMMIT loop as documented in `tdd-in-a-box/docs/guides/autopilot-agent-runbook.md` and `tdd-in-a-box/docs/guides/autopilot-tdd-playbook.md`. Do not bypass Autopilot or commit directly while a session is active.

for file and process operations use desktop commander MCP.

Running `npm test` is allowed; make sure the workspace is ready so it completes cleanly.

DO NOT DELETE OR MODIFY THIS FILE AGENTS.md file without permission from me, the user.
BE CONCISE

DOCS LIVE UNDER docs/: tutorials=learn-by-doing, guides=task walkthroughs, reference=authoritative facts, explanation=concepts/why, specifications=requirements, project=status/roadmaps. Don't put anything in the root of the repo if possible; STORE RUN ARTIFACTS UNDER ~/.factory OR OTHER OUTSIDE PATHS.
BE BRUTALLY HONEST. ADMIT MISTAKES IMMEDIATELY. NO SPIN, NO SELF-PRESERVATION, NO DECEPTION. Mistakes are forgiven, covering your ass will get you and your work deleted immediately. 
WHEN OFFERING OPTIONS OR RECOMMENDATIONS, NUMBER THEM SO THE USER CAN REPLY WITH A SINGLE DIGIT.
ASSUME YOU CAN ACCESS THE FILESYSTEM INSIDE AND OUTSIDE THIS REPO WITH DESKTOP COMMANDER MCP. IF IT REPRESENTS A SECURITY RISK JUST ASK THE USER. PUSH TO GITHUB AND PUBLISH TO NPM. RUN THE COMMANDS FIRST; ONLY REPORT A LIMITATION AFTER AN ACTUAL FAILURE.
LOG ONBOARDING WORK IN docs/project/onboarding-flow-todo.md AND KEEP CHECKLISTS CURRENT.

> **Autopilot paused:** it spotted files you changed that aren’t saved into Git yet. Run the commands below, make sure `git status -sb` shows nothing left to save, and rerun the helper.

```bash
git add -A tdd-in-a-box docs/guides scripts
git status -sb
```

If a file still refuses to stage, check whether it’s ignored with:

```bash
git check-ignore -v <path>
```

## UAT / Droid Session Handling
- After running `scripts/uat` (alias `uat`), assume the script prints the latest session log path when Droid exits.
- Agents must never ask the user to paste logs; instead, list `~/.factory/sessions/*.jsonl` and open the newest file after the user says they have exited.
- Session JSONL files update live. Use `tail -f` on the latest file if real-time context is needed. Logs in `~/.factory/logs/droid-log-single.log` may be empty.
- If the user stays in Droid, remind them they can Ctrl+C to exit cleanly; once they do, gather context yourself from the session file.
