# Specification: Methodology Recommendations (No Pattern Matching)

## Goal

When a user describes their project during onboarding, the AI should intelligently recommend 3 methodologies that fit their specific situation. The AI must use natural language understanding, NOT rigid pattern matching.

---

## ❌ What NOT To Do (Pattern Matching - FORBIDDEN)

### BAD Example 1: Keyword-Based Rules
```typescript
// THIS IS FORBIDDEN - DO NOT DO THIS
if (description.includes('game')) {
  return ['tdd', 'rapid', 'agile'];
}
if (description.includes('startup')) {
  return ['lean', 'rapid', 'agile'];
}
```

**Why this is wrong:**
- Rigid if/else conditions
- Keyword matching
- No real understanding
- Cannot handle nuanced descriptions like "A game-like simulation for enterprise training"

### BAD Example 2: Pre-computed Mappings
```typescript
// THIS IS FORBIDDEN - DO NOT DO THIS
const PROJECT_TYPE_MAP = {
  'game': ['tdd', 'rapid', 'agile'],
  'saas': ['agile', 'lean', 'enterprise'],
  'landing-page': ['rapid', 'kanban', 'waterfall']
};
```

**Why this is wrong:**
- Fixed mappings
- Forces projects into predefined categories
- No intelligence or context awareness

---

## ✅ What TO Do (AI Intelligence - REQUIRED)

### The Right Approach: Conversational AI

The AI should:
1. Read the user's project description
2. Use natural language understanding to comprehend what they're building
3. Consider multiple factors (complexity, timeline, team size, quality needs, iteration speed)
4. Explain WHY each methodology fits their specific situation
5. Allow the user to discuss and refine

### How It Works

**Step 1: User describes project**
```
User: "iOS pinball game with realistic physics and retro graphics"
```

**Step 2: AI analyzes (internally)**
The AI considers:
- Physics simulation = needs testing rigor
- Graphics = needs visual iteration
- Mobile = needs stability
- Game = needs feel/feedback

**Step 3: AI recommends with reasoning**
```
AI: "Based on your project, I recommend:

1. Test-Driven Development (TDD)
   Why: Physics simulations need rigorous testing to ensure ball 
   behavior is consistent and predictable across devices.

2. Rapid Prototyping
   Why: Game feel is critical for pinball - you'll need to iterate 
   quickly on physics parameters and table design until it feels right.

3. Agile / Scrum
   Why: Flexible sprints let you adapt based on playtesting feedback 
   and balance gameplay mechanics iteratively.

Here are all 10 methodologies:

1. **Agile / Scrum** – Iterative sprints with frequent stakeholder feedback.
2. **Test-Driven Development (TDD)** – Write tests first to drive resilient code.
3. **Behavior-Driven Development (BDD)** – Collaboratively define behavior with executable specs.
4. **Waterfall** – Sequential phases with heavy upfront planning and documentation.
5. **Kanban** – Continuous flow, visualize work in progress, limit bottlenecks.
6. **Lean Startup** – Validate ideas quickly with minimal viable products and data loops.
7. **Domain-Driven Design (DDD)** – Model complex domains with ubiquitous language and bounded contexts.
8. **DevOps** – Combine development and operations for fast, reliable delivery pipelines.
9. **Rapid Prototyping** – Build quick experiments to explore usability and product-market fit.
10. **Enterprise Delivery** – Emphasize compliance, governance, and risk management for regulated orgs.

Which one fits your workflow?"
```

**Step 4: User can discuss**
```
User: "Actually I'm more concerned about getting it launched quickly 
      than perfect physics"

AI: "In that case, I'd shift my recommendations:

1. Rapid Prototyping (move to #1)
   Why: Get a playable version fast to validate the concept
   
2. Lean Startup (new)
   Why: Ship an MVP, gather user feedback, iterate based on data

3. Agile (keep)
   Why: Still valuable for iteration

Want to discuss further or ready to pick?"
```

---

## Implementation Architecture

### Wrong Architecture (What I Built - DON'T USE)

```
1. User enters description
2. Tool runs: recommendMethodology()
   - Reads description
   - Matches keywords
   - Returns fixed recommendations
3. Tool output is stored but NEVER SHOWN to user
4. User picks from list without seeing recommendations
```

**Problems:**
- ❌ Pattern matching
- ❌ Recommendations invisible to user
- ❌ No conversation possible

### Right Architecture (What Should Be Built)

#### Option A: Non-Scripted Prompt (Recommended)

```
1. User enters description
2. AI reads description + instructions
3. AI uses its intelligence to analyze project
4. AI presents recommendations with reasoning
5. AI shows 10 methodologies
6. User can discuss or pick
7. AI calls SELECT_METHODOLOGY tool
```

**Implementation:**
- Make onboarding prompt partially non-scripted
- AI has freedom to analyze and recommend
- Commands template guides AI on what to consider
- No predetermined rules

#### Option B: AI-Generated Recommendations Tool

```typescript
// Tool doesn't contain logic - it queries an AI
async function recommendMethodology(projectDescription: string) {
  const aiPrompt = `
    Analyze this project: "${projectDescription}"
    
    Recommend 3 methodologies from:
    [list of 10 with descriptions]
    
    For each, explain WHY it fits this specific project.
    Consider: complexity, timeline, quality needs, iteration speed.
  `;
  
  const recommendations = await callAI(aiPrompt);
  return recommendations;
}
```

