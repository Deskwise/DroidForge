# DroidForge

Transform any repository into a specialized AI droid army with the power of Factory CLI.

DroidForge is a Node.js CLI that automatically analyzes your project and generates specialized AI assistants (droids) tailored to your codebase, team structure, and development workflow.

## What DroidForge Does

- **Smart Analysis**: Scans your PRD/README, source code, and scripts to understand your project
- **Droid Generation**: Creates specialized AI assistants with scoped tools and permissions
- **Team Coordination**: Installs a global orchestrator to manage droid collaboration
- **Documentation**: Generates comprehensive team guides and usage documentation
- **Continuous Updates**: Reanalyzes and evolves your droid team as your project grows

## Quick Start

### Installation
```bash
# Global installation (recommended)
npm install -g droidforge

# Or use with npx (no installation needed)
npx droidforge --help
```

### 5-Minute Setup

```bash
# 1. Install dependencies (both are required)
npm install -g droidforge
npm install -g @factory/cli

# 2. Initialize your project
droidforge init

# 3. Create your droid team (interactive interview)
droidforge synthesize

# 4. Start using your droids!
factory droids list
factory droids use dev "Implement user authentication"
```

## Core Features

### Intelligent Project Analysis
DroidForge analyzes your repository to understand:
- **Frameworks & Technologies**: React, Node.js, Python, etc.
- **Project Structure**: Architecture patterns and organization
- **Build Systems**: Scripts, CI/CD, deployment processes
- **Team Patterns**: Development workflow and collaboration style
- **Domain Knowledge**: Business logic and project purpose

### Specialized Droid Generation
Creates role-specific AI assistants:

| Droid Type | Role | Tools | Example Tasks |
|------------|------|-------|---------------|
| **dev** | Full-stack development | Code files, API, database | Implement features, fix bugs |
| **frontend** | UI/UX development | Components, styles, preview | Design interfaces, styling |
| **backend** | API development | Server code, database | Build REST APIs, schemas |
| **reviewer** | Code quality | All files (read), linter | Review PRs, enforce standards |
| **qa** | Testing & quality | Test files, test runner | Write tests, check coverage |
| **script-\<name\>** | Automation | Specific scripts, tools | Build, deploy, migrate |

### Team Orchestration
The global orchestrator coordinates multi-droid workflows:
- Breaks complex tasks into sub-tasks
- Assigns appropriate droids to each sub-task
- Manages handoffs and dependencies
- Ensures quality standards are met

##  Commands Overview

### **`droidforge init`** 
Initialize project and install global orchestrator
```bash
droidforge init [--force]
```

### **`droidforge synthesize`** 
Generate droids from analysis (main workflow)
```bash
droidforge synthesize [--dry-run] [--force] [--optimized]
```

### **`droidforge scan`** 
Analyze repository without generating droids
```bash
droidforge scan
```

### **`droidforge add-script`** 
Wrap a specific script as a droid
```bash
droidforge add-script <script-path> [--dry-run]
```

### **`droidforge reanalyze`** 
Update existing droids for project changes
```bash
droidforge reanalyze [--dry-run]
```

##  Interactive Interview

The first `synthesize` command starts an interactive interview to understand your project:

**Sample Questions:**
- What is the primary goal of this project?
- Who are your target users?
- What's your team size and structure?
- What technologies are you using?
- How does your team work together?

**Sample Answers:**
```
Goal: Build a task management app for small teams
Users: Small business teams (5-50 people)
Team: 3 developers, 1 designer
Tech: React, Node.js, PostgreSQL, TypeScript
Workflow: Feature branches, PR reviews, weekly deployments
```

##  Project Structure After Setup

```
your-project/
├── .factory/
│   ├── droids/
│   │   ├── dev.md              # Full-stack developer
│   │   ├── frontend.md         # Frontend specialist
│   │   ├── reviewer.md         # Code reviewer
│   │   └── script-build.md     # Build automation
│   ├── project-brief.yaml      # Interview results
│   └── droids-manifest.json   # Team metadata
├── docs/
│   └── droid-guide.md          # Team usage guide
├── AGENTS.md                    # Team overview
└── README.md
```

##  Using Your Droids

