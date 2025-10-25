# DroidForge Installation Guide: From Zero to Working

**For:** Brand new users on a fresh Linux system  
**Starting point:** Empty repository, no tools installed  
**Time required:** 10-15 minutes  
**Outcome:** Fully functional DroidForge with custom AI droid team

---

## Overview: What You're Installing

**Two things:**
1. **Droid CLI** (Factory.ai) - The platform that runs AI assistants with tools
2. **DroidForge** (this package) - MCP server that creates specialized AI droids for your codebase

**Analogy:** 
- Droid CLI = iPhone (the platform)
- DroidForge = An app you install on that iPhone

---

## Prerequisites Check

Before starting, verify you have:

```bash
# Check Node.js (need 16 or higher)
node --version
# Should show: v16.x.x or higher

# If not installed, install Node.js:
# Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify npm
npm --version
# Should show: 8.x.x or higher
```

---

## Step 1: Install Droid CLI (Factory.ai Platform)

**What is it?** The platform that runs AI assistants and manages MCP servers.

**Install:**

```bash
# Factory.ai's official installer
curl -fsSL https://factory.ai/install.sh | sh
```

**What this does:**
- Downloads and installs Droid CLI
- Creates `~/.factory/` configuration directory
- Adds `droid` command to your PATH

**Verify installation:**

```bash
# Check if droid command is available
droid --version
# Should show version number

# Check config directory exists
ls -la ~/.factory/
# Should show: config.json and other files
```

**If `droid: command not found`:**
```bash
# Add to PATH (usually installer does this automatically)
export PATH="$HOME/.factory/bin:$PATH"

# Make permanent by adding to ~/.bashrc or ~/.zshrc:
echo 'export PATH="$HOME/.factory/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

---

## Step 2: Install DroidForge

**What is it?** The MCP server that analyzes your repo and creates specialized AI droids.

**Install globally via npm:**

```bash
npm install -g droidforge
```

**What this does:**
- Downloads pre-built DroidForge package from npm
- Creates global `droidforge` command
- No building or compilation needed - it's ready to use

**Verify installation:**

```bash
# Check if command is available
which droidforge
# Should show: /usr/local/bin/droidforge (or similar)

# Test it starts (will timeout in 2 seconds - that's fine)
timeout 2 droidforge 2>&1 || true
# Should show: "DroidForge MCP Server (stdio) started"
```

**If `droidforge: command not found`:**
```bash
# Check npm global bin location
npm bin -g
# Shows where global packages are installed

# Make sure it's in your PATH
export PATH="$(npm bin -g):$PATH"

# Make permanent:
echo 'export PATH="$(npm bin -g):$PATH"' >> ~/.bashrc
source ~/.bashrc
```

---

## Step 3: Configure Droid CLI to Use DroidForge

**What this does:** Tells Droid CLI "I have an MCP server called droidforge - spawn it when needed."

**Edit the configuration file:**

```bash
# Open Factory.ai config file
nano ~/.factory/config.json
```

**Add DroidForge to the `mcpServers` section:**

```json
{
  "mcpServers": {
    "droidforge": {
      "command": "droidforge"
    }
  }
}
```

**Complete example** (if file is empty or needs structure):

```json
{
  "mcpServers": {
    "droidforge": {
      "command": "droidforge"
    }
  },
  "settings": {
    "defaultModel": "claude-sonnet-4"
  }
}
```

**Save and exit:**
- Press `Ctrl + O` to save
- Press `Enter` to confirm
- Press `Ctrl + X` to exit

**What this configuration means:**
- `"droidforge"` - The name Droid CLI will use (can be anything)
- `"command": "droidforge"` - The executable to run (the global command we just installed)
- Droid CLI will automatically spawn this process when you use DroidForge features

---

## Step 4: Create Your Test Project (Empty Repo)

**Let's start with a blank slate to demonstrate DroidForge's conversational intelligence.**

```bash
# Create a new empty project directory
mkdir ~/my-test-project
cd ~/my-test-project

# Initialize git (optional but recommended)
git init
```

**Current state:**
```
~/my-test-project/
└── .git/           ← Only if you ran git init
```

**That's it!** An empty folder. DroidForge will learn what you're building through conversation.

---

## Step 5: Start Droid CLI

**Launch the interactive AI session:**

```bash
# Make sure you're in your project directory
cd ~/my-test-project

# Start Droid CLI
droid chat
```

**What you'll see:**

```
Droid CLI v1.2.0
Connected to Claude Sonnet 4
MCP servers available: droidforge
Ready.

