# How DroidForge MCP Architecture Works

**Last Updated:** October 25, 2025  
**Provider:** Independent 3rd-party developer  
**GitHub:** https://github.com/Deskwise/DroidForge  
**Platform:** Designed exclusively for Factory.ai's Droid CLI

---

## Table of Contents

1. [What is DroidForge?](#what-is-droidforge)
2. [Your Relationship with Factory.ai](#your-relationship-with-factoryai)
3. [The Three Players](#the-three-players)
4. [Why Only Droid CLI?](#why-only-droid-cli)
5. [Slash Commands: How They Work](#slash-commands-how-they-work)
6. [How Users Find and Install DroidForge](#how-users-find-and-install-droidforge)
7. [MCP Transport Protocols](#mcp-transport-protocols)
8. [End-to-End Flow: Brand New Project](#end-to-end-flow-brand-new-project)
9. [Current State vs Desired State](#current-state-vs-desired-state)
10. [File System Layout](#file-system-layout)
11. [Key Concepts Clarified](#key-concepts-clarified)

---

## What is DroidForge?

**DroidForge is an independent 3rd-party MCP server designed exclusively for Factory.ai's Droid CLI.**

**Key Points:**
- **Independent Developer:** NOT affiliated with Factory.ai
- **Platform-Specific:** Only works with Droid CLI (hardcoded, by design)
- **GitHub Project:** https://github.com/Deskwise/DroidForge
- **Installation:** `npm install -g droidforge`
- **Purpose:** Extends Droid CLI with repository analysis and specialized droid generation

**What DroidForge Provides:**
- SmartScan: Deep repository analysis
- Dynamic Droid Generation: Custom AI specialists for your tech stack
- Parallel Orchestration: Safe concurrent execution
- Droid CLI Integration: Slash commands like `/forge-start`, `/df`

**The Analogy:**
Think of DroidForge like a **3rd-party VS Code extension**:
- You're independent from Microsoft (not affiliated)
- But your extension ONLY works with VS Code (not Sublime, Atom, etc.)
- You provide the addon, they provide the platform
- Users install VS Code first, then your extension

**Same here:**
- You're independent from Factory.ai (not affiliated)
- But DroidForge ONLY works with Droid CLI (not Claude Desktop, Cline, etc.)
- You provide the MCP server, they provide the CLI
- Users install Droid CLI first, then DroidForge

---

## Your Relationship with Factory.ai

**You are NOT Factory.ai. Let's be crystal clear:**

| Aspect | Factory.ai | You (DroidForge) |
|--------|-----------|------------------|
| **Company** | Factory.ai | Independent developer |
| **Product** | Droid CLI (the platform) | DroidForge MCP server (addon) |
| **Website** | factory.ai | github.com/Deskwise/DroidForge |
| **Users get it from** | Factory.ai installer | npm / GitHub |
| **Relationship** | Platform provider | 3rd-party addon developer |

**Your Position:**
- **Independent:** You're not employed by or affiliated with Factory.ai
- **Platform-specific:** Your MCP server is hardcoded for Droid CLI
- **Complementary:** You extend Droid CLI's capabilities
- **Distributed separately:** Via npm/GitHub, not through Factory.ai

**Think of it like:**
- Apple makes iPhone (Factory.ai makes Droid CLI)
- You make an app that only runs on iPhone (DroidForge only runs with Droid CLI)
- You're independent, but your app is iOS-specific

---

## The Three Players

### 1. **User's Project** (`~/code/new-app`)

- Developer's actual codebase (React app, Django backend, etc.)
- Where the real work happens
- DroidForge **analyzes and modifies** this directory
- Has no knowledge of DroidForge

**Example structure:**
```
~/code/new-app/
├── src/
├── package.json
├── README.md
└── .droidforge/         ← Created by DroidForge on first run
    ├── droids/          ← Generated droid configurations
    ├── state.json       ← Session state
    └── logs/            ← Execution logs
```

---

### 2. **Droid CLI** (Factory.ai's Platform)

**What it is:** Factory.ai's interactive command-line interface that wraps Claude AI with MCP server integration

**Provider:** Factory.ai  
**Installation:** https://factory.ai (their installer)  
**What it does:**
- Provides interactive terminal for Claude AI
- Manages Claude AI conversation sessions
- Spawns and communicates with MCP servers (like DroidForge)
- Handles slash commands (`/forge-start`, `/df`, etc.)
- Displays results to the user
- Controls MCP server lifecycle

**Configuration File:** `~/.factory/config.json`

**Example Configuration for DroidForge:**
```json
{
  "mcpServers": {
    "droidforge": {
      "command": "droidforge"
    }
  }
}
```

**Key Point:** Droid CLI is the platform. Users must have it installed before they can use DroidForge.

**Includes:**
- Claude AI (Anthropic's assistant)
- MCP transport layer
- Session management
- Command routing

---

### 3. **DroidForge MCP Server** (Your Addon)

**What it is:** A Node.js program that implements the Model Context Protocol

**Developer:** Independent (you)  
**GitHub:** https://github.com/Deskwise/DroidForge  
**Distribution:** npm package + GitHub releases

**What it does:**
- Analyzes repositories (SmartScan)
- Generates specialized droid configurations  
- Coordinates parallel droid execution
- Manages execution state and safety
- Provides tools to Droid CLI via MCP protocol

**Where it lives:** Installed globally via npm
```
/usr/local/lib/node_modules/droidforge/
├── dist/
│   └── mcp/
│       ├── server.js        ← Core MCP server
│       ├── cli.js           ← Entry point (stdio transport)
│       └── http-server.js   ← Alternative (HTTP transport)
├── package.json
└── node_modules/
```

**Critical:** DroidForge **never lives inside** the user's project. It's a separate program that **operates on** the user's project.

**How it connects:**
```
User runs: /forge-start
  ↓
Droid CLI sees the command
  ↓
Droid CLI spawns: droidforge (your MCP server)
  ↓
DroidForge communicates via stdin/stdout
  ↓
DroidForge operates on ~/code/new-app
```

---

## Why Only Droid CLI?

**Q: Can DroidForge work with Claude Desktop, Cline, or other MCP clients?**  
**A: No. DroidForge is hardcoded for Droid CLI only.**

**Reasons:**

1. **Droid CLI-Specific Commands**
   - Uses slash commands: `/forge-start`, `/df`, `/forge-removeall`
   - These are Droid CLI conventions, not in Claude Desktop

2. **Hardcoded Workflow**
   - DroidForge expects Droid CLI's workflow patterns
   - Assumes Droid CLI's session management
   - Built around Droid CLI's command routing

3. **By Design**
   - You chose to build for one platform specifically
   - Simpler to develop and maintain
   - Optimized for Droid CLI's capabilities

**Analogy:**
- **iPhone app** = Only works with iOS (not Android)
- **DroidForge** = Only works with Droid CLI (not Claude Desktop)

**This is totally fine!** Most platform-specific tools are successful. You're not trying to be universal - you're trying to be excellent for Droid CLI users.

---

## Slash Commands: How They Work

**Q: Where do slash commands like `/forge-start` come from?**  
**A: DroidForge creates command definition files that Droid CLI reads.**

### The Mechanism

**1. DroidForge Installs Command Definitions**

During onboarding, DroidForge's `install_commands` tool creates files in `.factory/commands/`:

```
~/code/new-app/.factory/commands/
├── forge-start.md       ← Defines /forge-start
├── df.md                ← Defines /df
├── forge-removeall.md   ← Defines /forge-removeall
└── forge-logs.md        ← Defines /forge-logs
```

**Example command file** (`forge-start.md`):
```markdown
---
description: Launch DroidForge onboarding or show the returning-user dashboard
---

# /forge-start

Initializes DroidForge for this repository or shows status if already set up.

**First time:** Runs onboarding flow (scan, configure, create droids)
**Returning:** Shows quick dashboard with team status
```

**2. Droid CLI Reads These Files**

When Droid CLI starts, it:
- Scans `.factory/commands/` directory
- Registers each `.md` file as a slash command
- Makes them available in the interactive terminal

**3. User Types Slash Command**

When user types `/forge-start`:
- Droid CLI recognizes the command (from `forge-start.md`)
- Droid CLI spawns DroidForge MCP server (if not running)
- Droid CLI calls appropriate MCP prompt:
  - First time: `droidforge.onboarding`
  - Returning: `droidforge.returning_user`

### The Complete Flow

```
┌──────────────────────────────────────────────────────────┐
│ 1. DroidForge creates command definition files           │
│    Tool: install_commands                                │
│    Output: .factory/commands/forge-start.md              │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ 2. Droid CLI reads command files                         │
│    Scans: .factory/commands/*.md                         │
│    Registers: /forge-start, /df, etc.                    │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ 3. User types: /forge-start                              │
│    Droid CLI recognizes command                          │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ 4. Droid CLI spawns DroidForge                           │
│    Runs: droidforge (your MCP server)                    │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ 5. Droid CLI calls MCP prompt                            │
│    First time: droidforge.onboarding                     │
│    Returning: droidforge.returning_user                  │
└──────────────────────────────────────────────────────────┘
```

### Why This is Droid CLI-Specific

**Slash commands are a Droid CLI feature, not standard MCP:**

| Component | Slash Command Support |
|-----------|----------------------|
| Droid CLI | ✅ Yes - reads `.factory/commands/` |
| Claude Desktop | ❌ No - doesn't have slash commands |
| Other MCP Clients | ❌ Generally no (not a standard MCP feature) |

**This is why DroidForge only works with Droid CLI:**
- DroidForge expects this slash command mechanism
- Other MCP clients don't have it
- Would need complete rewrite to work elsewhere

**Analogy:**
- **VS Code commands** = Droid CLI slash commands (editor-specific)
- **LSP protocol** = MCP protocol (universal standard)
- **VS Code extension** = DroidForge (platform-specific addon)

Just like a VS Code extension can use VS Code-specific commands (beyond LSP), DroidForge uses Droid CLI-specific slash commands (beyond basic MCP).

---

## How Users Find and Install DroidForge

**User Journey:**

### Step 1: User Has Droid CLI
User already installed Droid CLI from Factory.ai and uses it regularly.

### Step 2: User Discovers DroidForge
How they find you:
- Searching: "Droid CLI extensions" or "Droid CLI repository analysis"
- GitHub: Browsing MCP servers or AI dev tools
- Word of mouth: Other developers recommend it
- Your marketing: Blog posts, docs, social media

### Step 3: User Visits Your GitHub
They land on: https://github.com/Deskwise/DroidForge

**Your README should clearly state:**
- "Independent 3rd-party MCP server for Droid CLI"
- "Not affiliated with Factory.ai"
- "Requires Droid CLI to be installed first"

### Step 4: User Installs DroidForge
```bash
npm install -g droidforge
```

npm downloads from registry, installs globally.

### Step 5: User Configures Droid CLI
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

### Step 6: User Tests It
```bash
cd ~/code/their-project
droid chat
```

Then:
```
> /forge-start
```

If it works, DroidForge is successfully integrated!

**Where Users Get Things:**
- **Droid CLI:** From Factory.ai (factory.ai)
- **DroidForge:** From you (npm / GitHub)
- **Configuration:** Users edit their own Droid CLI config

---

## MCP Transport Protocols

MCP servers can communicate using different "transports" (communication methods). **DroidForge supports BOTH stdio and HTTP** - you choose based on your needs.

### **Transport Option 1: stdio (Auto-Spawning)**

**Best for:** Local-only workflows, convenience, automatic lifecycle management

**How it works:**
1. Install: `npm install -g droidforge`
2. Droid CLI automatically spawns `droidforge` when needed
3. Process runs during session, terminates when done
4. No manual server management

**Advantages:**
- ✅ **Zero setup** - Just install and configure
- ✅ **Auto-spawning** - Droid CLI manages lifecycle
- ✅ **Simple** - No ports, no manual starting
- ✅ **Standard pattern** - Most MCP servers work this way

**Limitations:**
- ❌ **Local only** - Won't work with Remote Workspaces (can't access cloud filesystem)
- ❌ **Single session** - One process at a time
- ⚠️ **Harder to debug** - Can't easily test with curl

**Configuration:**
```json
{
  "mcpServers": {
    "droidforge": {
      "command": "droidforge"
    }
  }
}
```

---

### **Transport Option 2: HTTP (Streamable HTTP)**

**Best for:** Remote Workspaces, cloud deployment, multiple sessions, debugging

**DroidForge includes a full Express.js HTTP server** for maximum flexibility.

**How it works:**
1. DroidForge runs as an **Express.js HTTP server**
2. Default port: **3897** (configurable via `PORT` env var)
3. Droid CLI makes **HTTP POST requests** to server
4. Server responds with JSON HTTP responses
5. Server runs **independently** - can stay alive across sessions

**Example message flow:**
```
Droid CLI → HTTP POST http://localhost:3897/mcp
            Body: {"tool": "smart_scan", "input": {"repoRoot": "/home/user/code/app"}}

DroidForge Server ← Processes request

Droid CLI ← HTTP 200 OK
            Body: {"success": true, "result": {...}}
```

**Why HTTP Instead of stdio?**

| Capability | HTTP ✅ | stdio ❌ |
|------------|---------|----------|
| **Local CLI** | ✅ Works | ✅ Works |
| **Web + Factory Bridge** | ✅ Works | ✅ Works |
| **Remote Workspaces** | ✅ Works | ❌ Can't access cloud filesystem |
| **Cloud Deployment** | ✅ Deploy anywhere | ❌ Local only |
| **Multiple Sessions** | ✅ Concurrent connections | ❌ One session at a time |
| **Debugging** | ✅ Use curl/Postman | ❌ Harder to test |

**Advantages:**
- ✅ **Universal compatibility** - Works with ALL Factory.ai modes
- ✅ **Cloud-ready** - Deploy to Fly.io/Railway/AWS later with zero code changes
- ✅ **Flexible** - Can run as daemon, in Docker, on cloud, etc.
- ✅ **Multi-session** - Multiple users or sessions can connect
- ✅ **Easy testing** - Use curl, Postman, or any HTTP client

**Trade-offs:**
- ⚠️ **Manual start** - User must run `node dist/mcp/http-server.js`
- ⚠️ **Port management** - Need to ensure port 3897 is available
- ⚠️ **Authentication** - Optional API key for security (via `DROIDFORGE_API_KEY`)

**Configuration:**
```json
{
  "mcpServers": {
    "droidforge": {
      "transport": "streamable-http",
      "url": "http://localhost:3897"
    }
  }
}
```

---

### **Which Transport Should You Use?**

| Your Situation | Use stdio | Use HTTP |
|----------------|-----------|----------|
| **Only work locally** | ✅ Perfect choice | ⚠️ Extra setup |
| **Use Remote Workspaces** | ❌ Won't work | ✅ Required |
| **Want zero setup** | ✅ Just install | ⚠️ Manual start |
| **Need concurrent sessions** | ❌ One at a time | ✅ Multiple connections |
| **Plan cloud deployment** | ❌ Local only | ✅ Deploy anywhere |
| **Want easy debugging** | ⚠️ Harder | ✅ Use curl/Postman |

**Quick Decision:**
- **Local-only developer?** → Use stdio (easier)
- **Use cloud workspaces?** → Use HTTP (required)
- **Not sure?** → Start with stdio, switch to HTTP if needed

---

## End-to-End Flow: Brand New Project

**Scenario:** Developer on fresh Linux install with `~/code/new-app` project wants to use DroidForge.

### **Phase 1: Installation**

**Step 1: Developer installs Droid CLI**
```bash
# Via Factory.ai's installer
curl -fsSL https://factory.ai/install.sh | sh
```

**Result:**
- Droid CLI installed system-wide
- Configuration directory created: `~/.factory/`

---

**Step 2: Developer installs DroidForge**
```bash
npm install -g droidforge
```

**What happens:**
1. npm downloads `droidforge` package from registry
2. Extracts to `/usr/local/lib/node_modules/droidforge/`
3. Creates executable symlink: `/usr/local/bin/droidforge` → `../lib/node_modules/droidforge/dist/mcp/cli.js`
4. DroidForge is now available as `droidforge` command

**Result:**
```
/usr/local/bin/droidforge          ← Executable symlink
/usr/local/lib/node_modules/
└── droidforge/
    ├── dist/                       ← Compiled JavaScript
    │   └── mcp/
    │       ├── server.js
    │       ├── cli.js              ← Entry point
    │       └── tools/
    ├── package.json
    └── node_modules/
```

---

**Step 3: Developer configures Droid CLI**

Edits `~/.factory/config.json`:
```json
{
  "mcpServers": {
    "droidforge": {
      "command": "droidforge"
    }
  }
}
```

**This tells Droid CLI:**
- "I have an MCP server called 'droidforge'"
- "To start it, run the `droidforge` command"
- "Pass it args/env if needed"

**No ports, no URLs, no manual starting.** Droid CLI will manage it.

---

### **Phase 2: First Run**

**Step 4: Developer opens project**
```bash
cd ~/code/new-app
droid chat
```

**What happens:**
1. Droid CLI starts
2. Initializes Claude AI session
3. Loads MCP server configurations from `~/.factory/config.json`
4. **Does NOT start DroidForge yet** (only spawns on demand)

**Terminal shows:**
```
Droid CLI v1.2.0
Connected to Claude Sonnet 4.5
MCP servers available: droidforge
Ready.
>
```

---

**Step 5: Developer invokes DroidForge**

Developer types:
```
> /forge-start
```

**Now the action begins:**

1. **Droid CLI sees `/forge-start`** command
   - Recognizes this is a DroidForge-specific command
   - Checks if DroidForge process is running → No

2. **Droid CLI spawns DroidForge:**
   ```bash
   # Behind the scenes
   spawn('droidforge', [], {
     cwd: '/home/user/code/new-app',
     stdio: ['pipe', 'pipe', 'inherit']
   })
   ```
   - Executes `/usr/local/bin/droidforge`
   - stdin/stdout connected via pipes
   - stderr inherited (for logs)

3. **DroidForge starts:**
   - `dist/mcp/cli.js` runs
   - Initializes stdio transport
   - Waits for messages on stdin
   - Registers tools: `smart_scan`, `forge_roster`, etc.

4. **Droid CLI discovers DroidForge capabilities:**
   ```
   Droid CLI → stdin: {"jsonrpc": "2.0", "method": "tools/list"}
   DroidForge → stdout: {"result": ["smart_scan", "forge_roster", ...]}
   ```

5. **Claude AI processes `/forge-start` command:**
   - Understands user wants to initialize DroidForge
   - Decides to call `smart_scan` tool first
   - Sends request to Droid CLI

6. **Droid CLI invokes tool:**
   ```
   Droid CLI → stdin: {
     "jsonrpc": "2.0",
     "method": "tools/call",
     "params": {
       "name": "smart_scan",
       "arguments": {
         "repoRoot": "/home/user/code/new-app"
       }
     }
   }
   ```

7. **DroidForge processes request:**
   - Reads message from stdin
   - Parses JSON
   - Calls `smart_scan` handler with `repoRoot: /home/user/code/new-app`
   - SmartScan analyzes the project:
     - Walks file tree
     - Detects frameworks (React, Express, etc.)
     - Identifies patterns
   - Returns results

8. **DroidForge responds:**
   ```
   DroidForge → stdout: {
     "jsonrpc": "2.0",
     "result": {
       "languages": ["TypeScript", "JavaScript"],
       "frameworks": ["React", "Express"],
       "projectType": "fullstack-web",
       ...
     }
   }
   ```

9. **Droid CLI forwards to Claude:**
   - Reads stdout
   - Parses response
   - Passes result to Claude AI

10. **Claude AI continues workflow:**
    - Analyzes scan results
    - Asks user about project goal (via Droid CLI)
    - Calls `recommend_droids` tool
    - Calls `forge_roster` tool
    - All through same stdin/stdout flow

11. **DroidForge creates droids:**
    - Generates droid configs in `/home/user/code/new-app/.droidforge/droids/`
    - Updates state in `.droidforge/state.json`
    - Returns success

12. **User sees results:**
    ```
    ✓ SmartScan complete: React + Express project
    ✓ Generated 4 specialized droids:
      - df-orchestrator (technical lead)
      - df-frontend (React expert)
      - df-backend (Express expert)  
      - df-test (testing specialist)
    
    Ready to work! Try: /df Create a login page
    ```

---

**Step 6: Developer works with droids**

Developer types:
```
> /df Create a login page with email/password
```

**Flow:**
1. Droid CLI → Claude AI (with context)
2. Claude → Droid CLI: "Call df tool"
3. Droid CLI → DroidForge stdin: `{"method": "tools/call", "params": {"name": "df", "arguments": {...}}}`
4. DroidForge:
   - Parses request
   - df-orchestrator analyzes task
   - Delegates to df-frontend and df-backend
   - Coordinates parallel execution
   - Modifies files in `/home/user/code/new-app/`
5. DroidForge → stdout: Results
6. Droid CLI → Claude → User: Summary of changes

---

**Step 7: Session ends**

Developer types:
```
> exit
```

**Cleanup:**
1. Droid CLI closes stdin pipe to DroidForge
2. DroidForge sees EOF (end of file) on stdin
3. DroidForge gracefully shuts down
4. Process terminates
5. Droid CLI exits

**State persists:**
- `.droidforge/` directory remains in project
- Next session will load existing droids
- No need to re-run SmartScan

---

## Current State vs Desired State

### **Current Implementation**

**Transport:** HTTP  
**Entry Point:** `src/mcp/http-server.ts`  
**How to run:**
```bash
# Developer must manually:
cd DroidForge
npm install
npm run build
node dist/mcp/http-server.js
```

**Droid CLI config:**
```json
{
  "mcpServers": {
    "droidforge": {
      "url": "http://localhost:3897",
      "transport": "http"
    }
  }
}
```

**Problems:**
- Users must clone repo and build
- Users must manually start server
- Users must manage port/lifecycle
- Not distributable via npm

---

### **Desired State** (Standard MCP Distribution)

**Transport:** STDIO  
**Entry Point:** `src/mcp/cli.ts` (needs to be created)  
**How to run:**
```bash
# User installs once:
npm install -g droidforge

# Droid CLI handles everything automatically
```

**Droid CLI config:**
```json
{
  "mcpServers": {
    "droidforge": {
      "command": "droidforge"
    }
  }
}
```

**Benefits:**
- One-command installation
- Droid CLI manages lifecycle
- No manual server management
- Standard MCP pattern
- Works like other MCP servers

---

## File System Layout

### **User's Machine After Setup**

```
/home/user/
├── .factory/
│   ├── config.json              ← Droid CLI configuration
│   └── ...
│
├── code/
│   └── new-app/                 ← User's project
│       ├── src/
│       ├── package.json
│       ├── .droidforge/         ← Created by DroidForge
│       │   ├── droids/
│       │   │   ├── df-orchestrator.json
│       │   │   ├── df-frontend.json
│       │   │   ├── df-backend.json
│       │   │   └── df-test.json
│       │   ├── state.json
│       │   ├── snapshots/
│       │   └── logs/
│       └── ...
│
/usr/local/
├── bin/
│   ├── droid                    ← Droid CLI
│   └── droidforge               ← DroidForge symlink
│
└── lib/node_modules/
    ├── droidforge/              ← DroidForge installation
    │   ├── dist/
    │   │   └── mcp/
    │   │       ├── server.js
    │   │       ├── cli.js       ← Entry point
    │   │       └── tools/
    │   ├── package.json
    │   └── node_modules/
    │
    └── @modelcontextprotocol/
        └── sdk/                 ← MCP SDK
```

**Key Points:**
- DroidForge **never lives in user's project**
- User's project gets `.droidforge/` directory for state
- Everything else is system-wide installation

---

## Key Concepts Clarified

### **Terminology: The Correct Names**

| ❌ Incorrect | ✅ Correct | Description |
|--------------|-----------|-------------|
| Factory CLI | **Droid CLI** | Factory.ai's interactive terminal |
| MCP CLI | **Droid CLI** | (Same - it's not called "MCP CLI") |
| DroidForge CLI | **DroidForge MCP Server** | Your project (it's a server, not a CLI) |
| You work for Factory.ai | **You're independent** | NOT affiliated with Factory.ai |
| Universal MCP server | **Droid CLI-specific** | Only works with Droid CLI |
| The platform | **Droid CLI** | Factory.ai's product |
| The addon | **DroidForge** | Your product |

**Correct usage:**
- "Droid CLI spawns DroidForge as a child process"
- "Users install Droid CLI from Factory.ai, DroidForge from npm"
- "DroidForge is an independent 3rd-party MCP server for Droid CLI"
- "DroidForge is hardcoded to work only with Droid CLI"

---

### **What is MCP, Really?**

**Model Context Protocol (MCP)** is:
- A **standard protocol** created by Anthropic (like HTTP, but for AI tools)
- Allows AI assistants to **call external tools**
- Provides **standardized communication** patterns
- **Open protocol** - anyone can implement it

**Not:**
- A specific program
- A CLI tool  
- Factory.ai specific (it's an open standard)
- A guarantee of universal compatibility

**About DroidForge and MCP:**
- DroidForge **uses** the MCP protocol
- But DroidForge is **hardcoded for Droid CLI only**
- Just because something uses MCP doesn't mean it works everywhere
- Like how an iPhone app uses iOS APIs but won't run on Android

**Analogy:** 
- MCP = The language (English)
- Droid CLI = One dialect (American English)
- DroidForge = Speaker who only speaks that dialect (won't work with British English speakers)

**Why DroidForge is Droid CLI-only:**
- Uses Droid CLI-specific slash commands
- Expects Droid CLI's workflow patterns
- Hardcoded for Droid CLI's command structure
- By design, not a limitation

---

### **Who Controls What?**

**Factory.ai:**
- Makes and maintains Droid CLI (the platform)
- Provides platform updates
- Manages platform distribution
- **Controls the platform**

**You (DroidForge developer):**
- Make and maintain DroidForge MCP server (the addon)
- Provide addon updates
- Manage addon distribution (npm/GitHub)
- **Control your addon**
- **Independent** - not employed by Factory.ai

**Droid CLI (The platform users interact with):**
- Manages Claude AI session
- Spawns/stops MCP servers (including DroidForge)
- Routes user commands
- Displays responses
- **Controls process lifecycle**

**DroidForge (Your addon that Droid CLI spawns):**
- Provides tools (smart_scan, forge_roster, etc.)
- Analyzes repositories
- Generates droids
- Coordinates execution
- **Controls domain logic**
- Only runs when Droid CLI spawns it

---

### **The repoRoot Parameter**

Every DroidForge tool accepts `repoRoot`:
```json
{
  "name": "smart_scan",
  "arguments": {
    "repoRoot": "/home/user/code/new-app"
  }
}
```

**Why?**
- DroidForge lives in `/usr/local/lib/node_modules/droidforge/`
- But needs to operate on `/home/user/code/new-app/`
- `repoRoot` tells DroidForge **where the target project is**

**Who sets it?**
- Usually Droid CLI (knows current working directory)
- Can be explicit in tool calls
- Can default to `process.cwd()` (where DroidForge was started)

---

### **Process Lifecycle**

**STDIO Mode (Standard):**
```
User starts session → Droid CLI starts
User calls /forge-start → Droid CLI spawns droidforge process
User works → droidforge process stays alive, handles requests
User exits session → Droid CLI kills droidforge process
```

**HTTP Mode (Current):**
```
User manually starts server → node dist/mcp/http-server.js
Server runs independently
Droid CLI makes HTTP requests → Server responds
User exits session → Server keeps running (must stop manually)
```

---

### **What Gets Installed Where?**

**When user runs `npm install -g droidforge`:**

**Installed:**
- Compiled JavaScript (`dist/` folder)
- Dependencies (`node_modules/`)
- Metadata (`package.json`)

**NOT installed:**
- Source TypeScript (`src/` - only in development)
- Tests (`__tests__/`)
- Documentation (unless in `files` array)
- Build artifacts not in `files` array

**Location:** `/usr/local/lib/node_modules/droidforge/` (or OS equivalent)

**Executable:** `/usr/local/bin/droidforge` → symlink to `dist/mcp/cli.js`

---

## Summary: The Complete Picture

**The Ecosystem (3 Players):**

1. **Droid CLI** (Factory.ai) = The platform - interactive terminal with Claude AI
2. **DroidForge** (You) = 3rd-party MCP server addon - repository analysis tools
3. **User's Project** (`~/code/new-app`) = Where the actual code lives and gets modified

**Your Relationship:**
```
Factory.ai → Provides Droid CLI (platform)
You → Provide DroidForge (3rd-party addon)
Users → Install both, configure Droid CLI to use DroidForge
```

**Communication Flow:**
```
User
  ↓ types /forge-start
Droid CLI (Factory.ai)
  ↓ spawns process
DroidForge (You)
  ↓ operates on
User's Project
```

**Key Points:**
- **Independent:** You're NOT Factory.ai
- **Platform-specific:** DroidForge ONLY works with Droid CLI
- **Separate distribution:** Users get Droid CLI from Factory.ai, DroidForge from npm/GitHub
- **Configuration:** Users add DroidForge to their Droid CLI config

**Distribution Model:**
- Users install Droid CLI from Factory.ai (prerequisite)
- Users discover DroidForge on GitHub
- Users install: `npm install -g droidforge`
- Users configure in `~/.factory/config.json`
- Droid CLI spawns/manages DroidForge process via stdio
- DroidForge runs only when needed

**Current Implementation:**
- ✅ **Dual transport support** - Both stdio and HTTP available
- ✅ **stdio mode**: Auto-spawning, perfect for local-only workflows
- ✅ **HTTP mode**: Universal compatibility, works with ALL Factory.ai modes
- ✅ Production-ready with authentication, metrics, health checks
- 📋 **User choice**: Pick the transport that fits your workflow

---

## Next Steps

To distribute DroidForge as a self-hosted Droid CLI addon:

### **Installation Option A: stdio (Quick Start)**

**For local-only workflows:**

```bash
npm install -g droidforge
```

Configure Factory.ai (`~/.factory/config.json`):
```json
{
  "mcpServers": {
    "droidforge": {
      "command": "droidforge"
    }
  }
}
```

**That's it!** Droid CLI will auto-spawn DroidForge when you use it.

---

### **Installation Option B: HTTP (Universal)**

**For Remote Workspaces or cloud deployment:**

```bash
git clone https://github.com/Deskwise/DroidForge
cd DroidForge
npm install && npm run build
node dist/mcp/http-server.js
# Or: npm start
```

Configure Factory.ai:
```json
{
  "mcpServers": {
    "droidforge": {
      "transport": "streamable-http",
      "url": "http://localhost:3897"
    }
  }
}
```

**Optional:** Set up as daemon with systemd/PM2/Docker for persistent running.

---

### **Can I Use Both?**

**Yes!** You can have different configurations:

```json
{
  "mcpServers": {
    "droidforge-local": {
      "command": "droidforge"
    },
    "droidforge-cloud": {
      "transport": "streamable-http",
      "url": "https://your-server.fly.io"
    }
  }
}
```

Use `droidforge-local` for local work, `droidforge-cloud` for remote sessions.

---

### **Future: Cloud Deployment**

When ready to scale, deploy HTTP server to:
- Fly.io / Railway / Render
- AWS / GCP / Azure
- Docker / Kubernetes

Offer as hosted service option (monetization opportunity).

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for deployment examples.

---

**Questions or Confusion?** 

- **GitHub Issues:** https://github.com/Deskwise/DroidForge/issues
- **Not affiliated with Factory.ai** - For Droid CLI questions, contact Factory.ai support