Once droids are generated, use them with [Factory CLI](https://github.com/factory/cli):

### List Your Team
```bash
factory droids list
```
```
 Available Droids:
├── dev - Full Stack Developer
├── frontend - Frontend Specialist
├── reviewer - Code Reviewer
└── script-build - Build Automation
```

### Assign Tasks
```bash
# Backend development
factory droids use dev "Implement user registration API endpoint"

# Frontend development
factory droids use frontend "Create responsive login form"

# Code review
factory droids use reviewer "Review the authentication implementation"

# Automated tasks
factory droids use script-build
```

### Orchestrated Workflows
Let the orchestrator coordinate complex tasks:
```bash
factory orchestrator "Add user authentication system"
```

The orchestrator will:
1. Break down into: API endpoints, database schema, frontend forms, tests
2. Assign to: dev (API), dev (DB), frontend (UI), script-test (tests)
3. Coordinate work and ensure quality standards

##  Example Workflow

### Setting Up a New React Project

```bash
# 1. Create React project
npx create-react-app my-app --template typescript
cd my-app

# 2. Initialize DroidForge
droidforge init

# 3. Interview (sample answers)
# Goal: Task management app for teams
# Users: Small business teams
# Team: 2 developers, 1 designer
# Tech: React, TypeScript, Node.js, PostgreSQL
# Workflow: Agile sprints, PR reviews

# 4. Generate droids
droidforge synthesize

# 5. Start development
factory droids use dev "Set up Express API with task CRUD operations"
factory droids use frontend "Create task list component with TypeScript"
factory droids use script-test "Write tests for task management"
```

### Generated Droids for React Project

**dev.md:**
```yaml
---
name: "Full Stack Developer"
role: "dev"
tools: ["file:src/**/*", "file:server/**/*", "command:npm run dev"]
scope: "React components, Express API, PostgreSQL integration"
---
```

**frontend.md:**
```yaml
---
name: "Frontend Specialist"
role: "ui-ux"
tools: ["file:src/**/*.{tsx,css}", "browser:preview"]
scope: "React components, UI/UX, styling, user interactions"
---
```

##  Performance Features

### **Optimized Scanning**
For large repositories:
```bash
droidforge synthesize --optimized
```
- Parallel file processing
- Cached scan results
- Incremental updates
- 3-5x faster on large codebases

### **Smart Caching**
DroidForge caches:
- Repository scan results
- Framework detection
- Script analysis
- Interview responses

### **Conflict Resolution**
Automatic detection and resolution of overlapping droid responsibilities:
```bash
  Conflict detected: dev and frontend both want src/components/**
 Resolution: frontend handles components, dev handles state management
```

##  Advanced Usage

### **Custom Droid Patterns**
Influence droid creation in your project brief:

```yaml
# .factory/project-brief.yaml
signals:
  custom_patterns:
    - name: "microservices"
      droids: ["api-gateway", "service-auth", "service-users"]
```

### **Integration with CI/CD**
```yaml
# .github/workflows/update-droids.yml
name: Update Droids
on:
  push:
    paths: ['src/**', 'package.json']
jobs:
  update-droids:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Update droids
        run: |
          droidforge reanalyze --dry-run
          git add .factory/
          git commit -m "Auto-update droids" || exit 0
```

### **Configuration File**
Create `.droidforgerc.json`:
```json
{
  "cache": {
    "maxAge": "7d",
    "maxSize": "100MB"
  },
  "scanning": {
    "ignorePatterns": ["node_modules", "*.log"],
    "maxDepth": 5
  },
  "droids": {
    "defaultModel": "gpt-4-turbo",
    "maxTools": 10
  }
}
```

##  Documentation

- **[User Guide](./docs/USER_GUIDE.md)** - Comprehensive usage documentation
- **[Tutorial](./docs/TUTORIAL.md)** - Step-by-step tutorial from zero to droid army
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Advanced Configuration](./docs/ADVANCED.md)** - Advanced customization options
- **[Project Templates](./docs/TEMPLATES.md)** - Templates for different project types

##  When to Use DroidForge

### **Perfect For:**
- **New Projects**: Set up AI assistance from day one
- **Existing Projects**: Add AI assistance to established codebases
- **Team Onboarding**: Help new team members understand project structure
- **Code Reviews**: Automated code review and quality enforcement
- **Documentation**: Always up-to-date project documentation
- **Task Management**: Break down complex tasks and assign to appropriate specialists

### **Project Types Supported:**
- **Web Applications**: React, Vue, Angular, Node.js, Express
- **Mobile Apps**: React Native, Flutter
- **Backend Systems**: Python, Java, Go, Rust
- **Data Projects**: Jupyter notebooks, data pipelines
- **DevOps Tools**: Infrastructure as code, CI/CD pipelines

##  Requirements

- **Node.js** 16+ (18+ recommended)
- **Factory CLI** - Required to use generated droids (`npm install -g @factory/cli`)
- **Git** repository (recommended for version control)

** Important**: DroidForge creates droids but requires Factory CLI to run them. Both tools work together:
- **DroidForge**: Analyzes your repo and generates specialized AI droids
- **Factory CLI**: Provides the runtime environment for droids to execute tasks

##  Installation

```bash
# Install both required tools
npm install -g droidforge
npm install -g @factory/cli

# Verify installations
droidforge --version
factory --version
```

### What Each Tool Does
- **DroidForge**: `npm install -g droidforge` - Creates AI droids from your codebase
- **Factory CLI**: `npm install -g @factory/cli` - Runs the droids to execute tasks

##  Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup
```bash
git clone https://github.com/factory/droidforge.git
cd droidforge
npm install
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

##  Links

- **GitHub Repository**: https://github.com/factory/droidforge
- **Factory CLI**: https://github.com/factory/cli
- **Documentation**: https://docs.factory.ai/droidforge
- **Community**: https://discord.gg/factory
- **Issues**: https://github.com/factory/droidforge/issues

##  Common Issue: Factory CLI Not Found

**Problem**: After running `droidforge synthesize`, when you try:
```bash
factory droids list
```
You get: `command not found: factory`

**Solution**: Install Factory CLI (it's a separate package):
```bash
npm install -g @factory/cli
```

**Both tools are required:**
1. **DroidForge** creates the droids
2. **Factory CLI** runs the droids

**Quick verification:**
```bash
droidforge --version  # Should show DroidForge version
factory --version     # Should show Factory CLI version
```

## 🆘 Support

- **Troubleshooting**: [Troubleshooting Guide](./docs/TROUBLESHOOTING.md)
- **Community**: [GitHub Discussions](https://github.com/factory/droidforge/discussions)
- **Issues**: [GitHub Issues](https://github.com/factory/droidforge/issues)
- **Email**: support@factory.ai

---

**Transform your development workflow with AI-powered droids! **

Start with `droidforge init` and build your personalized AI development team today.
