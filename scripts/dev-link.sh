#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "$0")/.." && pwd)
cd "$repo_root"

echo "🔧 Cleaning previous build..."
npm run clean >/dev/null 2>&1 || true

echo "🏗️  Building TypeScript sources..."
npm run build

echo "🔗 Linking local droidforge package..."
npm link

echo "✅ DroidForge dev link complete"
