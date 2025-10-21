# DroidForge User Guide

##  Quick Start

### Prerequisites - Install Both Tools

DroidForge works together with Factory CLI. Both tools are required:

```bash
# Install DroidForge (creates AI droids)
npm install -g droidforge

# Install Factory CLI (runs the droids)
npm install -g @factory/cli

# Verify both are working
droidforge --version
factory --version
```

### What Each Tool Does
- **DroidForge**: Analyzes your repository and generates specialized AI droids
- **Factory CLI**: Provides the runtime environment for droids to execute tasks

### First Time Setup
```bash
# 1. Initialize your project
droidforge init

# 2. Create your AI team (interactive interview)
droidforge synthesize

# 3. Start using your new AI team!
factory droids list
factory droids use dev "Build a new feature"
```

 **Important**: After `droidforge synthesize`, use `factory` commands to interact with your droids.

##  Core Commands

### `droidforge init`
Initialize a new project by installing the global orchestrator and creating starter documentation.

```bash
droidforge init [--force]
```

**Options:**
- `--force`: Overwrite existing global orchestrator

**What it does:**
- Installs global orchestrator at `~/.factory/droids/orchestrator.md`
- Creates `AGENTS.md` with team overview
- Generates `docs/droid-guide.md` for team usage
- Creates `.factory/droids-manifest.json`

### `droidforge scan`
Analyze your repository to detect frameworks, scripts, and PRD content.

```bash
droidforge scan
```

**Output:**
```json
{
  "signals": {
    "prdPaths": ["README.md", "docs/prd/prd.md"],
    "frameworks": ["react", "typescript"],
    "testConfigs": ["jest.config.js", "vitest.config.ts"],
    "prdContent": { ... }
  },
  "scripts": {
    "files": ["scripts/build.sh"],
    "npmScripts": [
      {"name": "build", "command": "tsc -p .", "path": "npm:build"}
    ]
  }
}
```

### `droidforge synthesize`
Generate droids based on interview, repository analysis, and PRD content.

```bash
droidforge synthesize [--dry-run] [--force] [--optimized]
```

**Options:**
- `--dry-run`: Preview changes without writing files
- `--force`: Skip interview confirmation prompts
- `--optimized`: Use faster scanning for large repositories

**Process:**
1. Interactive interview (if project brief missing)
2. Repository scanning
3. Signal fusion and droid planning
4. Droid generation with conflict resolution
5. Documentation updates

### `droidforge add-script`
Wrap a specific script as a droid with least-privilege tools.

```bash
droidforge add-script <script-path> [--dry-run]
```

**Examples:**
```bash
droidforge add-script scripts/build.sh
droidforge add-script "npm:test"
droidforge add-script package.json#deploy
```

### `droidforge reanalyze`
Update existing droids based on repository changes.

```bash
droidforge reanalyze [--dry-run]
```

**What it does:**
- Updates project brief with latest intent
- Detects changes since last synthesis
- Proposes updates to existing droids
- Suggests new droids for new capabilities

##  Interactive Interview

The interview process captures your project intent and requirements:

### Key Questions
1. **Project Goal**: What problem does your project solve?
2. **Team Size**: How many people are working on this?
3. **Primary Tech Stack**: What languages/frameworks are you using?
4. **Development Workflow**: How does your team work together?
5. **Target Users**: Who will use the final product?

### Project Brief Structure
The interview creates `.factory/project-brief.yaml`:
```yaml
project:
  name: "My Project"
  vision: "Transform user experience through innovative solutions"
  team_size: 3-5
  target_users: "Enterprise developers"

workflow:
  development_style: "collaborative"
  testing_approach: "comprehensive"
  deployment_frequency: "weekly"

signals:
  frameworks: ["react", "typescript", "node"]
  patterns: ["component-driven", "api-first"]
  specializations: ["ui", "backend", "testing"]
```

##  Understanding Droids

### What are Droids?
Droids are AI assistants with specific roles, scoped permissions, and specialized tools.

