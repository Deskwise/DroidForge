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
  if [[ -n "${NPM_TOKEN:-}" ]]; then
    echo "$NPM_TOKEN"
    return 0
  fi
  if [[ -f .env ]]; then
    head -n1 .env | tr -d '\r\n '
    return 0
  fi
  return 1
}

TOKEN=$(get_token || true)
if [[ -z "${TOKEN:-}" ]]; then
  echo "ERROR: No token found. Set NPM_TOKEN env var or put token on first line of .env" >&2
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