# Documentation Reorganization Plan

**Date:** 2025-10-28  
**Status:** Proposal  
**Goal:** Consolidate scattered documentation into industry-standard structure

---

## Current Problems

### Scattered Files Across Multiple Locations
```
Root directory:
├── README.md, QUICKSTART.md, CHANGELOG.md
├── TODO.md, TODO-temp.txt (task tracking)
├── AGENTS.md (AI development rules)

docs/ directory (20+ files mixing):
├── Specs: UX_SPEC.md, onboarding-spec.md, CLI_SPEC.md
├── Plans: IMPLEMENTATION_PLAN.md, docs/specifications/implementation-plan.md
├── Notes: IMPLEMENTATION_NOTES.md, remaining.txt, scratch.txt
├── Status: IMPLEMENTATION_STATUS.md, PRODUCTION_READINESS_REPORT.md
├── Guides: ARCHITECTURE.md, DEPLOYMENT_GUIDE.md, LOCAL_SETUP.md
├── AI-specific: gemini-only/ (7 files)
├── Backups: backup/, traycer/
├── Misc: sonnet45-plan.md, SPEC-METHODOLOGY-RECOMMENDATIONS.md
```

### Issues
1. **No clear separation** between user docs and developer docs
2. **Multiple overlapping files** (IMPLEMENTATION_PLAN.md vs onboarding-implementation-plan.md)
3. **Task lists scattered** (TODO.md, TODO-temp.txt, remaining.txt)
4. **Specs mixed with implementation notes**
5. **No clear entry points** for different audiences

---

## Industry Standard: Divio Documentation System

### The Four Documentation Types

**1. TUTORIALS** (Learning-oriented)
- For newcomers learning by doing
- Step-by-step lessons
- Example: "Build your first DroidForge team"

**2. HOW-TO GUIDES** (Problem-oriented)
- For users solving specific problems
- Practical steps for common tasks
- Example: "How to add a custom droid"

**3. REFERENCE** (Information-oriented)
- For users looking up specifics
- Technical descriptions, API docs
- Example: "CLI Command Reference", "API Documentation"

**4. EXPLANATION** (Understanding-oriented)
- For users understanding concepts
- Background, architecture, design decisions
- Example: "How Parallel Execution Works", "Why We Use MCP"

---

## Proposed Structure

### Root Directory (Minimal, User-Facing)
```
/
├── README.md                    # Project overview, quick links
├── QUICKSTART.md                # 5-minute getting started
├── CHANGELOG.md                 # Version history
├── CONTRIBUTING.md              # How to contribute
├── LICENSE                      # MIT license
└── AGENTS.md                    # AI development rules (keep here)
```

### Documentation Directory (Organized by Type)
```
docs/
├── README.md                    # Documentation index with clear sections
│
├── tutorials/                   # LEARNING (for newcomers)
│   ├── getting-started.md       # Consolidated from QUICKSTART.md
│   └── first-team.md            # Create your first droid team
│
├── guides/                      # PROBLEM-SOLVING (for users)
│   ├── user/                    # End-user guides
│   │   ├── onboarding.md        # Complete onboarding guide
│   │   ├── working-with-droids.md
│   │   ├── methodology-guide.md
│   │   └── troubleshooting.md
│   │
│   └── developer/               # Developer guides
│       ├── local-setup.md       # From LOCAL_SETUP.md
│       ├── deployment.md        # From DEPLOYMENT_GUIDE.md
│       ├── testing.md
│       └── contributing.md      # Detailed from CONTRIBUTING.md
│
├── reference/                   # INFORMATION (lookup)
│   ├── cli-commands.md          # From CLI_SPEC.md
│   ├── api-reference.md
│   ├── configuration.md
│   ├── file-structure.md
│   └── methodology-catalog.md   # All 10 methodologies explained
│
├── explanation/                 # UNDERSTANDING (concepts)
│   ├── architecture.md          # From ARCHITECTURE.md (includes Team Coordination section)
│   ├── onboarding-system.md     # 10-data-point collection explained
│   ├── methodology-selection.md # Why no pattern matching
│   └── design-decisions.md      # ADRs (Architecture Decision Records)
│
├── specifications/              # SPECS (for implementation)
│   ├── onboarding-spec.md       # User experience spec
│   ├── ux-spec.md               # From UX_SPEC.md
│   ├── implementation-plan.md   # From onboarding-implementation-plan.md
│   └── security.md              # From SECURITY_REVIEW.md
│
├── project/                     # PROJECT MANAGEMENT
│   ├── status.md                # From IMPLEMENTATION_STATUS.md
│   ├── production-readiness.md  # From PRODUCTION_READINESS_REPORT.md
│   ├── roadmap.md               # Future plans
│   ├── tasks.md                 # Active tasks (from TODO.md)
│   └── audit-log.md             # From DOCUMENTATION_AUDIT.md
│
└── archive/                     # HISTORICAL (keep but separate)
    ├── poc/                     # POC research (existing)
    ├── session-notes/           # Development sessions (existing)
    ├── deprecated/              # Old versions of docs
    │   ├── scratch.txt
    │   ├── remaining.txt
    │   ├── sonnet45-plan.md
    │   └── TODO-temp.txt
    └── ai-context/              # AI-specific (from gemini-only/)
        ├── gemini.md
        └── analysis/
```