### Droid Structure
```markdown
<!-- droid-name.md -->
---
name: "Frontend Developer"
role: "ui-ux"
model: "gpt-4-turbo"
tools: ["file:src/**/*.{tsx,css}", "browser:preview", "api:local"]
scope: "UI components, styling, and user interactions"
---

# Frontend Developer

## Capabilities
- React/TypeScript component development
- CSS styling and responsive design
- Component testing with Jest/React Testing Library
- Performance optimization and accessibility

## Tool Access
- **Read**: All source files
- **Write**: `src/components/**`, `src/styles/**`
- **Commands**: `npm run dev`, `npm test`
- **Preview**: Browser preview for UI changes

## Guidelines
- Follow existing design system patterns
- Ensure accessibility compliance
- Write tests for new components
- Document complex component logic
```

### Common Droid Types

#### **Development Droids**
- **dev**: Full-stack development, core features
- **frontend**: UI/UX components, styling
- **backend**: API development, database
- **mobile**: React Native, iOS/Android

#### **Quality Droids**
- **reviewer**: Code review, standards enforcement
- **qa**: Testing, quality assurance
- **security**: Security audits, vulnerability scanning
- **performance**: Performance optimization

#### **Specialized Droids**
- **ui-ux**: Design system, user experience
- **api**: API design, documentation
- **domain-specialist**: Business logic, domain expertise
- **script-<name>**: Specific script execution

##  Working with Droids

### Using Factory CLI
Once droids are generated, use them via Factory CLI:

```bash
# List available droids
factory droids list

# Use a specific droid
factory droids use dev "Implement user authentication"

# Chat with specialized droid
factory droids use ui-ux "Design login form"

# Execute script droid
factory droids use script-build "Build the application"
```

### Droid Orchestration
The global orchestrator manages team coordination:

```bash
# Let orchestrator coordinate task
factory orchestrator "Add user authentication system"

# Orchestrator will:
# 1. Break down task into sub-tasks
# 2. Assign appropriate droids
# 3. Coordinate handoffs
# 4. Ensure quality standards
```

## 📁 Project Structure

After synthesis, your project structure includes:

```
project/
├── .factory/
│   ├── droids/
│   │   ├── dev.md
│   │   ├── reviewer.md
│   │   ├── qa.md
│   │   └── script-build.md
│   ├── project-brief.yaml
│   └── droids-manifest.json
├── docs/
│   ├── droid-guide.md
│   └── USER_GUIDE.md
├── AGENTS.md
└── README.md
```

### Key Files

#### **AGENTS.md**
Team overview with droid descriptions and usage guidelines.

#### **docs/droid-guide.md**
Comprehensive guide for team members on using droids effectively.

#### **.factory/droids-manifest.json**
Manifest of all droids with metadata and relationships.

##  Performance Features

### Optimized Scanning
For large repositories, use the `--optimized` flag:

```bash
droidforge synthesize --optimized
```

**Optimizations:**
- Parallel file processing
- Cached scanning results
- Incremental updates
- Smart pattern matching

### Caching
DroidForge maintains intelligent caches for:
- Repository scan results
- Framework detection
- Script analysis
- PRD parsing

Cache is automatically invalidated when files change.

##  Advanced Usage

### Custom Droid Patterns
Influence droid creation through your project brief:

```yaml
signals:
  custom_patterns:
    - name: "microservices"
      droids: ["api-gateway", "service-auth", "service-users"]
    - name: "data-heavy"
      droids: ["data-engineer", "ml-specialist", "performance-optimizer"]
```

### Conflict Resolution
When droids have overlapping responsibilities, DroidForge:

1. **Detects Conflicts**: Identifies pattern overlaps
2. **Proposes Resolutions**: Suggests strategies (merge, prioritize, split)
3. **Human Review**: Requires confirmation for changes
4. **Implements Solution**: Applies resolution strategy

### Integration with CI/CD
Include droid updates in your workflow:

```bash
# Update droids on major changes
droidforge reanalyze --dry-run
# Review changes, then:
droidforge reanalyze

# Regenerate documentation
factory droids list --docs > docs/current-team.md
```

## 🚨 Troubleshooting

### Common Issues

#### **"Missing project brief"**
```bash
# Run interview to create project brief
droidforge synthesize
```

#### **"Conflicts detected"**
```bash
# Review conflict report
droidforge synthesize --dry-run
# Conflicts will be shown with resolution suggestions
```

#### **"Droid generation failed"**
```bash
# Check repository structure
droidforge scan
# Ensure project has recognizable patterns
```

### Debug Mode
Use verbose logging for troubleshooting:

```bash
DEBUG=droidforge:* droidforge synthesize
```

### Reset and Recovery
```bash
# Clear cache (if issues persist)
rm -rf .factory/cache

# Regenerate all droids
droidforge init --force
droidforge synthesize --force
```

##  Best Practices

### Project Setup
1. **Clear README/PRD**: Have clear project documentation
2. **Consistent Structure**: Follow standard project patterns
3. **Defined Scripts**: Include build, test, and deploy scripts

### Team Workflow
1. **Regular Updates**: Run `reanalyze` when adding major features
2. **Review Changes**: Use `--dry-run` before applying changes
3. **Document Usage**: Keep `docs/droid-guide.md` updated

### Droid Usage
1. **Role Clarity**: Use droids for their intended roles
2. **Tool Permissions**: Respect scoped access patterns
3. **Quality Standards**: Let reviewer droid enforce standards

##  Next Steps

1. **Try the Tutorial**: [Step-by-step tutorial](./TUTORIAL.md)
2. **View Examples**: [Project examples](./EXAMPLES.md)
3. **Advanced Topics**: [Advanced configuration](./ADVANCED.md)
4. **Troubleshooting**: [Common issues and solutions](./TROUBLESHOOTING.md)

##  Additional Resources

- [Factory CLI Documentation](https://github.com/factory/cli)
- [Project Templates](./TEMPLATES.md)
- [Community Examples](https://github.com/factory/examples)
- [Support](https://github.com/factory/droidforge/issues)