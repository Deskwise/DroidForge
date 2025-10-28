# DroidForge Local Setup Guide

**For Contributors & Developers Only**

This guide is for testing DroidForge locally before publishing to npm. **End users will never need this** - they just run `npm install -g droidforge`.

## Overview

DroidForge is ready for local testing with **stdio transport** (auto-spawning by Droid CLI).

## What's Implemented

### ✅ Dual Transport Support

1. **stdio transport** - Auto-spawning for local workflows
   - Entry point: `dist/mcp/stdio-server.js`
   - Executable: `droidforge` command
   - Uses MCP SDK for protocol handling

2. **HTTP transport** - For Remote Workspaces (existing)
   - Entry point: `dist/mcp/http-server.js`
   - Executable: `droidforge-http` command
   - Express server on port 3897

### ✅ Package Configuration

**package.json:**
- `bin.droidforge` → stdio server
- `bin.droidforge-http` → HTTP server
- `@modelcontextprotocol/sdk` dependency added

### ✅ Build System

- TypeScript compilation working
- Both servers compile to `dist/mcp/`
- Shebang preserved for CLI execution

## Local Testing (Current Setup)

### 1. Build & Link

```bash
cd /home/richard/code/DroidForge
npm install
npm run build
npm link
```

**Result:**
- `droidforge` command available globally
- `droidforge-http` command available globally
- Symlinked to local development build

### 2. Configure Droid CLI

Edit `~/.factory/config.json`:

```json
{
  "mcpServers": {
    "droidforge": {
      "command": "droidforge"
    }
  }
}
```

### 3. Test It

```bash
# In any project directory
droid chat

# Inside Droid CLI
> /forge-start
```

Droid CLI will:
1. Detect the `/forge-start` command
2. Spawn `droidforge` process
3. Connect via stdio (stdin/stdout)
4. DroidForge tools become available

## Verification

### Test stdio server starts:

```bash
timeout 2 droidforge 2>&1
```

**Expected output:**
```
DroidForge MCP Server (stdio) started
Repository root: /home/richard/code/DroidForge
```

### Check command availability:

```bash
which droidforge
# Output: /home/richard/.nvm/versions/node/v22.19.0/bin/droidforge

which droidforge-http
# Output: /home/richard/.nvm/versions/node/v22.19.0/bin/droidforge-http
```

### Check symlinks:

```bash
ls -la ~/.nvm/versions/node/v22.19.0/bin/ | grep droid
```

**Expected:**
```
lrwxrwxrwx ... droidforge -> ../lib/node_modules/droidforge/dist/mcp/stdio-server.js
lrwxrwxrwx ... droidforge-http -> ../lib/node_modules/droidforge/dist/mcp/http-server.js
```

## Development Notes

### .npmrc Configuration

- **`.npmrc.docker-only`** - Docker-specific npm config (prefix=/config/.npm-global)
- For local development, this file is renamed to avoid conflicts
- If running in Docker, rename back to `.npmrc`

### File Structure

```
DroidForge/
├── src/mcp/
│   ├── stdio-server.ts       ← NEW: stdio transport
│   ├── http-server.ts        ← Existing: HTTP transport
│   └── server.ts             ← Core server logic (shared)
├── dist/mcp/
│   ├── stdio-server.js       ← Compiled stdio server
│   ├── http-server.js        ← Compiled HTTP server
│   └── server.js             ← Compiled core server
└── package.json              ← bin field defines CLI commands
```

### Transport Comparison

| Feature | stdio | HTTP |
|---------|-------|------|
| **Auto-spawning** | ✅ Yes | ❌ Manual start |
| **Local CLI** | ✅ Works | ✅ Works |
| **Remote Workspaces** | ❌ Won't work | ✅ Works |
| **Setup complexity** | ✅ Simple | ⚠️ Need port/server |
| **Debugging** | ⚠️ Harder | ✅ Easy (curl) |
| **Multiple sessions** | ❌ One at a time | ✅ Concurrent |

## Next Steps

### For Local Testing

1. ✅ Build works
2. ✅ Link works
3. ✅ Command available
4. ⏳ Test with actual Droid CLI session
5. ⏳ Verify tools load correctly
6. ⏳ Test full onboarding flow

### For Distribution (Future)

1. ⏳ Publish to npm registry (`npm publish`)
2. ⏳ Update README with published package instructions
3. ⏳ Test installation from npm (`npm install -g droidforge`)
4. ⏳ Document Remote Workspaces compatibility (HTTP mode)
5. ⏳ Create deployment guides for HTTP server hosting

## Troubleshooting

### npm link fails

**Error:** `EACCES: permission denied`

**Fix:** The `.npmrc` file had Docker-specific config. Already fixed by renaming to `.npmrc.docker-only`.

### droidforge command not found

**Check symlink:**
```bash
ls -la $(which droidforge)
```

**Re-link if needed:**
```bash
cd /home/richard/code/DroidForge
npm unlink -g
npm link
```

### stdio server doesn't start

**Check shebang:**
```bash
head -1 dist/mcp/stdio-server.js
# Should be: #!/usr/bin/env node
```

**Make executable:**
```bash
chmod +x dist/mcp/stdio-server.js
```

**Rebuild:**
```bash
npm run build
```

## Status Summary

**✅ Ready for local testing**
- stdio transport implemented
- Package configured correctly
- Commands linked globally
- Server starts successfully

**⏳ Pending:**
- End-to-end test with Droid CLI
- npm publication for distribution
- Remote Workspaces testing (HTTP mode)

**📍 Current State:**
- Using `npm link` for local testing
- Not yet published to npm registry
- stdio mode ready, HTTP mode already working
- Focus: Get local stdio working before worrying about remote deployments
