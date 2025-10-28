# DroidForge User Experience Specification

**Version:** 2.0 (Post UX Redesign)  
**Last Updated:** 2025-10-27  
**Status:** Design Specification - Implementation Required

---

## Core Philosophy

DroidForge should feel like **chatting with an omniscient humble friend who can architect anything**.

### What This Means:
- **Omniscient** - Understands your project from minimal context
- **Humble** - Suggests, doesn't demand; accepts being wrong
- **Friend** - Conversational, not bureaucratic
- **Eager but not annoying** - Helpful without being chatty

### NOT:
- ❌ A form-filling wizard
- ❌ A system that exposes technical internals (sessionIds, tool names)
- ❌ A chatbot that asks unnecessary questions
- ❌ A process that breaks on one wrong parameter

---

## Data Requirements (Non-Negotiable)

The interview must capture these 10 data points before moving past Gate 3 (methodology):

1. Project description / vision
2. Target audience
3. Timeline constraints
4. Quality vs. speed priorities
5. Team size / solo vs. team
6. Technical experience level
7. Budget constraints
8. Deployment/hosting requirements
9. Security or compliance needs
10. Scalability expectations

Use intelligent parsing first, then follow-up questions to fill gaps. Track explicit vs. inferred answers so the AI can confirm low-confidence assumptions.

---

## The 5 Gates (Deterministic Structure)

The onboarding flow MUST go through these gates in order. They're non-negotiable checkpoints, but transitions should feel natural.

```
Gate 1: Scan Repository
   ↓
Gate 2: Understand Project Goal
   ↓
Gate 3: Pick Methodology (REQUIRED - no skipping)
   ↓
Gate 4: Recommend Specialists
   ↓
Gate 5: Create Team
```

---

## Design Principle: Response-First Thinking

**ALWAYS design for actual user responses FIRST, then craft questions.**

### Why This Matters:
Users are diverse:
- Vibe coders with no technical context
- Experienced devs who know exactly what they want
- Non-technical founders describing business needs
- People testing the tool with nonsense

### The Process:
1. List 5-10 realistic responses you'll get
2. Design to handle ALL of them gracefully
3. THEN write the question with examples showing the range

---

## Gate 1: Repository Scan

### What Happens:
- System silently scans repo for frameworks, scripts, PRDs
- No user interaction required
- Session created automatically (user never sees sessionId)

### Output Format:
```
Conversational, not technical:
✅ "I see an empty repo. What are you building?"
✅ "Found a React setup. What are you building with this?"
❌ "Repository Analysis Complete! [technical JSON output]"
```

---

## Gate 2: Project Goal Collection

### Expected Responses:
Real responses you'll get:
- "an iOS game"
- "something like Wordle but for recipes"
- "an app for my son's soccer team"
- "I'm converting my Python script to Rust"
- "idk I'm just testing this out"
- "a SaaS for dentists"
- "I want Sesame Street characters to design my website"

### Question Format:
```markdown
What are you building?

Examples: 
  "iOS artillery game with physics"
  "Landing page for a dentist office"  
  "Workout tracking app"
  "Converting my Python tool to Rust"
```

