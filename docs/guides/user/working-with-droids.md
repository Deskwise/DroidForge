# Understanding Droids in DroidForge

## What are Droids?

In DroidForge, **droids** are specialized AI agents designed to handle specific aspects of software development. Each droid has:

- **A focused role** (e.g., frontend development, testing, API design)
- **Domain expertise** in specific technologies and patterns
- **File access patterns** defining their scope of work
- **Guidelines** for code quality and best practices

### Naming Convention

**All DroidForge droids use the `df-` prefix:**

- ✅ `df-orchestrator` - The coordinator droid (always present)
- ✅ `df-frontend` - Frontend specialist
- ✅ `df-backend` - Backend specialist
- ✅ `df-test` - Testing specialist
- ❌ `frontend` - Missing prefix (not allowed)
- ❌ `droidforge-api` - Wrong prefix (should be `df-api`)

**Why the df- prefix?**
1. **Clear identification** - Instantly recognize DroidForge-managed droids
2. **Easy cleanup** - `/forge-removeall` can safely identify all droids
3. **Namespace separation** - Prevents conflicts with other tools
4. **Professional consistency** - Predictable, clean naming

Multi-word droids use hyphens: `df-react-ui`, `df-ml-pipeline`, `df-ios-native`

## Droid Lifecycle

### 1. Creation (Forging)

Droids are created during the onboarding process:

```
/forge-start
```

DroidForge analyzes your repository and suggests appropriate specialists based on:
- Detected languages and frameworks
- Project architecture
- Development methodology
- Team needs

### 2. Definition

Each droid is defined in `.droidforge/droids/<droid-name>.json`:

```json
{
  "name": "frontend-specialist",
  "role": "Frontend Development",
  "description": "Expert in React, TypeScript, UI/UX",
  "capabilities": [
    "React components",
    "State management",
    "CSS/styling",
    "Responsive design"
  ],
  "filePatterns": [
    "src/components/**",
    "src/pages/**",
    "src/styles/**"
  ],
  "guidelines": [
    "Follow React best practices",
    "Use TypeScript for type safety",
    "Write accessible components",
    "Test user interactions"
  ]
}
```

### 3. Coordination

The **df-orchestrator** coordinates all droids:
- Routes user requests to appropriate specialists
- Creates execution plans
- Manages dependencies
- Coordinates team work

### 4. Execution

When delegated a task, a droid:
1. Receives a specific request
2. Works within their file patterns
3. Follows their guidelines
4. Reports completion

## Types of Droids

### Standard Specialists

Commonly created droids:

| Droid | Role | Typical Scope |
|-------|------|---------------|
| **df-orchestrator** | Coordination | All files (read-only) |
| **frontend-specialist** | UI Development | `src/components/`, `src/pages/` |
| **backend-specialist** | API/Business Logic | `src/api/`, `src/services/` |
| **test-specialist** | Testing & QA | `tests/`, `*.test.ts` |
| **docs-specialist** | Documentation | `docs/`, `README.md` |
| **db-specialist** | Database | `migrations/`, `models/` |
| **devops-specialist** | CI/CD | `.github/`, `Dockerfile` |

### Custom Specialists

You can add custom droids for specific needs:

```
/forge-add-droid
```

Examples:
- **security-specialist** - Security audits and fixes
- **performance-specialist** - Performance optimization
- **accessibility-specialist** - A11y compliance
- **mobile-specialist** - React Native development

## Droid Capabilities

### File Access

Droids can only modify files matching their `filePatterns`:

```json
"filePatterns": [
  "src/components/**/*.tsx",
  "src/components/**/*.css",
  "tests/components/*.test.tsx"
]
```

This prevents:
- Accidental modifications outside their scope
- Conflicts with other specialists
- Unauthorized access to sensitive files

### Autonomy Levels

DroidForge droids operate at different autonomy levels:

- **L1 (Interactive)**: Confirms each action
- **L2 (Semi-Autonomous)**: Batch confirmations
- **L3 (Fully Autonomous)**: No confirmations (used in orchestrated work)

During orchestration, droids work at **L3** to enable coordinated teamwork.

### Context Awareness

Each droid has access to:
- **Repository context**: Languages, frameworks, architecture
- **Tech stack**: Tools and libraries in use
- **Project goal**: Overall project objective
- **Methodology**: Agile, TDD, etc.
- **Team roster**: Other available specialists

## How Droids Communicate

### Event Bus

Droids communicate via an event bus:

```typescript
// Droid publishes event
eventBus.emit({
  type: 'task.completed',
  executionId: 'exec-123',
  nodeId: 'node-1',
  droidId: 'frontend-specialist',
  timestamp: '2024-10-24T10:00:00Z'
});

// Other droids can subscribe
eventBus.onExecution('exec-123', (event) => {
  if (event.type === 'task.completed') {
    // React to completion
  }
});
```

### Resource Coordination

Droids coordinate through the **ExecutionManager**:
- Request resources (files to modify)
- Wait for dependencies to complete
- Report progress
- Signal completion

## Working in Isolation

During coordinated work, droids work in **staging directories**:

```
.droidforge/exec/<execution-id>/staging/<node-id>/
```

This ensures:
- No file conflicts between droids
- Changes can be reviewed before merging
- Failed tasks can be retried cleanly
- Rollback is possible

See [../explanation/architecture.md](../explanation/architecture.md) for details on how DroidForge coordinates work.

## Best Practices

### Creating Custom Droids

When adding a custom droid:

1. **Define a clear role**: What is their specific expertise?
2. **Limit their scope**: What files should they modify?
3. **Set guidelines**: What standards should they follow?
4. **Avoid overlaps**: Ensure no conflict with existing droids

### Optimizing Droid Performance

- **Specific requests**: Clear instructions yield better results
- **Proper delegation**: Let the orchestrator route requests
- **Resource claims**: Clearly define what files each task needs
- **Dependencies**: Explicitly state task dependencies

### Troubleshooting

**Droid not responding:**
- Check `/forge-status` for execution state
- Review logs with `/forge-logs`
- Ensure the droid definition is valid

**Unexpected behavior:**
- Review the droid's guidelines
- Check their file patterns
- Ensure proper context was provided

**Conflicts:**
- Review resource claims in execution plan
- Check for overlapping file patterns
- Adjust droid scopes if needed

## Advanced Topics

### Droid Templates

DroidForge uses templates to generate droids:

```
templates/
├── orchestrator.json
├── frontend-specialist.json
├── backend-specialist.json
└── test-specialist.json
```

These templates adapt to your specific tech stack.

### Droid Evolution

Droids can be updated:
- Add new capabilities
- Adjust file patterns
- Update guidelines
- Modify instructions

Edit `.droidforge/droids/<droid-name>.json` directly.

### Multi-Repository Droids

Future enhancement: Droids that work across multiple repositories.

## Related Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [CLI_SPEC.md](CLI_SPEC.md) - Command reference
- [Architecture Guide](../explanation/architecture.md) - System architecture
- [../CONTRIBUTING.md](../CONTRIBUTING.md) - Contributing guidelines

---

*For more details on Factory.ai's droid system, see the [Factory.ai documentation](https://docs.factory.ai).*