> _
```

**What just happened:**
- Droid CLI started
- Claude AI connected
- Configuration loaded (found `droidforge` in config)
- **DroidForge is NOT running yet** (spawns on demand)

---

## Step 6: Initialize DroidForge (First Time)

**Type the magic command:**

```
> /forge-start
```

**Press Enter.**

---

### What Happens Next (Step by Step)

**1. DroidForge Spawns**

Behind the scenes, Droid CLI executes:
```bash
droidforge  # Your global command
```

DroidForge's stdio server starts and connects to Droid CLI via stdin/stdout.

**2. SmartScan Begins**

```
🤖 Smart-scanning your folder…
```

DroidForge analyzes your project directory:
- Looks for package.json, requirements.txt, go.mod, etc.
- Detects frameworks (React, Django, Express, FastAPI)
- Identifies testing setup (Jest, Pytest, Cypress)
- Scans for documentation

**For your empty repo:** Finds nothing yet (that's okay!)

**3. Scan Complete**

```
✅ Scan complete! Based on what I saw, I have a good feel for your repo.
```

Even though it's empty, the conversation continues...

---

### Step 7: The Conversation (Onboarding)

**Question 1: Project Goal**

```
Now let me learn what you want from your droids.

In one sentence, what project is this and how should your new droid team help?

Example: React web app; need droids to refactor and write tests.

> _
```

**You type** (example):
```
> Python Flask REST API for task management; need droids to build endpoints and write tests
```

**DroidForge records this.** Now it knows:
- Language: Python
- Framework: Flask
- Type: REST API
- Purpose: Task management
- Need: Backend development + testing

---

**Question 2: Methodology**

```
Great. Let's tune how your droids like to work. Pick the approach that matches you best:

1. Agile / Scrum - short sprints, fast feedback
2. Waterfall - structured phases, detailed planning
3. Kanban - continuous flow, visual progress
4. Test-Driven (TDD) - write tests first, then code
5. Spec-Driven (SDD) - spec as source of truth
6. Startup / Rapid Build - speed over polish
7. Enterprise / Compliance - stability, documentation
8. Other - describe your own style
9. None / Not sure yet - stay neutral for now

> _
```

**You type** (example):
```
> 4
```

**DroidForge records:** TDD methodology (tests first, then code)

---

**Question 3: Review Recommended Team**

```
Here's the starting roster I recommend. Toggle anything you do not need, 
rename if you prefer, and add custom specialists if you like.

Based on your project (Python Flask REST API with TDD):

Recommended droids:
  ✓ df-orchestrator     - Technical lead, coordinates all droids
  ✓ df-backend          - Flask expert, API development, SQLAlchemy
  ✓ df-database         - PostgreSQL/SQLite expert, schema design
  ✓ df-test             - Pytest expert, test coverage, TDD workflow
  ✓ df-api              - REST API specialist, endpoints, serialization

Optional: describe any custom droids you want at launch
Example: AuthGuard — handles authentication and JWT tokens

> _
```

**You can:**
- Press Enter to accept defaults
- Or add a custom droid: `AuthGuard — handles JWT authentication and user sessions`

**Let's accept defaults:**
```
> [press Enter]
```

---

**Creating Your Team**

```
Forging your droids now…
```

**What's happening:**
- DroidForge generates 5 specialized droid configuration files
- Each droid gets:
  - Unique ID (e.g., `df-backend`)
  - UUID for persistent tracking
  - Purpose statement
  - Abilities list
  - Knowledge about YOUR tech stack (Flask, Pytest, TDD)
  - Instructions for working style (TDD in this case)

**Files created:**
```
~/my-test-project/.droidforge/
├── droids/
│   ├── df-orchestrator.json    ← Technical lead
│   ├── df-backend.json         ← Flask expert
│   ├── df-database.json        ← Database specialist
│   ├── df-test.json            ← Pytest expert
│   └── df-api.json             ← REST API specialist
└── droids-manifest.json        ← Team metadata
```

---

**Slash Commands Installed**

```
Installing commands…
```

**What's happening:**
- DroidForge creates command definition files
- Droid CLI will automatically recognize these

**Files created:**
```
~/my-test-project/.factory/
└── commands/
    ├── forge-start.md      ← /forge-start command
    ├── df.md               ← /df command (main work command)
    ├── forge-guide.md      ← /forge-guide command
    ├── forge-logs.md       ← /forge-logs command
    └── forge-removeall.md  ← /forge-removeall command