---

## File Mapping (What Goes Where)

### Current → New Structure

#### User-Facing Documentation
| Current File | New Location | Notes |
|-------------|--------------|-------|
| `README.md` | `README.md` | Simplify, link to docs/ |
| `QUICKSTART.md` | `docs/tutorials/getting-started.md` | Expand into full tutorial |
| `CLI_SPEC.md` | `docs/reference/cli-commands.md` | Rename for clarity |
| `ARCHITECTURE.md` | `docs/explanation/architecture.md` | Move to explanations |

#### Specifications
| Current File | New Location | Notes |
|-------------|--------------|-------|
| `onboarding-spec.md` | `docs/specifications/onboarding-spec.md` | Keep as spec |
| `UX_SPEC.md` | `docs/specifications/ux-spec.md` | Consolidate with onboarding |
| `onboarding-implementation-plan.md` | `docs/specifications/implementation-plan.md` | Merge implementation details |
| `IMPLEMENTATION_PLAN.md` | `docs/specifications/implementation-plan.md` | MERGE with above |

#### Project Management
| Current File | New Location | Notes |
|-------------|--------------|-------|
| `TODO.md` | `docs/project/tasks.md` | Active tasks only |
| `TODO-temp.txt` | `docs/archive/deprecated/` | Archive |
| `IMPLEMENTATION_STATUS.md` | `docs/project/status.md` | Current status |
| `IMPLEMENTATION_NOTES.md` | `docs/project/status.md` | Merge with status |
| `PRODUCTION_READINESS_REPORT.md` | `docs/project/production-readiness.md` | Keep as milestone |
| `DOCUMENTATION_AUDIT.md` | `docs/project/audit-log.md` | Audit findings |

#### Developer Documentation
| Current File | New Location | Notes |
|-------------|--------------|-------|
| `LOCAL_SETUP.md` | `docs/guides/developer/local-setup.md` | Developer guide |
| `DEPLOYMENT_GUIDE.md` | `docs/guides/developer/deployment.md` | Developer guide |
| `SECURITY_REVIEW.md` | `docs/specifications/security.md` | Security spec |
| `MIGRATION.md` | `docs/guides/user/migration.md` | User migration guide |

#### Scratch/Temporary Files
| Current File | New Location | Notes |
|-------------|--------------|-------|
| `remaining.txt` | `docs/archive/deprecated/` | Archive |
| `scratch.txt` | `docs/archive/deprecated/` | Archive |
| `sonnet45-plan.md` | `docs/archive/deprecated/` | Archive |

#### AI-Specific
| Current File | New Location | Notes |
|-------------|--------------|-------|
| `gemini-only/*` | `docs/archive/ai-context/` | Keep for reference |
| `AGENTS.md` | `AGENTS.md` (root) | Keep at root for AI visibility |

---

## Implementation Checklist

### Phase 1: Create New Structure (Week 1)
- [ ] Create all new directories
- [ ] Create README.md in each directory explaining its purpose
- [ ] Update root README.md with new documentation links

### Phase 2: Consolidate Overlapping Files (Week 1-2)
- [ ] Merge `IMPLEMENTATION_PLAN.md` + `onboarding-implementation-plan.md` → `docs/specifications/implementation-plan.md`
- [ ] Merge `IMPLEMENTATION_STATUS.md` + `IMPLEMENTATION_NOTES.md` → `docs/project/status.md`
- [ ] Consolidate `TODO.md` + `TODO-temp.txt` → `docs/project/tasks.md`
- [ ] Merge `UX_SPEC.md` + `onboarding-spec.md` → `docs/specifications/ux-spec.md`

### Phase 3: Move Files to New Locations (Week 2)
- [ ] Move user guides to `docs/guides/user/`
- [ ] Move developer guides to `docs/guides/developer/`
- [ ] Move reference docs to `docs/reference/`
- [ ] Move explanations to `docs/explanation/`
- [ ] Archive temporary files to `docs/archive/deprecated/`

