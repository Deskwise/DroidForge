#!/bin/bash
set -euo pipefail

# Local npm publish helper that:
# - Uses token from .env (first line) or $NPM_TOKEN
# - Creates a temporary project .npmrc
# - Publishes with --access public
# - Cleans up temporary files

ROOT_DIR=$(pwd)
TMP_NPMRC_CREATED=false

get_token() {
  # Load .env if present (without renaming vars)
  if [[ -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
  fi
  # Load .env if present (without renaming vars)
  if [[ -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
  fi
  # Prefer standard vars
  if [[ -n "${NPM_TOKEN:-}" ]]; then
    echo "$NPM_TOKEN"; return 0
  fi
  if [[ -n "${NODE_AUTH_TOKEN:-}" ]]; then
    echo "$NODE_AUTH_TOKEN"; return 0
  fi
  # Next: any env var whose NAME matches *TOKEN or *NPM*
  for name in $(env | cut -d= -f1); do
    case "$name" in
      *TOKEN*|*NPM*|*npm*|*NODE_AUTH*)
        val="${!name}"
        if [[ -n "$val" ]]; then echo "$val"; return 0; fi
        ;;
    esac
  done
  # Fallback: find any *_TOKEN in .env and extract its value
  if [[ -f .env ]]; then
    # First try key=value like *_TOKEN=...
    token_line=$(grep -E '^[A-Za-z0-9_]*TOKEN=' .env | head -n1 || true)
    if [[ -n "$token_line" ]]; then
      echo "${token_line#*=}" | tr -d '\r\n ' ; return 0
    fi
    # Fallback: treat first non-empty non-comment line as raw token or key=value
    raw=$(grep -v '^[#[:space:]]*$' .env | head -n1 | tr -d '\r\n ')
    if [[ -n "$raw" ]]; then
      echo "$raw"; return 0
    fi
  fi
  return 1
}

TOKEN=$(get_token || true)
if [[ -z "${TOKEN:-}" ]]; then
  echo "ERROR: No token found. Set NPM_TOKEN or NODE_AUTH_TOKEN in env or .env" >&2
  exit 1
fi

cleanup() {
  if $TMP_NPMRC_CREATED; then
    rm -f .npmrc
  fi
}
trap cleanup EXIT

if [[ ! -f .npmrc ]]; then
  echo "//registry.npmjs.org/:_authToken=${TOKEN}" > .npmrc
  echo "registry=https://registry.npmjs.org/" >> .npmrc
  echo "always-auth=true" >> .npmrc
  TMP_NPMRC_CREATED=true
fi

echo "Building..."
npm run build

echo "Publishing..."
npm publish --access public

echo "Done."