```

---

**User Guide Generated**

```
📘 Guide printed below. Press Enter when you are ready to continue.

=============================================================
        DroidForge User Guide
        Your Personal AI Development Team
=============================================================

PROJECT: Python Flask REST API for task management
METHODOLOGY: Test-Driven Development (TDD)
TEAM SIZE: 5 specialized droids

-----------------------------------------------------------
YOUR DROID TEAM
-----------------------------------------------------------

df-orchestrator (Technical Lead)
  → Coordinates the entire team
  → Analyzes your requests and creates execution plans
  → Delegates tasks to appropriate specialists
  → Ensures work happens in parallel when safe
  → Prevents conflicts between droids

df-backend (Flask Expert)
  → Builds Flask endpoints and routes
  → Implements business logic
  → Integrates with database via SQLAlchemy
  → Follows TDD: tests first, then implementation
  → Knows Flask best practices and patterns

df-database (Database Specialist)
  → Designs database schemas
  → Creates and manages migrations
  → Optimizes queries
  → Ensures data integrity
  → Works with PostgreSQL/SQLite

df-test (Testing Expert)
  → Writes comprehensive Pytest tests
  → Ensures test coverage
  → Implements TDD workflow (tests before code)
  → Creates fixtures and mocks
  → Validates all functionality

df-api (REST API Specialist)
  → Designs RESTful endpoints
  → Handles request/response serialization
  → Implements error handling
  → Designs API contracts
  → Ensures consistent API patterns

-----------------------------------------------------------
HOW TO WORK WITH YOUR TEAM
-----------------------------------------------------------

Main command: /df <your request>

Examples:

  /df Create user registration endpoint with email validation
  
  /df Add task CRUD operations with SQLAlchemy models
  
  /df Implement JWT authentication middleware
  
  /df Write integration tests for all endpoints

What happens when you make a request:
  1. df-orchestrator analyzes your request
  2. Identifies which specialists are needed
  3. Creates an execution plan (what can run in parallel)
  4. Assigns tasks to droids
  5. Each droid works in isolation (no conflicts)
  6. Changes are merged atomically (all-or-nothing)
  7. You get a summary of what each droid accomplished

-----------------------------------------------------------
OTHER COMMANDS
-----------------------------------------------------------

/forge-guide       - Show this guide again
/forge-logs        - View recent activity log
/forge-add-droid   - Add a new specialist to your team
/forge-removeall   - Safely remove all droids (with confirmation)

-----------------------------------------------------------
READY TO START
-----------------------------------------------------------

Your team is ready. Each droid knows:
  • You're building a Flask REST API
  • Your goal is task management
  • You follow TDD methodology
  • Tests come before code
  • Your preferred frameworks and tools

Press Enter to continue…
```

**Press Enter.**

---

**Onboarding Complete**

```
✨ Next Steps

Type `/df <goal>` to talk to your orchestrator.
Use `/forge-guide` to reopen the handbook anytime.
Need cleanup? Run `/forge-removeall`.
Ready for more? Try `/forge-add-droid` to expand the team.

> _
```

---

## Step 8: Your First Request

**Now the empty repo becomes a real project!**

**Type your first work request:**

```
> /df Create the initial Flask project structure with user model and authentication endpoints
```

**Press Enter.**

---

### What Happens Behind the Scenes

**1. Orchestrator Analyzes Request**

```
🎯 Analyzing request…
```

df-orchestrator (your technical lead) thinks:
- "This requires: project setup, database model, API endpoints, tests"
- "I need: df-backend (Flask setup), df-database (User model), df-api (endpoints), df-test (tests)"
- "Some work is independent (models + tests can start together)"
- "API endpoints need models first (dependency)"

**2. Execution Plan Created**

```
📋 Execution plan:
  Task 1: df-backend   - Initialize Flask app, blueprints, config
  Task 2: df-database  - Create User model, authentication schema
  Task 3: df-test      - Write test fixtures and user model tests (waits for Task 2)
  Task 4: df-api       - Implement /register and /login endpoints (waits for Task 2)
  Task 5: df-test      - Write endpoint integration tests (waits for Task 4)

Parallel execution: Tasks 1 & 2 can run simultaneously
```

**3. Droids Start Working**

```
🤖 df-backend started: Flask initialization
🤖 df-database started: User model design

