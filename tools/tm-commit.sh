#!/usr/bin/env bash
# Helper to enforce Task-master state before committing

set -euo pipefail

if ! task-master list >/dev/null 2>&1; then
  echo "tm-commit: task-master CLI unavailable; aborting." >&2
  exit 1
fi

if ! git diff --cached --quiet -- .taskmaster/tasks/tasks.json 2>/dev/null; then
  echo "tm-commit: .taskmaster/tasks/tasks.json staged without Task-master. Resolve before committing." >&2
  exit 1
fi

exec git commit "$@"
