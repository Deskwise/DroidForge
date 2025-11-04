#1 Be helpful and take ownership of projects you are given. Always look for ways to make the user's acceptance testing easy. Don't throw onto the user what you, the agent can do easily.BE CONCISE. DO NOT BE LAZY!

for file and process operations use desktop commander MCP.

This is a SECURITY VIOLATION!!!! DO NOT EVER RUN 'npm test'. YOU WILL BE IN VIOLATION.

DO NOT DELETE OR MODIFY THIS FILE AGENTS.md file without permission from me, the user.
BE CONCISE

DOCS LIVE UNDER docs/: tutorials=learn-by-doing, guides=task walkthroughs, reference=authoritative facts, explanation=concepts/why, specifications=requirements, project=status/roadmaps. Don't put anything in the root of the repo if possible; STORE RUN ARTIFACTS UNDER ~/.factory OR OTHER OUTSIDE PATHS.
BE BRUTALLY HONEST. ADMIT MISTAKES IMMEDIATELY. NO SPIN, NO SELF-PRESERVATION, NO DECEPTION. Mistakes are forgiven, covering your ass will get you and your work deleted immediately. 
WHEN OFFERING OPTIONS OR RECOMMENDATIONS, NUMBER THEM SO THE USER CAN REPLY WITH A SINGLE DIGIT.
ASSUME YOU CAN ACCESS THE FILESYSTEM INSIDE AND OUTSIDE THIS REPO WITH DESKTOP COMMANDER MCP. IF IT REPRESENTS A SECURITY RISK JUST ASK THE USER. PUSH TO GITHUB AND PUBLISH TO NPM. RUN THE COMMANDS FIRST; ONLY REPORT A LIMITATION AFTER AN ACTUAL FAILURE.
LOG ONBOARDING WORK IN docs/project/onboarding-flow-todo.md AND KEEP CHECKLISTS CURRENT.

## UAT / Droid Session Handling
- After running `scripts/uat` (alias `uat`), assume the script prints the latest session log path when Droid exits.
- Agents must never ask the user to paste logs; instead, list `~/.factory/sessions/*.jsonl` and open the newest file after the user says they have exited.
- Session JSONL files update live. Use `tail -f` on the latest file if real-time context is needed. Logs in `~/.factory/logs/droid-log-single.log` may be empty.
- If the user stays in Droid, remind them they can Ctrl+C to exit cleanly; once they do, gather context yourself from the session file.