⏳ Waiting: df-test (needs User model)
⏳ Waiting: df-api (needs User model)
```

**Behind the scenes:**
- Each droid works in isolated staging area
- Resource locks prevent conflicts
- df-backend works on `app.py`, `__init__.py`, `config.py`
- df-database works on `models/user.py`, `migrations/`
- No file collisions possible

**4. First Wave Completes**

```
✅ df-backend completed: Flask app structure created
✅ df-database completed: User model with password hashing

🤖 df-api started: Registration and login endpoints
🤖 df-test started: User model tests
```

**5. Second Wave Completes**

```
✅ df-api completed: /register and /login endpoints
✅ df-test started: Endpoint integration tests
```

**6. Final Tests**

```
✅ df-test completed: All tests passing (15 tests)
```

**7. Atomic Merge**

```
🔀 Merging changes…
✅ All changes merged successfully
```

All droid work merged into your project in one atomic operation.

**8. Summary**

```
✨ Request completed!

Files created:
  • app.py                    - Flask application entry point
  • config.py                 - Configuration management
  • models/user.py            - User model with authentication
  • models/__init__.py        - Models package
  • routes/auth.py            - Authentication endpoints
  • routes/__init__.py        - Routes package
  • migrations/001_users.sql  - User table schema
  • tests/conftest.py         - Pytest fixtures
  • tests/test_user.py        - User model tests
  • tests/test_auth.py        - Authentication endpoint tests
  • requirements.txt          - Python dependencies
  • .env.example              - Environment variables template

Summary by droid:
  df-backend   → Flask app, config, blueprints
  df-database  → User model, password hashing, migrations
  df-api       → /register and /login endpoints with validation
  df-test      → 15 tests written (TDD), all passing

Ready for next request!

> _
```

---

## Step 9: Check What Was Created

**Exit Droid CLI temporarily:**

```
> exit
```

**Look at your project:**

```bash
# You're back in terminal
cd ~/my-test-project
ls -la
```

**Your empty repo is now:**

```
~/my-test-project/
├── .droidforge/               ← DroidForge state
│   ├── droids/
│   │   ├── df-orchestrator.json
│   │   ├── df-backend.json
│   │   ├── df-database.json
│   │   ├── df-test.json
│   │   └── df-api.json
│   └── droids-manifest.json
├── .factory/                  ← Slash commands
│   └── commands/
│       ├── forge-start.md
│       ├── df.md
│       └── ...
├── app.py                     ← Flask app (NEW!)
├── config.py                  ← Configuration (NEW!)
├── models/                    ← Models (NEW!)
│   ├── __init__.py
│   └── user.py
├── routes/                    ← Routes (NEW!)
│   ├── __init__.py
│   └── auth.py
├── migrations/                ← Database (NEW!)
│   └── 001_users.sql
├── tests/                     ← Tests (NEW!)
│   ├── conftest.py
│   ├── test_user.py
│   └── test_auth.py
├── requirements.txt           ← Dependencies (NEW!)
└── .env.example              ← Config template (NEW!)
```

**Check the Flask app:**

```bash
cat app.py
```

**You'll see a real Flask application, written by your droids!**

---

## Step 10: Continue Working

**Start Droid CLI again:**

```bash
droid chat
```

**This time, no onboarding needed:**

```
Droid CLI v1.2.0
Connected to Claude Sonnet 4
MCP servers available: droidforge
Ready.

> _
```

**Try another request:**

```
> /df Add task CRUD endpoints (create, read, update, delete) with proper validation
```

**The orchestrator remembers:**
- Your project type (Flask API)
- Your methodology (TDD)
- Your existing code structure
- Your droid team capabilities

**The cycle repeats:**
1. Orchestrator analyzes
2. Creates execution plan
3. Droids work in parallel (safely)
4. Changes merged atomically
5. You get working code

---

## Common Commands Reference

**Main work command:**
```
/df <your request>
```

**Examples:**
```
/df Add email verification to user registration
/df Implement pagination for task list endpoint
/df Add rate limiting to authentication endpoints
/df Write performance tests for database queries
/df Refactor authentication logic into a service layer
```

**Other commands:**
```
/forge-guide       - Show user guide
/forge-logs        - View activity history
/forge-add-droid   - Add custom specialist
/forge-removeall   - Clean removal (requires confirmation)
```

---

## How DroidForge Handles Different Scenarios

### Scenario 1: Empty Repo (What You Just Did)

✅ **Works perfectly**
- Learns through conversation
- Creates droids based on your description
- Scaffolds project from scratch

### Scenario 2: Existing Codebase

**What happens:**
```
> /forge-start
🤖 Smart-scanning your folder…
✅ Scan complete!