**Benefits:**
- Uses AI intelligence, not rules
- Adapts to any project type
- Can handle nuanced descriptions

---

## Commands Template Guidance

Update `commands.ts` to guide the AI:

```markdown
After user describes their project:

1. Analyze their description using your intelligence:
   - What are they building?
   - What are the key challenges?
   - What matters most: speed, quality, iteration, compliance?
   - What's the team/timeline context?

2. Recommend 3 methodologies that genuinely fit:
   - Explain WHY each one addresses their specific needs
   - Be specific to THEIR project, not generic
   - Consider trade-offs

3. Show all 10 methodologies for reference

4. Let them discuss or pick

Do NOT use keyword matching. Use your intelligence.
```

---

## Examples: Correct AI Behavior

### Example 1: Nuanced Project

**User:** "A game-like training simulator for enterprise compliance training"

**AI Should Analyze:**
- Game-like = needs iteration on engagement
- Training = needs accuracy and tracking
- Enterprise = needs documentation and governance
- Compliance = cannot compromise on correctness

**AI Should Recommend:**
```
1. Behavior-Driven Development (BDD)
   Why: Compliance requirements need clear, testable specifications 
   that stakeholders can review and verify.

2. Test-Driven Development (TDD)
   Why: Training content must be accurate - tests ensure correctness 
   and prevent regression in learning outcomes.

3. Enterprise / Governance
   Why: Corporate environment likely requires documentation, approvals, 
   and audit trails.
```

**AI Should NOT:**
- Match "game" keyword → recommend game methodologies
- Ignore the enterprise/compliance context
- Give generic recommendations

### Example 2: Complex Hybrid Project

**User:** "Mobile app for doctors to diagnose patients, but we need to launch fast and iterate based on feedback, though accuracy is critical"

**AI Should Analyze:**
- Medical = needs extreme accuracy
- Mobile = needs stability
- Fast launch = needs speed
- Iterate on feedback = needs flexibility
- Conflicting priorities = needs discussion

**AI Should Recommend:**
```
1. Test-Driven Development (TDD)
   Why: Medical diagnosis cannot have bugs - write tests first to 
   ensure accuracy before any feature ships.

2. Lean Startup
   Why: Launch with core diagnostic features, gather doctor feedback, 
   validate assumptions before building everything.

3. Agile / Scrum
   Why: Short sprints let you balance speed and quality - each sprint 
   delivers tested, working diagnostic features.

Note: There's tension between "fast" and "medical accuracy." 
Want to discuss how to balance these?
```

---

## Acceptance Criteria

### ✅ Success Criteria

1. **AI uses intelligence, not rules**
   - No if/else on keywords
   - No predefined mappings
   - Adapts to any project description

2. **Recommendations are visible to user**
   - User sees WHY each methodology fits
   - User can discuss and refine
   - Not hidden in tool output

3. **Handles nuance**
   - "Game-like enterprise training" → enterprise methodologies
   - "Fast but needs quality" → AI discusses the trade-off
   - "Not sure yet" → AI asks clarifying questions

4. **Conversational**
   - User can say "Actually, speed matters more than quality"
   - AI adjusts recommendations
   - Not a rigid form

### ❌ Failure Criteria

1. **Pattern matching detected**
   - Any keyword matching code
   - Any project type mappings
   - Any if/else based on description content

2. **Recommendations not shown**
   - User doesn't see the reasoning
   - Can't discuss or refine
   - Just sees a list to pick from

3. **Rigid categorization**
   - Forces projects into buckets
   - Can't handle hybrid cases
   - No room for discussion

---

## Migration Path

### Current State (v1.6.10)

- ✅ Intelligent understanding in SELECT_METHODOLOGY
- ✅ Handles typos, variations, numbers
- ❌ No project-based recommendations
- ✅ But also no broken features

### Option 1: Do Nothing

Accept v1.6.10 as final. It works correctly, just doesn't have smart recommendations.

### Option 2: AI-Powered Recommendations

Implement using one of the right architectures above. Requires:
- Calling an AI model for recommendations (cost implications)
- OR making onboarding partially non-scripted
- Testing that user actually sees the recommendations

### Option 3: Human-Curated Recommendations

Have the human AI operator (not predetermined code) make recommendations based on project description. This is what happens naturally if you DON'T implement automatic recommendations.

---

## Testing Checklist

Before considering this "done":

- [ ] User describes project
- [ ] User SEES recommendations with reasons
- [ ] Recommendations are specific to their project
- [ ] User can discuss/refine
- [ ] No keyword matching in code
- [ ] No project type mappings in code
- [ ] Works for edge cases (hybrid projects, unclear descriptions)
- [ ] AI can ask clarifying questions if needed

---

## Final Note

**If you cannot implement this without pattern matching, DON'T implement it.**

It's better to have no recommendations than broken pattern-matched recommendations. The user can ask the AI "What methodology should I use?" and get intelligent recommendations through normal conversation.

The AI doesn't need predetermined rules to be helpful. That's the whole point of AI.
