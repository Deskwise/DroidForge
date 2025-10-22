# DroidForge Tutorial: From Zero to Droid Army

##  Learning Goals

This tutorial will teach you how to:
- Set up DroidForge on any project
- Create and customize droids for your team
- Use droids effectively in your development workflow
- Scale from small personal projects to large teams

##  Prerequisites

- Node.js 16+ installed
- A code project (any size - even a simple "hello world" works)
- Basic familiarity with command line tools
- [Factory CLI](https://github.com/factory/cli) installed

##  Step 1: Create a Sample Project

Let's start with a simple Node.js/TypeScript project:

```bash
# Create project directory
mkdir my-awesome-project
cd my-awesome-project

# Initialize npm project
npm init -y

# Setup TypeScript
npm install -D typescript @types/node
npx tsc --init

# Create basic structure
mkdir src
mkdir scripts
```

### Create Basic Project Files

**src/index.ts:**
```typescript
export function greet(name: string): string {
  return `Hello, ${name}!`;
}

export function calculate(a: number, b: number): number {
  return a + b;
}
```

**src/types.ts:**
```typescript
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
}
```

**package.json scripts:**
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "node --loader ts-node/esm src/index.ts",
    "test": "node --test tests/**/*.test.js",
    "lint": "eslint src/**/*.ts"
  }
}
```

**README.md:**
```markdown
# My Awesome Project

A sample project to demonstrate DroidForge capabilities.

## Features
- User management system
- Product catalog
- REST API

## Tech Stack
- Node.js with TypeScript
- Express.js for API
- PostgreSQL database

## Development
```bash
npm run dev    # Start development server
npm run build  # Build for production
npm test       # Run tests
```
```

##  Step 2: Initialize DroidForge

Now let's set up DroidForge for our project:

```bash
# Install DroidForge
npm install -g droidforge

# Initialize project
droidforge init
```

You'll see output like:
```
 Installing global orchestrator...
 Creating project documentation...
 Generated AGENTS.md
 Generated docs/droid-guide.md
 Generated .droidforge/droids-manifest.json
 Initialized: global orchestrator + project docs + manifest
```

### What Just Happened?

1. **Global Orchestrator**: Installed at `~/.droidforge/droids/orchestrator.md`
2. **Project Brief**: Created `docs/droid-guide.md` with usage guidelines
3. **Team Manifest**: Generated `.droidforge/droids-manifest.json`
4. **Agent Overview**: Created `AGENTS.md` with team structure

## 🗣 Step 3: Conversational Analysis

Let's create our project droids:

```bash
droidforge synthesize
```

DroidForge will start an intelligent conversation to understand your project needs. This isn't a questionnaire - it's a dialogue that continues until DroidForge has enough information to create the perfect specialized AI team.

### Example Conversation

**Starting the conversation:**
```
Hello! I'm here to help you create the perfect AI team for your project.
I'll ask you some questions to understand what you want to build, and we'll keep talking
until I have enough detail to create the ideal specialized droids for you.

What do you want to build?
> I want to build a user management and product catalog system

That's interesting! Tell me more about who will be using this system and what problems
they face right now.

> Small business owners who are struggling with spreadsheets and manual processes

Ah, manual processes can be so frustrating! What's the most time-consuming part of
their current workflow?

> Tracking customer information and managing product inventory separately

[Conversation continues...]
```

DroidForge continues asking intelligent follow-up questions to understand:
- **Pain Points**: Current workflow problems and frustrations
- **User Needs**: Who will use the system and what they need to accomplish
- **Technical Comfort**: Experience level and learning preferences
- **Domain Requirements**: Industry-specific needs and challenges

### Domain-Specific Examples

**Dental Office:**
```
> I want to build a web app for a dentist office

That's exciting! What's the biggest challenge you're trying to solve in your
dental practice right now?

> We keep losing appointments and patients call to cancel