Found:
  • React 18 with TypeScript
  • Express backend with Prisma ORM
  • Jest + React Testing Library
  • Docker setup

Creating specialized team for your React + Express stack…
```

**Droids created:**
- df-orchestrator (technical lead)
- df-frontend (React 18 + TypeScript expert)
- df-backend (Express + Prisma expert)
- df-test (Jest + RTL expert)
- df-docker (Docker configuration expert)

**Each droid knows YOUR specific setup:**
- Your React version and patterns
- Your state management choice
- Your API structure
- Your testing conventions
- Your deployment setup

### Scenario 3: Multi-Framework Projects

**Project has React frontend + Django backend:**

**SmartScan detects both:**
```
Found:
  • React 18 frontend (src/frontend/)
  • Django 4 backend (src/backend/)
  • PostgreSQL database
  • Celery for async tasks
```

**Droids created:**
- df-orchestrator
- df-react (React specialist)
- df-django (Django specialist)
- df-database (PostgreSQL specialist)
- df-async (Celery specialist)
- df-test (Frontend: Jest + Backend: Pytest)

**Each droid works in their domain:**
- Frontend changes → df-react
- Backend changes → df-django
- Database changes → df-database
- They coordinate through df-orchestrator

---

## Troubleshooting

### "droid: command not found"

**Problem:** Droid CLI not in PATH

**Fix:**
```bash
# Find where it's installed
find ~ -name "droid" -type f 2>/dev/null

# Add to PATH (example - adjust path as needed)
export PATH="$HOME/.factory/bin:$PATH"
echo 'export PATH="$HOME/.factory/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### "droidforge: command not found"

**Problem:** npm global bin not in PATH

**Fix:**
```bash
# Check where npm installs global packages
npm bin -g
# Example output: /usr/local/bin

# Add to PATH
export PATH="$(npm bin -g):$PATH"
echo 'export PATH="$(npm bin -g):$PATH"' >> ~/.bashrc
source ~/.bashrc

# Or reinstall
npm install -g droidforge
```

### "/forge-start does nothing"

**Problem:** DroidForge not configured in Droid CLI

**Fix:**
```bash
# Check config file exists
cat ~/.factory/config.json

# Should have:
{
  "mcpServers": {
    "droidforge": {
      "command": "droidforge"
    }
  }
}

# If missing, add it:
nano ~/.factory/config.json
# Add the mcpServers section
# Save and try again
```

### "DroidForge server failed to start"

**Problem:** Permission or path issue

**Fix:**
```bash
# Test droidforge directly
timeout 2 droidforge 2>&1 || true
# Should show: "DroidForge MCP Server (stdio) started"

# If error about permissions:
which droidforge
# Check if file is executable:
ls -la $(which droidforge)
# Should show: -rwxr-xr-x (x = executable)

# If not executable:
chmod +x $(which droidforge)
```

### "Node version too old"

**Problem:** Node.js < 16

**Fix:**
```bash
# Install Node.js 20 (LTS):
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify:
node --version
# Should show: v20.x.x
```

---

## Next Steps

### Learn More

- **README.md** - Full feature overview
- **docs/CLI_SPEC.md** - Complete command reference
- **docs/PARALLEL_ORCHESTRATION.md** - How parallel execution works
- **QUICKSTART.md** - Quick reference guide

### Share Feedback

- **GitHub Issues:** Report bugs or request features
- **GitHub Discussions:** Ask questions, share tips
- **Community:** Join Factory.ai Discord

### Advanced Usage

**Add custom droids:**
```
> /forge-add-droid
```

**Create snapshots:**
```
> /df Create a snapshot of current team configuration
```

**View detailed logs:**
```
> /forge-logs
```

---

## Summary: What You Accomplished

**Starting point:** Empty folder on Linux

**Ending point:** 
- ✅ Droid CLI installed and configured
- ✅ DroidForge installed and working
- ✅ Custom AI droid team created for YOUR project
- ✅ Project scaffolded from conversation
- ✅ Working code generated by multiple droids in parallel
- ✅ Ready to continue building

**Key insight:** You had a **conversation** with AI, and it created a **specialized development team** that understands YOUR project and can build it FOR you, with multiple droids working safely in parallel.

**Time from zero to working:** 10-15 minutes

**Commands learned:**
- `droid chat` - Start AI session
- `/forge-start` - Initialize DroidForge
- `/df <request>` - Work with your team

**You're ready to build!** 🚀