### Design Requirements:
- **Show 3-4 diverse examples** (game, website, app, conversion)
- **Accept casual language** ("an app for my son" is fine)
- **No tech jargon required** (don't force them to say "React SPA")
- **Handle creative requests** (Sesame Street theme)

### Implementation Notes:
- Extract key concepts: platform (iOS/web/desktop), domain (game/business/tool)
- Don't reject "weird" requests - embrace them
- Store verbatim for context in later stages

---

## Gate 3: Methodology Selection (REQUIRED)

### Expected Responses:
Real responses you'll get:
- "2" (follows numbered instructions)
- "tdd"
- "the fast one"
- "whatever you recommend"
- "idk what these mean, you pick"
- "which one do game devs use?"
- "agile I guess"

### Question Format:
```markdown
For [PROJECT CONTEXT], these fit best:

  1. [METHOD 1] - [OUTCOME not jargon]
  2. [METHOD 2] - [OUTCOME not jargon]  
  3. [METHOD 3] - [OUTCOME not jargon]

(See all 10 options: agile, tdd, bdd, waterfall, kanban, lean, ddd, devops, rapid, enterprise)

What fits your workflow?

Examples: "2" or "tdd" or "whichever is fastest" or "you decide"
```

### The 10 Methodologies (Always Available):

**Format: name - outcome-focused description**

1. **agile** - Flexible sprints, adapt as you go
2. **tdd** - Write tests first, catches bugs early
3. **bdd** - User story focused, non-technical stakeholders involved
4. **waterfall** - Plan everything upfront, sequential phases
5. **kanban** - Visual workflow, continuous delivery
6. **lean** - Build-measure-learn, fast experiments
7. **ddd** - Business logic modeling, complex domains
8. **devops** - Infrastructure as code, automated deployments
9. **rapid** - Build fast, iterate on feel
10. **enterprise** - Documentation heavy, compliance required

### Top 3 Recommendation Logic:

**Based on project context, suggest the most relevant approaches dynamically.**

The AI must:
- Consider timeline pressure vs. quality expectations
- Weigh regulatory or compliance requirements
- Factor in team size and experience level
- Recognize domain constraints (physics, infra, content-heavy, etc.)
- Ask for clarification when context is ambiguous

**Critical:** No hard-coded mappings or keyword lookups. Recommendations must emerge from the collected 10 data points.

### Design Requirements:
- **Always list all 10** (after showing top 3)
- **Accept flexible input**: numbers (1-10), names (tdd), delegation ("you pick")
- **Use outcome language**: "catches bugs" not "ensures correctness through automated testing"
- **Show WHY**: "For physics accuracy..." explains the recommendation
- **Allow delegation**: "you decide" → pick the #1 recommendation
- **No wrong answers**: Even "none" or "basic" is valid

### Intent Understanding (NO PATTERN MATCHING):

**The AI should naturally understand user intent. Trust the LLM.**

Examples of natural interpretation:
- "2" → Understand this refers to second option in list
- "tdd" → Map to the methodology by name
- "the fast one" → Understand they value speed → recommend rapid
- "the testing one" → Understand they value quality → recommend tdd
- "you pick" → Use top recommendation
- "I heard about XP programming" → If unknown, be honest: "I'm not familiar with XP. Let me look that up..." [use web search]

**Critical: If user mentions something unfamiliar:**
```
User: "I want to use Extreme Programming"
AI: "I'm not familiar with Extreme Programming methodology. Let me look that up for you..."
     [searches online]
     "Got it - XP focuses on pair programming and rapid iterations. That's closest to our 'rapid' 
     methodology. Should I set you up with that approach?"
```

**NO rigid keyword matching rules.** The AI can understand:
- References to numbers (1-10)
- References to outcomes ("fast", "thorough", "flexible")
- References to methodologies by name or description
- Delegation of decision
- New/unfamiliar methodologies (look them up)

---

## Gate 4: Specialist Recommendations

### Critical Rule: METHODOLOGY MUST BE VISIBLE

**At least one droid name/role MUST explicitly embody the methodology choice.**

### Why This Matters:
Users need to SEE their choice reflected in the team. This shows:
- You listened to their input
- Their choice has real impact
- The system is personalized, not generic

### Examples:

#### iOS Game + TDD:
```
Your team:
  • Test-First Lead - Writes physics test suite before implementation
  • iOS Specialist - Swift/SwiftUI, UIKit integration
  • Physics Engineer - Trajectory calculations, collision detection
  • AI Developer - Bot opponent logic and difficulty tuning
```
**Note:** "Test-First Lead" directly reflects TDD methodology

#### Same Game + Agile:
```
Your team:
  • Sprint Coordinator - Manages iterations, backlog prioritization
  • iOS Specialist - Swift/SwiftUI, UIKit integration
  • Physics Engineer - Trajectory calculations, collision detection
  • AI Developer - Bot opponent logic and difficulty tuning
```
**Note:** "Sprint Coordinator" directly reflects Agile methodology

#### Same Game + Rapid Prototyping:
```
Your team:
  • Iteration Specialist - Fast MVP cycles, quick pivots
  • iOS Specialist - Swift/SwiftUI, UIKit integration
  • Physics Engineer - Trajectory calculations, collision detection
  • AI Developer - Bot opponent logic and difficulty tuning
```
**Note:** "Iteration Specialist" directly reflects Rapid methodology

#### Dentist Landing Page + Waterfall:
```
Your team:
  • Requirements Architect - Upfront planning, specification docs
  • Frontend Developer - HTML/CSS/JS implementation
  • Content Strategist - Copy, SEO, patient journey
```
**Note:** "Requirements Architect" reflects Waterfall approach

### Creative Request Handling:

**User:** "I want Sesame Street characters to build my website"

```
Your team:
  • Builder Big Bird - HTML/CSS structure, yellow hard-hat energy
  • Designer Elmo - Visual styling, friendly UI, red everywhere
  • Cookie Monster - JavaScript, consumes APIs hungrily
  • Count von Count - Analytics tracking, counts everything
```

**Methodology integration:**
- If TDD: "Test-First Ernie" (tests with rubber ducky)
- If Agile: "Sprint-Master Grover" (near and far iterations)
- If Rapid: "Fast-Iteration Cookie Monster" (rapid cookie testing)

### Naming Conventions:

**Structure:** `[Role/Methodology] + [Domain Specialist]`

**Methodology-Specific Roles:**
- TDD → "Test-First [X]", "Test Lead", "Quality Guardian"
- Agile → "Sprint Coordinator", "Scrum Master", "Iteration Manager"
- Rapid → "Iteration Specialist", "MVP Builder", "Fast-Cycle Engineer"
- Waterfall → "Requirements Architect", "Phase Manager", "Planning Lead"
- DevOps → "Pipeline Engineer", "Infrastructure Guardian", "Deploy Specialist"
- DDD → "Domain Architect", "Business Logic Modeler", "Context Mapper"
- BDD → "Story Facilitator", "Behavior Specialist", "Stakeholder Bridge"
- Kanban → "Flow Manager", "WIP Limiter", "Board Coordinator"
- Lean → "Experiment Designer", "Metrics Analyst", "Waste Eliminator"
- Enterprise → "Compliance Officer", "Documentation Lead", "Governance Specialist"

**Domain-Specific Roles:**
- Keep consistent: "iOS Specialist", "Frontend Developer", etc.
- Adjust for methodology context when needed

### Question Format:
```markdown
[Methodology choice] - got it. I'm thinking you'll need:

  • [Methodology-Specific Role] - [What they do]
  • [Domain Specialist 1] - [What they do]
  • [Domain Specialist 2] - [What they do]
  • [Domain Specialist 3] - [What they do]

Sound good, or want to adjust?

Examples: "perfect" or "add a security specialist" or "remove the AI one"
```

### Design Requirements:
- **First droid reflects methodology** (Test-First Lead, Sprint Coordinator, etc.)
- **3-5 specialists recommended** (not too few, not overwhelming)
- **Role names are memorable** (not generic "Engineer-1")
- **Accept modifications**: adding, removing, renaming
- **Handle creative themes**: Sesame Street, Star Wars, etc.

---

## Gate 5: Team Creation

### What Happens:
- Generate droid definition files
- Create manifest
- Install commands
- Generate user guide

### Output Format:
```markdown
✅ Team created!

Your specialists:
  /df-test-first-lead - Writes tests before implementation
  /df-ios-specialist - Swift/SwiftUI development
  /df-physics-engineer - Trajectory calculations
  /df-ai-developer - Bot opponent logic

Try: "/df-test-first-lead help me set up the test suite"
Or: "/forge-task [describe what you need]" for smart routing
```

### Design Requirements:
- **Show command names** (users need to know how to invoke)
- **Brief purpose** (one-line description)
- **Give example usage** (show them how to start)
- **Mention smart routing** (/forge-task as fallback)
- **Conversational confirmation** (not "OPERATION COMPLETE")

---

## Error Handling Philosophy

### Principle: No User-Facing Errors About Internal Architecture

**❌ BAD:**
```
Error: record_project_goal requires a sessionId from smart_scan
Error: Unsupported methodology choice: undefined
Error: No active onboarding session for abc-123-def
```

**✅ GOOD:**
```
Hmm, something went wrong. Let's start over with /forge-start
I didn't catch that. Pick 1-10, or type the name like "tdd"
I don't see an onboarding in progress. Try /forge-start to begin
```

### Error Recovery:
- **Always actionable** - Tell user what to do next
- **Never expose internals** - No sessionIds, tool names, stack traces
- **Friendly tone** - "Hmm" not "ERROR"
- **Offer reset** - Suggest /forge-start as clean slate

---

## Conversational Tone Guidelines

### DO:
✅ "Nice! That needs physics calculations..."  
✅ "TDD - got it. I'm thinking you'll need..."  
✅ "Sound good, or want to adjust?"  
✅ "Try: '/df-test-first-lead help me...'"

### DON'T:
❌ "Repository Analysis Complete!"  
❌ "Methodology successfully recorded"  
❌ "Executing tool: RECOMMEND_DROIDS"  
❌ "Operation completed with status: SUCCESS"

### Tone Rules:
- **Conversational**: Like a friend, not a system
- **Concise**: No unnecessary words
- **No emojis**: Clean text only (per AGENTS.md)
- **Helpful**: Show examples, guide next steps
- **Humble**: "I'm thinking..." not "You need..."

---

## Implementation Checklist

### Before Building:
- [ ] Map out all expected user responses for each gate
- [ ] Write example conversations (happy path + edge cases)
- [ ] Design error messages that don't expose internals
- [ ] Test methodology-to-droid-name mapping
- [ ] Handle creative/weird requests gracefully

### Core Changes Needed:
- [ ] Rewrite all prompt templates with conversational language
- [ ] Add methodology-specific droid injection in buildSuggestions()
- [ ] Update droid naming to reflect methodology choice
- [ ] Add input normalization for flexible responses
- [ ] Remove all user-facing sessionId references
- [ ] Add response examples to every question

### Testing Priorities:
- [ ] Full flow: /forge-start → team created (happy path)
- [ ] Flexible input: "tdd" vs "2" vs "the testing one"
- [ ] Creative requests: Sesame Street theme, weird methodologies
- [ ] Error recovery: bad input → friendly message → continue
- [ ] Methodology visibility: chosen method appears in team names

---

## Success Criteria

### A successful onboarding means:
1. **User never sees technical internals** (sessionId, tool names, errors)
2. **Conversation feels natural** (not form-filling)
3. **Methodology choice is visible** (in droid names/roles)
4. **Flexible input accepted** (numbers, names, delegation)
5. **Complete end-to-end** (scan → goal → method → team → done)
6. **Works with weird requests** (Sesame Street, "idk", "you pick")

### User should say:
- "That was easy"
- "It understood what I wanted"
- "I can see my TDD choice in the team"

### User should NOT say:
- "What's a sessionId?"
- "It broke when I typed 'tdd'"
- "Where did my methodology choice go?"
- "This feels like filling out a form"

---

## Future Enhancements (Post 1.0)

### /droid-update (Evolutionary Changes)
For when project evolves (e.g., adding Windows support months later):
```
User: "I need to add Windows support"
System: [scans repo, sees Linux game]
        "Got it - adding Windows to your Linux game.
         I'll add:
           • Cross-Platform Architect (abstracts platform differences)
           • Windows Specialist (Win32, DirectX integration)
         
         Keep your existing team?"
```

### Themes/Personalities
Allow persistent theming:
```
User: "Make my team Star Wars themed"
System: Creates "Jedi Test Master", "Sith Backend Engineer", etc.
```

### Team Templates
Community-shared roster configurations:
```
User: "Use the indie game starter template"
System: Loads pre-configured team for indie game dev
```

---

## Design Review Questions

Before implementing any change, ask:

1. **Would a non-technical user understand this?**
2. **Does this feel like talking to a friend?**
3. **Can I handle 5 different ways someone might respond?**
4. **Is the methodology choice visible in the output?**
5. **If this breaks, will the error message help them?**

If the answer is "no" to any of these - redesign.

---

**Remember:** We're not building a wizard. We're building a conversation with a helpful friend who happens to be really good at setting up development teams.