Ah, appointment management! What's been most frustrating about how you handle
appointments now?

> We're still using a paper calendar...

[Leads to: frontend-dental, backend-dental, scheduler-dental]
```

**Restaurant:**
```
> I need a restaurant ordering system

Excellent! What kind of restaurant service do you need most help with?
Taking orders, managing tables, kitchen display, or something else?

> Taking orders and table management

When customers come in, what's the most frustrating part of managing tables now?

> We get overwhelmed during peak hours...

[Leads to: frontend-restaurant, backend-restaurant]
```

**Beginner-Friendly:**
```
> I want to build a fitness app but I've never coded before

That's completely fine! Everyone starts somewhere. I'll make sure to set you up
with beginner-friendly tools. Are you more interested in building something that
works quickly or are you excited to learn some coding?

> I want to learn coding

Great attitude! I'd recommend starting with web development...

[Leads to: beginner-friendly tech stack recommendations]
```

The conversation continues until DroidForge achieves deep understanding of your needs, then creates the perfect specialized AI team.

##  Step 4: Repository Scanning

After the conversational analysis, DroidForge scans your repository:

```
 Scanning repository...
📜 Discovering scripts...
🧠 Fusing signals with project intent...
 Generating droids...
 Droid synthesis complete!
```

### What DroidForge Found

```json
{
  "signals": {
    "prdPaths": ["README.md"],
    "frameworks": ["typescript", "node"],
    "testConfigs": [],
    "prdContent": {
      "vision": "Build a user management and product catalog system...",
      "features": ["User management system", "Product catalog", "REST API"],
      "acceptanceCriteria": []
    }
  },
  "scripts": {
    "files": [],
    "npmScripts": [
      {"name": "build", "command": "tsc -p ."},
      {"name": "dev", "command": "node --loader ts-node/esm src/index.ts"},
      {"name": "test", "command": "node --test tests/**/*.test.js"},
      {"name": "lint", "command": "eslint src/**/*.ts"}
    ]
  }
}
```

##  Step 5: Generated Droids

DroidForge creates specialized droids based on your project. Here's what you'll typically see:

### Core Development Droids

**.droidforge/droids/dev.md:**
```markdown
---
name: "Full Stack Developer"
role: "dev"
model: "gpt-4-turbo"
tools: ["file:src/**/*", "api:local", "db:postgresql"]
scope: "Backend API, database operations, core business logic"
---

# Full Stack Developer

## Capabilities
- Express.js API development
- PostgreSQL database operations
- TypeScript implementation
- API testing and documentation

## Tool Access
- **Read**: All project files
- **Write**: `src/**`, `tests/**`
- **Commands**: `npm run dev`, `npm test`, `npm run build`
- **Database**: Read/write access to PostgreSQL
```

**.droidforge/droids/frontend.md:**
```markdown
---
name: "Frontend Specialist"
role: "ui-ux"
model: "gpt-4-turbo"
tools: ["file:frontend/**/*", "browser:preview"]
scope: "React components, user interface, user experience"
---
```

**.droidforge/droids/script-test.md:**
```markdown
---
name: "Testing Specialist"
role: "script-test"
model: "gpt-4-turbo"
tools: ["file:tests/**/*", "command:npm test"]
scope: "Test writing, test execution, quality assurance"
---
```

##  Step 6: Review Generated Documentation

### AGENTS.md
Your team overview is now available:

```bash
cat AGENTS.md
```

You'll see your complete droid team with roles and responsibilities.

### docs/droid-guide.md
Comprehensive usage guide for your team:

```bash
cat docs/droid-guide.md
```

This guide explains how each droid should be used and coordinated.

##  Step 7: Using Your Droids

### List Available Droids

```bash
factory droids list
```

Output:
```
 Available Droids:
├── dev - Full Stack Developer
├── frontend - Frontend Specialist
├── script-test - Testing Specialist
├── script-build - Build Automation
└── reviewer - Code Reviewer
```

### Task Examples

**Backend Development:**
```bash
factory droids use dev "Implement user registration endpoint with email validation"
```

**Frontend Development:**
```bash
factory droids use frontend "Create responsive login form component with TypeScript"
```

**Testing:**
```bash
factory droids use script-test "Write unit tests for user registration endpoint"
```

**Code Review:**
```bash
factory droids use reviewer "Review the user registration implementation"
```

### Using Script Droids

For automated tasks, use script droids:

```bash
# Build the project
factory droids use script-build

# Run tests
factory droids use script-test

# Lint code
factory droids use script-lint
```

##  Step 8: Orchestrated Workflows

Let the orchestrator coordinate complex tasks:

```bash
factory orchestrator "Add user authentication system"
```

The orchestrator will:
1. **Analyze Request**: Break down into sub-tasks
2. **Assign Droids**:
   - `dev` for backend implementation
   - `frontend` for login forms
   - `script-test` for authentication tests
3. **Coordinate Work**: Ensure proper sequencing
4. **Quality Check**: Use `reviewer` to validate implementation

##  Step 9: Performance Monitoring

### Optimized Scanning

For larger projects, use optimized scanning:

```bash
droidforge synthesize --optimized
```

This uses:
- Parallel file processing
- Cached results
- Incremental updates

### Conflict Resolution

When adding new droids that might conflict:

```bash
droidforge add-script scripts/deploy.sh
```

If there are conflicts, you'll see:
```
  File claim conflict detected:
├── script-deploy wants: scripts/deploy.sh
├── dev wants: scripts/**/*
├── Suggestion: Prioritize script-deploy for deployment scripts
 Resolution applied automatically
```

##  Step 10: Advanced Features

### Custom Droid Creation

Add specialized droids for specific needs:

```bash
# Add database migration droid
droidforge add-script scripts/migrate.sh

# Add API documentation droid
droidforge add-script scripts/docs.sh
```

### Reanalysis and Updates

When your project evolves:

```bash
# Check what needs updating
droidforge reanalyze --dry-run

# Apply updates if needed
droidforge reanalyze
```

### Integration with Development Workflow

Add to your CI/CD pipeline:

```yaml
# .github/workflows/droids.yml
name: Update Droids
on:
  push:
    paths:
      - 'src/**'
      - 'package.json'
      - 'README.md'

jobs:
  update-droids:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install DroidForge
        run: npm install -g droidforge
      - name: Update Droids
        run: droidforge reanalyze --dry-run
      - name: Commit if changed
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add .droidforge/
          git commit -m "Auto-update droids" || exit 0
```

##  Congratulations!

You've successfully:
 Set up DroidForge on a project
 Created a custom droid team
 Used droids for development tasks
 Implemented orchestrated workflows
 Set up performance optimizations

##  Next Steps

1. **Explore Project Templates**: Check out different project types
2. **Customize Droids**: Modify droid configurations for your needs
3. **Team Collaboration**: Share droids with your team
4. **Advanced Topics**: Learn about custom tools and integrations

##  Additional Resources

- [Project Templates](./TEMPLATES.md)
- [Advanced Configuration](./ADVANCED.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Community Examples](https://github.com/Deskwise/DroidForge/examples)

##  Troubleshooting Common Issues

### "No droids generated"
- Check if your project has recognizable patterns
- Ensure package.json has scripts
- Add a README.md with project description

### "Analysis seems stuck"
- Use Ctrl+C to cancel and restart
- Try a more detailed project description
- Check that Node.js is properly installed

### "Droids not working with Factory CLI"
- Ensure Factory CLI is installed
- Check that `.droidforge/droids/` directory exists
- Verify droid files have correct YAML frontmatter

### "Performance issues on large projects"
- Use `--optimized` flag
- Consider using `.droidforgeignore` file
- Break large projects into sub-projects

Happy coding with your new droid army! 