### Phase 4: Create Missing Documentation (Week 2-3)
- [ ] Create `docs/tutorials/first-team.md`
- [ ] Create `docs/guides/user/methodology-guide.md`
- [ ] Create `docs/reference/methodology-catalog.md` (all 10 methodologies)
- [ ] Create `docs/explanation/onboarding-system.md` (10-data-point system)
- [ ] Create `docs/project/roadmap.md`

### Phase 5: Update Cross-References (Week 3)
- [ ] Update all internal links to new paths
- [ ] Update `docs/README.md` as main documentation index
- [ ] Update root `README.md` to link to new structure
- [ ] Test all documentation links

### Phase 6: Archive Cleanup (Week 3)
- [ ] Move old docs to `docs/archive/deprecated/`
- [ ] Move AI-specific docs to `docs/archive/ai-context/`
- [ ] Keep `archive/poc/` and `archive/session-notes/` as is
- [ ] Add README files in archive directories explaining contents

---

## Benefits of New Structure

### For Users
✅ **Clear entry points** - Tutorials for learning, guides for tasks  
✅ **Easy navigation** - Logical grouping by purpose  
✅ **No confusion** - Specs separate from guides separate from reference  

### For Developers
✅ **Know where to add** - Clear categories for new docs  
✅ **Reduce duplication** - Consolidated overlapping files  
✅ **Better maintenance** - Standard structure everyone understands  

### For Contributors
✅ **Contributing guide** - Clear in `docs/guides/developer/`  
✅ **Spec documents** - All in `docs/specifications/`  
✅ **Architecture docs** - All in `docs/explanation/`  

---

## Documentation Index Template

Create `docs/README.md` as the main index:

```markdown
# DroidForge Documentation

## 🚀 Getting Started
- [5-Minute Quickstart](tutorials/getting-started.md)
- [Create Your First Team](tutorials/first-team.md)

## 📖 User Guides
- [Complete Onboarding Guide](guides/user/onboarding.md)
- [Working with Droids](guides/user/working-with-droids.md)
- [Methodology Selection Guide](guides/user/methodology-guide.md)
- [Troubleshooting](guides/user/troubleshooting.md)

## 🔧 Developer Guides
- [Local Development Setup](guides/developer/local-setup.md)
- [Deployment Guide](guides/developer/deployment.md)
- [Contributing to DroidForge](guides/developer/contributing.md)
- [Testing Guide](guides/developer/testing.md)

## 📚 Reference
- [CLI Command Reference](reference/cli-commands.md)
- [API Documentation](reference/api-reference.md)
- [Configuration Options](reference/configuration.md)
- [Methodology Catalog](reference/methodology-catalog.md)

## 💡 Understanding DroidForge
- [System Architecture](explanation/architecture.md) - includes Team Coordination details
- [The 10-Data-Point System](explanation/onboarding-system.md)
- [Design Decisions](explanation/design-decisions.md)

## 📋 Project Information
- [Current Status](project/status.md)
- [Production Readiness](project/production-readiness.md)
- [Roadmap](project/roadmap.md)
- [Active Tasks](project/tasks.md)
```

---

## Migration Timeline

**Week 1:** Structure creation, file consolidation  
**Week 2:** File moves, new documentation  
**Week 3:** Link updates, archive cleanup, final review  

**Estimated Effort:** 15-20 hours over 3 weeks

---

## Success Metrics

✅ No duplicate content across files  
✅ Every doc has clear audience and purpose  
✅ All cross-references work  
✅ New contributors can find what they need in <5 minutes  
✅ Users can learn, solve problems, and reference easily  

---

## Questions to Answer Before Starting

1. Do we keep `AGENTS.md` at root or move to `docs/`?  
   **Recommendation:** Keep at root for AI agent visibility

2. Do we keep deployment docs in main docs or separate?  
   **Recommendation:** `docs/guides/developer/deployment.md` (part of dev guides)

3. How do we handle version-specific docs?  
   **Recommendation:** Use `docs/archive/v1.0/` etc. for old versions

4. What about generated docs (API reference)?  
   **Recommendation:** Keep in `docs/reference/api-reference.md`, auto-generate if possible

---

## Next Steps

1. **Review this plan** - Get team feedback
2. **Approve structure** - Agree on directory organization
3. **Start Phase 1** - Create directory structure
4. **Execute in order** - Follow phases sequentially
5. **Test thoroughly** - Verify all links work
