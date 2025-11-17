#!/usr/bin/env bash
set -euo pipefail

log_dir=".taskmaster/logs"
log_file="${log_dir}/autopilot-wrapup.log"

mkdir -p "${log_dir}"

timestamp=$(date -Iseconds)

status_output=$(npx task-master autopilot status || true)

if [[ -z "${status_output}" ]]; then
  echo "Autopilot status returned no data." >&2
  exit 1
fi

phase=$(echo "${status_output}" | sed -n 's/^[[:space:]]*phase:[[:space:]]*//p' | head -n 1 | tr -d '\r')
current=$(echo "${status_output}" | sed -n 's/^[[:space:]]*currentSubtask:[[:space:]]*//p' | head -n 1 | tr -d '\r')
progress=$(echo "${status_output}" | sed -n 's/^[[:space:]]*progress:[[:space:]]*//p' | head -n 1 | tr -d '\r')

{
  echo "[${timestamp}] phase=${phase:-unknown} current=${current:-unknown} progress=${progress:-n/a}"
  echo "${status_output}"
  echo "----"
} >> "${log_file}"

echo "${status_output}"
echo
printf 'Logged snapshot to %s\n' "${log_file}"
