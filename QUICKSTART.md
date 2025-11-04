# DroidForge Quick Start

Get up and running with DroidForge in 5 minutes.

## What is DroidForge?

**Phase 1 (today):** DroidForge forges a custom development team for YOUR codebase and gives you a single orchestrator droid (“quarterback”) that routes work to specialists one at a time.

It analyzes your repository—languages, frameworks, architecture, and patterns—then creates specialized droids who know your project intimately. You stay in one conversation with the orchestrator, who handles the serial hand-offs and merges results safely.

**Phase 2 (in development):** The same architecture will grow into safe parallel orchestration using the existing staging + merge pipeline.

## Prerequisites

- **Node.js** 16 or higher
- **Factory.ai Droid CLI** installed and configured
- A code repository to work on

## Installation

### 1. Install the Package

```bash
npm install -g droidforge
```

Or, clone and build from source:

```bash
git clone https://github.com/Deskwise/DroidForge.git
cd DroidForge
npm install
npm run build
```

### 2. Configure with Factory.ai

Register DroidForge with the Factory CLI:

```bash
droid mcp remove droidforge              # optional cleanup
droid mcp add droidforge droidforge-mcp-server --type stdio
```

Verify with `droid mcp list`. The server will start automatically when needed.

## First Time Usage

### Step 1: Start DroidForge

Launch `droid` in your project directory and run:

```
/forge-start
```

**New Repository:**
- DroidForge will scan your codebase
- Ask about your project goal
- Suggest a methodology (Agile, TDD, etc.)
- Propose a team of specialist droids
- Show live boot logs as the team is created

**Returning to Existing Repository:**
- Shows a dashboard with your current team
- Lists available commands
- Ready to accept requests immediately

### Step 2: Work with Your Team

Use the orchestrator to coordinate your droid team:

```
/df Implement authentication with JWT tokens
```

The `df` (DroidForge) command routes requests to `df-orchestrator`, who:
- Keeps you in one conversation
- Delegates the request to the right specialist (one at a time)
- Uses staging worktrees and safe merge logic before reporting back
- Logs every hand-off so you can review what happened

### Step 3: Monitor Progress

Check execution status:

```
/forge-status
```

View recent logs:

```
/forge-logs
```

## Available Commands

| Command | Description |
|---------|-------------|
| `/forge-start` | Initialize or return to DroidForge |
| `/forge-guide` | View the user guide |
| `/forge-status` | Check execution status |
| `/forge-logs` | View activity logs |
| `/forge-add-droid` | Add a new specialist to the team |
| `/forge-removeall` | Clean up all DroidForge data |
| `/forge-help` | Show command reference |
| `/df <request>` | Send a request to the orchestrator |

## Common Workflows

### Adding a New Feature

```
/df Add a REST API endpoint for user profiles with CRUD operations
```

The orchestrator will:
1. Analyze the request
2. Create a plan with dependencies
3. Assign tasks to appropriate droids
4. Coordinate implementation
5. Run tests
6. Report completion

### Refactoring Code

```
/df Refactor the authentication module to use a repository pattern
```

### Writing Tests

```
/df Write comprehensive unit tests for the payment service
```

### Fixing Bugs

```
/df Fix the memory leak in the WebSocket connection handler
```

## Directory Structure

After initialization, DroidForge creates:

```
your-repo/
├── .factory/
│   ├── droids/           # Droid definitions (*.json)
│   ├── droids-manifest.json  # Team configuration
│   ├── exec/             # Execution state and staging areas
│   └── commands/         # Installed slash commands (*.md)
└── docs/
    └── DroidForge_user_guide_en.md  # Generated guide
```

## Configuration Files

### Droid Definitions (`.droidforge/droids/*.json`)

Each droid has a JSON file specifying:
- **Name and role**
- **Capabilities and specialization**
- **Instructions and guidelines**
- **File access patterns**

Example:

```json
{
  "name": "api-specialist",
  "role": "API Development",
  "capabilities": ["REST API", "OpenAPI", "Authentication"],
  "instructions": "Focus on API endpoints, validation, and documentation"
}
```

### Manifest (`.droidforge/manifest.json`)

The manifest tracks:
- Project goal
- Chosen methodology
- Team roster
- Last activity timestamp

## Advanced Features

### Parallel Orchestration (Phase 2 roadmap)

The execution and staging modules already support safe parallelism, but the integration hardening is still underway. Today the orchestrator runs tasks serially; once Phase 2 lands it will:
- Detect independent tasks and schedule them concurrently
- Use resource locking to prevent conflicts
- Merge isolated worktrees atomically

### Snapshots

Create a snapshot before major changes:

```
/forge-snapshot "Before authentication refactor"
```

Restore if needed:

```
/forge-restore
```

### Custom Specialists

Add a custom droid to your team:

```
/forge-add-droid
```

Follow the prompts to define:
- Droid name and role
- Specialization and skills
- File patterns to work on

## Troubleshooting

### "No droids found"

Run `/forge-start` to initialize the team.

### "Execution failed"

Check logs with `/forge-logs` and the execution status with `/forge-status`.

### Conflicts During Serial Runs (Future Parallel Prep)

DroidForge already uses the staging + locking pipeline while running specialists one at a time. If a conflict is reported (or when parallel mode arrives):
1. Check `/forge-status` for details
2. Review staging areas in `.factory/exec/`
3. Manually resolve if needed

### Clean Start

To reset everything and remove all DroidForge data:

```
/forge-removeall
```

**Safety confirmation required:**
1. You'll see a preview of what will be removed (droids, files, counts)
2. Type exactly: `remove all droids` to confirm
3. Confirmation is case-insensitive ("REMOVE ALL DROIDS" works)
4. Wrong confirmation cancels with no changes

After removal, run `/forge-start` to reinitialize.

## Next Steps

- Read the [full README](README.md) for architecture overview
- Keep the active spec index handy: [docs/README.md](docs/README.md)
- Follow the methodology rules: [docs/SPEC-METHODOLOGY-RECOMMENDATIONS.md](docs/SPEC-METHODOLOGY-RECOMMENDATIONS.md)
- See [CONTRIBUTING.md](CONTRIBUTING.md) to contribute

## Getting Help

- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/Deskwise/DroidForge/issues)
- **Community:** [Factory.ai Discord](https://discord.gg/factory-ai)

---

**Ready to forge your droid team?** Run `/forge-start` and let's get started! 🚀
