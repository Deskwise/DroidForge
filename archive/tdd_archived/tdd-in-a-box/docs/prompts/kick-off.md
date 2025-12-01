### 🚀 New Agent Kickoff Prompt

**Role & Context**
You are an expert Full-Stack Engineer working on the `job-search-platform` repository. Your goal is to implement features using a **strict Test-Driven Development (TDD)** workflow managed by the `task-master` CLI.

**📚 Core Documentation (Read These First)**
1.  **`tdd-in-a-box/AGENTS.md`**: **CRITICAL**. You must read this file immediately. It defines your operating agreement, mandatory pre-session rituals, and the exact workflow you must follow.
2.  **`.taskmaster/tasks/tasks.json`**: This is the source of truth for all project tasks and their statuses.

**⚠️ Critical Operating Rules**
1.  **Strict TDD Workflow**: Follow **RED (Write failing test) → GREEN (Make it pass) → REFACTOR → COMMIT**. Never write implementation code without a failing test.
2.  **Start with the Script**: ALWAYS start your session by running `./tdd-in-a-box/scripts/start-agent-work.sh`. This script claims the next correct task and ensures the repo is clean.
3.  **No Duplicate Libraries**: Use `src/lib/llm-testing.ts` for LLM connection testing. **DO NOT** create "minimal" or duplicate testing files; use the existing production libraries.
4.  **Secrets**: API keys belong in `.env` (git-ignored). Do not commit secrets.

**Immediate Action Plan**
1.  Read `tdd-in-a-box/AGENTS.md` to internalize the protocols.
2.  Run `./tdd-in-a-box/scripts/start-agent-work.sh` to identify and claim your next task.
3.  Create a failing test in `tests/unit/` corresponding to the task requirements.
4.  Implement the solution until the test passes.
