# Onboarding Implementation Plan
**Status:** Design Complete - Ready for Implementation  
**Priority:** HIGH - This specification supersedes all conflicting implementation ideas  
**Created:** 2025-10-28  

---

## Executive Summary

This document outlines the complete implementation plan for the intelligent AI interview onboarding system specified in [`onboarding-spec.md`](onboarding-spec.md). The new system will replace the current scripted onboarding with an intelligent conversational AI that:

- Collects all 10 required data points efficiently (3-7 minutes)
- Uses intelligent parsing to extract multiple pieces of information from single responses
- Provides AI-powered methodology recommendations without pattern matching
- Reflects methodology choice in team composition
- Maintains conversational, friendly tone throughout

---

## Gap Analysis

### Current State vs Specification

| Aspect | Current Implementation | Specification Requirement | Gap |
|--------|----------------------|--------------------------|-----|
| Data Collection | Single project description | 10 required data points | **9 fields missing** |
| Question Strategy | Form-like sequential inputs | Intelligent parsing + follow-ups | **No intelligence** |
| Methodology Selection | Simple list display | AI recommendations with reasoning | **No recommendations** |
| Team Composition | Generic roles | Methodology-specific roles | **No methodology visibility** |
| Validation | None | All fields before proceeding | **No validation** |
| Tone | Mixed (some technical jargon) | Conversational, no internals | **Inconsistent** |

### Critical Issues Identified

1. **Missing Data Collection**: Only collects project description, missing 9 other required fields
2. **No Intelligent Parsing**: Cannot extract multiple data points from compound responses
3. **No Recommendations**: Shows methodology list without AI-powered suggestions
4. **Methodology Invisibility**: Team composition doesn't reflect methodology choice
5. **No Validation**: Proceeds without ensuring data completeness

---

## Alignment with docs/specifications/ux-spec.md

### ✅ Aligned Principles

- Both require conversational, friendly interaction
- Both mandate methodology visibility in team names
- Both prohibit exposing technical internals
- Both follow the 5-gate structure (scan → goal → methodology → specialists → team)

### ⚠️ Adjustments Required

- **onboarding-spec.md**: Add explicit 5-gate structure from UX_SPEC
- **onboarding-spec.md**: Incorporate flexible input handling examples from UX_SPEC
- **UX_SPEC.md**: Add 10 required data points from onboarding-spec
- **Implementation**: Ensure methodology-specific droid naming per UX_SPEC

---

## Data Storage Structure

### OnboardingSession Interface

```typescript
interface OnboardingSession {
  sessionId: string;
  repoRoot: string;
  timestamp: Date;
  
  // Required 10 data points (from onboarding-spec.md)
  requiredData: {
    projectVision: string;          // Explicit project description
    targetAudience: string;         // Who will use this
    timelineConstraints: string;    // Deadlines/schedule
    qualityVsSpeed: string;         // Priority preference
    teamSize: string;               // Solo/team composition
    experienceLevel: string;        // User's technical experience
    budgetConstraints: string;      // Cost considerations
    deploymentRequirements: string; // Platform/hosting needs
    securityRequirements: string;   // Compliance/security
    scalabilityNeeds: string;       // Expected scale
  };
  
  // Collection metadata
  collectionMetadata: {
    explicit: string[];             // Fields user explicitly stated
    inferred: string[];             // Fields AI inferred
    missing: string[];              // Fields still needed
    confidence: Record<string, 'high' | 'medium' | 'low'>;
    rawResponses: string[];         // Conversation history
  };
  
  // Methodology selection
  methodology: {
    chosen: string;                 // Selected methodology
    recommendations: Array<{        // AI recommendations
      methodology: string;
      reasoning: string;            // Project-specific reasoning
      rank: number;                 // 1-3
    }>;
    userInputRaw: string;           // What user actually typed
  };
  
  // Team composition
  team: {
    recommended: DroidSpec[];       // AI-recommended team
    customized: DroidSpec[];        // User modifications
    final: DroidSpec[];            // Final team to create
  };
}
```

---

## Enhanced Interview Flow

### Phase 1: Initial Context Gathering (1-2 minutes)

**Approach**: Single open-ended question to extract maximum information

```
AI: "Tell me about your project. What are you building, who's it for, and what's your situation?"

Examples to show user:
- "E-commerce site for handmade pottery, targeting craft enthusiasts, solo developer with 3-month timeline"
- "Internal tool for employee training tracking, 50-person company, team of 2 developers, needs HIPAA compliance"
```

**Intelligent Parsing Logic**:
```typescript
async function parseInitialResponse(response: string): Promise<Partial<RequiredData>> {
  const parsed = await aiExtract({
    prompt: `Extract all available information from this response: "${response}"
    
    Look for:
    1. Project description/type
    2. Target audience
    3. Timeline mentions
    4. Team size indicators
    5. Technical experience signals
    6. Budget/cost mentions
    7. Deployment platform preferences
    8. Security/compliance needs
    9. Scale expectations
    10. Quality vs speed priorities
    
    Return JSON with found fields and confidence levels.`,
    temperature: 0.3 // Low temperature for accuracy
  });
  
  return parsed;
}
```

**Example Extraction**:
```
User: "Building an e-commerce site for my startup, need it launched in 2 months for our Series A pitch"

Extracted:
✓ projectVision: "e-commerce site"
✓ timelineConstraints: "2 months"
✓ qualityVsSpeed: "speed" (inferred from deadline)
✓ budgetConstraints: "cost-conscious" (inferred from startup)
✓ targetAudience: "startup customers" (inferred)

Missing: teamSize, experienceLevel, deploymentRequirements, securityRequirements, scalabilityNeeds
```

### Phase 2: Intelligent Follow-ups (1-2 minutes)

**Approach**: Only ask about missing critical information

```typescript
function generateFollowUpQuestions(
  collected: Partial<RequiredData>,
  missing: string[]
): Question[] {
  const questions: Question[] = [];
  
  // Prioritize by importance for methodology recommendation
  const priority = [
    'experienceLevel',    // Affects recommendation complexity
    'qualityVsSpeed',     // Core methodology driver
    'securityRequirements', // Affects methodology choice
    'deploymentRequirements',
    'scalabilityNeeds',
    'budgetConstraints',
    'teamSize'
  ];
  
  for (const field of priority) {
    if (missing.includes(field)) {
      questions.push(getQuestionFor(field, collected));
    }
  }
  
  return questions;
}
```

**Question Templates** (conversational, with examples):

| Missing Field | Question | Examples |
|--------------|----------|----------|
| experienceLevel | "How would you describe your coding experience?" | "Beginner, learning as I build" / "Senior engineer, 8 years" |
| qualityVsSpeed | "What's more important: getting it working fast or building it rock-solid?" | "Speed - validate the idea" / "Quality - handles financial data" |
| deploymentRequirements | "Where do you want to deploy this? Any platform preferences?" | "Heroku, want it simple" / "AWS, need full control" |
| securityRequirements | "Any security requirements or sensitive data?" | "Just basic accounts" / "Payment processing, need SOC 2" |
| budgetConstraints | "Any budget constraints or resource limitations?" | "Bootstrap startup, minimal costs" / "Enterprise, cost not a factor" |
| scalabilityNeeds | "How many users do you expect? Performance needs?" | "Maybe 100 users, simple CRUD" / "Could scale to 10k+, real-time" |

### Phase 3: Methodology Selection (1 minute)

**Step 1: Validate Data Completeness**
```typescript
function validateReadyForMethodology(session: OnboardingSession): boolean {
  const { missing, confidence } = session.collectionMetadata;
  
  // All fields must be collected
  if (missing.length > 0) {
    return false;
  }
  
  // At most 2 fields can have low confidence
  const lowConfidence = Object.values(confidence).filter(c => c === 'low').length;
  if (lowConfidence > 2) {
    // Ask for confirmation of low-confidence fields
    return false;
  }
  
  return true;
}
```

**Step 2: Generate AI Recommendations** (NO PATTERN MATCHING)

```typescript
async function generateMethodologyRecommendations(
  context: OnboardingSession
): Promise<MethodologyRecommendation[]> {
  const recommendations = await aiAnalyze({
    prompt: `Based on this project context:
    
${JSON.stringify(context.requiredData, null, 2)}

Recommend exactly 3 methodologies from this list:
1. agile - Flexible sprints, adapt as you go
2. tdd - Write tests first, catches bugs early  
3. bdd - User story focused, stakeholder alignment
4. waterfall - Plan everything upfront, sequential
5. kanban - Visual workflow, continuous delivery
6. lean - Build-measure-learn, fast experiments
7. ddd - Business logic modeling, complex domains
8. devops - Infrastructure as code, automation
9. rapid - Build fast, iterate on feel
10. enterprise - Documentation, compliance, governance

For each recommendation:
- Provide specific reasoning tied to their project details
- Explain WHY this methodology fits their situation
- Reference specific user context (timeline, experience, requirements)

Return JSON array of 3 recommendations ranked by fit.`,
    temperature: 0.7, // Allow creativity while staying focused
    responseFormat: 'json'
  });
  
  return recommendations;
}
```

**Step 3: Present Recommendations**

```
AI: "Based on your answers, I recommend:

1. Lean Startup - Since you're validating a startup idea quickly and need fast feedback loops
2. Rapid Prototyping - Your 2-month timeline and need for speed make this a great fit
3. Agile - Good for adapting as you learn what customers actually want

Here are all 10 options: agile, tdd, bdd, waterfall, kanban, lean, ddd, devops, rapid, enterprise

What fits your workflow?

Examples: "2" or "lean" or "the fast one" or "you decide""
```

**Step 4: Handle Flexible Input**

```typescript
async function interpretMethodologyChoice(
  input: string,
  recommendations: MethodologyRecommendation[]
): Promise<string> {
  // Handle numeric input
  if (/^[1-9]|10$/.test(input.trim())) {
    return ALL_METHODOLOGIES[parseInt(input) - 1].value;
  }
  
  // Handle methodology name
  const direct = ALL_METHODOLOGIES.find(m => 
    m.value === input.toLowerCase() || 
    m.title.toLowerCase().includes(input.toLowerCase())
  );
  if (direct) return direct.value;
  
  // Handle delegation ("you decide", "you pick", "whatever you recommend")
  if (/you (decide|pick|choose|recommend)|whatever/i.test(input)) {
    return recommendations[0].methodology; // Top recommendation
  }
  
  // Handle intent-based ("the fast one", "the testing one")
  const intentBased = await aiInterpret({
    prompt: `User said: "${input}"
    
Available methodologies: ${ALL_METHODOLOGIES.map(m => m.value).join(', ')}

Which methodology are they referring to? If unclear, return "CLARIFY".`,
    temperature: 0.3
  });
  
  if (intentBased !== 'CLARIFY') {
    return intentBased;
  }
  
  // Ask for clarification
  throw new Error('CLARIFY_NEEDED');
}
```

### Phase 4: Team Composition (1 minute)

**Critical Requirement**: Methodology MUST be visible in team

```typescript
function generateTeamWithMethodology(
  session: OnboardingSession
): DroidSpec[] {
  const { methodology, requiredData } = session;
  const team: DroidSpec[] = [];
  
  // FIRST droid MUST reflect methodology
  const methodologyRole = getMethodologyRole(methodology.chosen);
  team.push(methodologyRole);
  
  // Add domain-specific specialists
  const domainRoles = getDomainRoles(requiredData.projectVision);
  team.push(...domainRoles);
  
  return team;
}

function getMethodologyRole(methodology: string): DroidSpec {
  const roles = {
    tdd: { name: 'Test-First Lead', focus: 'Writes tests before implementation' },
    agile: { name: 'Sprint Coordinator', focus: 'Manages iterations, backlog' },
    rapid: { name: 'Iteration Specialist', focus: 'Fast MVP cycles, quick pivots' },
    waterfall: { name: 'Requirements Architect', focus: 'Upfront planning, specs' },
    devops: { name: 'Pipeline Engineer', focus: 'CI/CD, infrastructure automation' },
    ddd: { name: 'Domain Architect', focus: 'Business logic modeling' },
    bdd: { name: 'Story Facilitator', focus: 'Stakeholder alignment, specs' },
    kanban: { name: 'Flow Manager', focus: 'Visual workflow, WIP limits' },
    lean: { name: 'Experiment Designer', focus: 'Build-measure-learn cycles' },
    enterprise: { name: 'Compliance Officer', focus: 'Documentation, governance' }
  };
  
  return roles[methodology];
}
```

**Example Team Compositions**:

```
iOS Game + TDD:
• Test-First Lead - Writes physics test suite before implementation
• iOS Specialist - Swift/SwiftUI, UIKit integration
• Physics Engineer - Trajectory calculations, collision detection
• AI Developer - Bot opponent logic and difficulty tuning

Same Game + Agile:
• Sprint Coordinator - Manages iterations, backlog prioritization
• iOS Specialist - Swift/SwiftUI, UIKit integration
• Physics Engineer - Trajectory calculations, collision detection
• AI Developer - Bot opponent logic and difficulty tuning

E-commerce + Lean:
• Experiment Designer - A/B testing, metrics-driven iterations
• Frontend Developer - React, shopping cart UX
• Backend Engineer - Payment processing, inventory
• Analytics Specialist - Conversion tracking, user behavior
```

### Phase 5: Team Creation & Finalization

**Validation Before Creation**:
```typescript
function validateBeforeCreation(session: OnboardingSession): void {
  // All 10 fields collected
  if (session.collectionMetadata.missing.length > 0) {
    throw new ValidationError('Incomplete data collection');
  }
  
  // Methodology chosen
  if (!session.methodology.chosen) {
    throw new ValidationError('No methodology selected');
  }
  
  // Team includes methodology role
  const hasMethodologyRole = session.team.final.some(droid =>
    droid.role.toLowerCase().includes(session.methodology.chosen) ||
    Object.keys(METHODOLOGY_ROLES[session.methodology.chosen] || {})
      .some(keyword => droid.role.includes(keyword))
  );
  
  if (!hasMethodologyRole) {
    throw new ValidationError('Team must include methodology-specific role');
  }
}
```

---

## Methodology Recommendation Logic

### Core Principle: NO PATTERN MATCHING

**❌ FORBIDDEN Approaches**:
```typescript
// DO NOT DO THIS
if (description.includes('game')) {
  return ['rapid', 'tdd', 'agile'];
}

// DO NOT DO THIS
const PROJECT_TYPES = {
  game: ['tdd', 'rapid', 'agile'],
  saas: ['agile', 'lean', 'enterprise']
};
```

**✅ REQUIRED Approach**: Use AI intelligence

```typescript
async function recommendMethodologies(
  context: OnboardingSession
): Promise<MethodologyRecommendation[]> {
  // Prepare comprehensive context
  const analysisContext = `
Project Context:
- Vision: ${context.requiredData.projectVision}
- Audience: ${context.requiredData.targetAudience}
- Timeline: ${context.requiredData.timelineConstraints}
- Quality vs Speed: ${context.requiredData.qualityVsSpeed}
- Team: ${context.requiredData.teamSize}
- Experience: ${context.requiredData.experienceLevel}
- Budget: ${context.requiredData.budgetConstraints}
- Deployment: ${context.requiredData.deploymentRequirements}
- Security: ${context.requiredData.securityRequirements}
- Scale: ${context.requiredData.scalabilityNeeds}

Available Methodologies:
${ALL_METHODOLOGIES.map(m => `${m.value}: ${m.description}`).join('\n')}
`;

  const recommendations = await aiAnalyze({
    prompt: `${analysisContext}

Analyze this project holistically and recommend exactly 3 methodologies that best fit.

For each recommendation:
1. Choose a methodology from the list above
2. Provide specific reasoning tied to their project details
3. Explain WHY this methodology addresses their specific situation

Important:
- Use your intelligence to understand nuance
- A "game-like training simulator" for enterprise is NOT a game (recommend enterprise methods)
- Consider ALL 10 data points, not just project description
- No rigid rules - think about actual fit

Return JSON:
[
  {
    "methodology": "lean",
    "reasoning": "Your 2-month timeline and startup context means you need fast validation cycles...",
    "rank": 1
  },
  ...
]`,
    temperature: 0.7,
    responseFormat: 'json'
  });
  
  return recommendations;
}
```

---

## Implementation Steps

### Phase 1: Infrastructure (Week 1)

**Files to Modify**:
- [`src/mcp/types.ts`](../src/mcp/types.ts) - Add OnboardingSession interface
- [`src/mcp/sessionStore.ts`](../src/mcp/sessionStore.ts) - Support new session structure

**New Files to Create**:
- `src/mcp/tools/parseOnboardingResponse.ts` - Intelligent parsing tool
- `src/mcp/tools/generateMethodologyRecommendations.ts` - Recommendation engine
- `src/mcp/tools/validateOnboardingData.ts` - Validation logic

**Tasks**:
1. Add OnboardingSession interface to types
2. Update session store to handle new structure
3. Create parsing tool with AI integration
4. Create recommendation tool (no pattern matching)
5. Create validation tool for checkpoints
6. Write unit tests for each new tool

### Phase 2: Prompt Redesign (Week 1-2)

**Files to Replace**:
- [`src/mcp/prompts/onboarding.ts`](../src/mcp/prompts/onboarding.ts) - Complete rewrite

**Approach**:
- Move from rigid script to conversational AI
- Use non-scripted sections for intelligent interaction
- Add validation checkpoints between phases
- Implement intelligent follow-up generation

**Key Changes**:
```typescript
// OLD: Rigid script with fixed questions
{
  kind: 'input',
  id: 'project-goal',
  label: 'Project Description'
}

// NEW: Conversational with intelligent parsing
{
  kind: 'conversation',
  phase: 'data-collection',
  aiGuidance: `Ask open-ended question to extract maximum information.
  Parse response for all 10 required fields. Only ask follow-ups for missing data.`,
  validation: (session) => session.collectionMetadata.missing.length === 0
}
```

### Phase 3: Tool Updates (Week 2)

**Files to Modify**:
- [`src/mcp/tools/recordProjectGoal.ts`](../src/mcp/tools/recordProjectGoal.ts)
  - Update to parse and extract multiple fields
  - Track explicit vs inferred data
  
- [`src/mcp/tools/selectMethodology.ts`](../src/mcp/tools/selectMethodology.ts)
  - Add recommendation generation
  - Display recommendations before selection
  - Handle flexible input
  
- [`src/mcp/tools/recommendDroids.ts`](../src/mcp/tools/recommendDroids.ts)
  - Inject methodology-specific role as first droid
  - Use collected data for better recommendations
  
- [`src/mcp/tools/forgeRoster.ts`](../src/mcp/tools/forgeRoster.ts)
  - Add validation before creation
  - Ensure methodology visibility

### Phase 4: Methodology Integration (Week 2)

**Files to Modify**:
- [`src/mcp/generation/methodologyRoles.ts`](../src/mcp/generation/methodologyRoles.ts)
  - Add comprehensive methodology-to-role mappings
  - Include creative theme support (Sesame Street, Star Wars)

**Role Mappings to Add**:
```typescript
export const METHODOLOGY_ROLES = {
  tdd: {
    primary: 'Test-First Lead',
    alternatives: ['Quality Guardian', 'Test Architect'],
    keywords: ['test', 'quality', 'tdd']
  },
  agile: {
    primary: 'Sprint Coordinator',
    alternatives: ['Scrum Master', 'Iteration Manager'],
    keywords: ['sprint', 'scrum', 'agile']
  },
  // ... all 10 methodologies
};
```

### Phase 5: Testing (Week 3)

**Test Files to Create/Update**:
- [`src/mcp/__tests__/e2e/onboarding.e2e.test.ts`](../src/mcp/__tests__/e2e/onboarding.e2e.test.ts)
  - Full onboarding flow tests
  - All 10 test cases from test plan
  
**Test Coverage Required**:
- ✅ Happy path: Experienced developer with clear vision
- ✅ Edge case: Beginner with minimal context
- ✅ Creative: Sesame Street theme request
- ✅ Vague: "Just testing" response
- ✅ Flexible: All methodology input variations
- ✅ Parsing: Compound response extraction
- ✅ Inference: Implied information logic
- ✅ Validation: Incomplete data handling
- ✅ Visibility: Methodology in team names
- ✅ Tone: No technical jargon exposed

### Phase 6: Documentation (Week 3)

**Files to Update**:
- [`docs/specifications/onboarding-spec.md`](onboarding-spec.md) - Add final implementation details
- User-facing documentation

---

## Success Metrics

### Quantitative Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Interview completion time | 3-7 minutes (avg 5) | Timer from start to team creation |
| Number of questions asked | 2-5 (avg 3) | Count of AI questions |
| Data collection completeness | 100% (all 10 fields) | Validation check |
| Methodology recommendations | Always 3 | Count of recommendations shown |
| Methodology visibility in team | 100% | Automated check |

### Qualitative Metrics

| Metric | Success Indicator |
|--------|-------------------|
| User experience | "That was easy" / positive feedback |
| Conversational tone | No exposure of sessionId, tool names, errors |
| Flexibility | Handles 5+ input variations per question |
| Intelligence | Extracts 3+ fields from single response |
| Error handling | Friendly messages, actionable guidance |

### Validation Checkpoints

```typescript
// Before methodology selection
function checkReadyForMethodology(session: OnboardingSession): boolean {
  return session.collectionMetadata.missing.length === 0 &&
         session.collectionMetadata.confidence.filter(c => c === 'low').length <= 2;
}

// Before team creation
function checkReadyForTeam(session: OnboardingSession): boolean {
  return session.methodology.chosen !== '' &&
         session.methodology.recommendations.length === 3;
}

// Before finalization
function checkReadyToFinalize(session: OnboardingSession): boolean {
  return session.team.final.some(droid => 
    reflectsMethodology(droid.role, session.methodology.chosen)
  );
}
```

---

## Test Cases

### 1. Happy Path: Experienced Developer

```typescript
describe('Experienced Developer Flow', () => {
  test('extracts multiple fields from rich response', async () => {
    const response = "Building an e-commerce site for handmade pottery, targeting craft enthusiasts, solo developer with 3-month timeline, need it on Vercel";
    
    const parsed = await parseOnboardingResponse(response);
    
    expect(parsed.explicit).toContain('projectVision');
    expect(parsed.explicit).toContain('targetAudience');
    expect(parsed.explicit).toContain('timelineConstraints');
    expect(parsed.inferred).toContain('experienceLevel');
    expect(parsed.requiredData.projectVision).toBe('e-commerce site for handmade pottery');
  });
  
  test('asks only about missing fields', async () => {
    const session = createSessionWithPartialData({
      projectVision: 'e-commerce site',
      targetAudience: 'craft enthusiasts',
      timelineConstraints: '3 months',
      deploymentRequirements: 'Vercel'
    });
    
    const questions = generateFollowUpQuestions(session);
    
    expect(questions).toHaveLength(4); // Only missing fields
    expect(questions.map(q => q.field)).not.toContain('projectVision');
  });
});
```

### 2. Edge Case: Beginner with Minimal Context

```typescript
describe('Beginner Flow', () => {
  test('handles vague initial response', async () => {
    const response = "an app for my son's soccer team";
    
    const parsed = await parseOnboardingResponse(response);
    
    expect(parsed.explicit).toContain('projectVision');
    expect(parsed.explicit).toContain('targetAudience');
    expect(parsed.inferred).toContain('teamSize'); // Infers solo
    expect(parsed.missing).toHaveLength(7); // Most fields missing
  });
  
  test('adjusts question complexity for beginners', async () => {
    const session = createSessionWithExperience('beginner');
    
    const questions = generateFollowUpQuestions(session);
    
    // Questions should be simpler, more guided
    expect(questions[0].text).not.toContain('technical jargon');
    expect(questions[0].examples).toHaveLength(2); // More examples
  });
});
```

### 3. Creative: Sesame Street Theme

```typescript
describe('Creative Theme Request', () => {
  test('handles Sesame Street characters request', async () => {
    const session = createSessionWithTheme('sesame-street');
    session.methodology.chosen = 'tdd';
    
    const team = generateTeamWithMethodology(session);
    
    expect(team.map(d => d.name)).toContain('Test-First Ernie');
    expect(team.map(d => d.name)).toContain('Builder Big Bird');
    expect(team.some(d => d.name.includes('Elmo'))).toBe(true);
  });
  
  test('methodology still visible in themed names', async () => {
    const methodologies = ['tdd', 'agile', 'rapid'];
    
    for (const method of methodologies) {
      const session = createSessionWithTheme('sesame-street');
      session.methodology.chosen = method;
      
      const team = generateTeamWithMethodology(session);
      const hasMethodologyRole = team.some(d => 
        d.name.toLowerCase().includes(method) ||
        d.focus.toLowerCase().includes(method)
      );
      
      expect(hasMethodologyRole).toBe(true);
    }
  });
});
```

### 4. Flexible Methodology Input

```typescript
describe('Methodology Selection Flexibility', () => {
  test('handles numeric input', async () => {
    expect(await interpretMethodologyChoice('2', recommendations)).toBe('tdd');
  });
  
  test('handles methodology name', async () => {
    expect(await interpretMethodologyChoice('tdd', recommendations)).toBe('tdd');
    expect(await interpretMethodologyChoice('Test-Driven', recommendations)).toBe('tdd');
  });
  
  test('handles delegation', async () => {
    expect(await interpretMethodologyChoice('you decide', recommendations))
      .toBe(recommendations[0].methodology);
  });
  
  test('handles intent-based', async () => {
    const result = await interpretMethodologyChoice('the fast one', recommendations);
    expect(['rapid', 'lean', 'agile']).toContain(result);
  });
});
```

### 5. Intelligent Parsing

```typescript
describe('Compound Response Parsing', () => {
  test('extracts multiple implied data points', async () => {
    const response = "Building a financial compliance tool for 50-person company, team of 2 developers, needs SOC 2, launching in Q2";
    
    const parsed = await parseOnboardingResponse(response);
    
    expect(parsed.requiredData.projectVision).toContain('financial compliance tool');
    expect(parsed.requiredData.targetAudience).toBe('50-person company');
    expect(parsed.requiredData.teamSize).toBe('team of 2 developers');
    expect(parsed.requiredData.securityRequirements).toContain('SOC 2');
    expect(parsed.requiredData.timelineConstraints).toContain('Q2');
    expect(parsed.inferred).toContain('qualityVsSpeed'); // Infers quality from compliance
  });
});
```

### 6. No Technical Jargon

```typescript
describe('User-Friendly Error Messages', () => {
  test('hides internal errors from users', () => {
    const errors = [
      new Error('sessionId not found'),
      new Error('record_project_goal failed'),
      new Error('undefined methodology')
    ];
    
    errors.forEach(error => {
      const userMessage = formatErrorForUser(error);
      
      expect(userMessage).not.toContain('sessionId');
      expect(userMessage).not.toContain('tool');
      expect(userMessage).not.toContain('undefined');
      expect(userMessage).toMatch(/let's start over|try again|didn't catch/i);
    });
  });
});
```

### 7. Methodology Visibility

```typescript
describe('Methodology Reflection in Team', () => {
  test('chosen methodology appears in team composition', async () => {
    const methodologies = ['tdd', 'agile', 'rapid', 'waterfall', 'devops'];
    
    for (const method of methodologies) {
      const session = createSession();
      session.methodology.chosen = method;
      
      const team = generateTeamWithMethodology(session);
      
      const hasMethodologyRole = team.some(droid => {
        const roleKeywords = METHODOLOGY_ROLES[method].keywords;
        return roleKeywords.some(keyword => 
          droid.role.toLowerCase().includes(keyword) ||
          droid.name.toLowerCase().includes(keyword)
        );
      });
      
      expect(hasMethodologyRole).toBe(true);
    }
  });
});
```

---

## Migration Strategy

### For Existing Users

1. **Backward Compatibility**: Support old onboarding format temporarily
2. **Gradual Migration**: New users get new flow, existing continue old
3. **Optional Upgrade**: Offer re-onboarding with new system

### For Existing Droids

- No changes to existing droid teams
- New teams follow new methodology-visibility rules
- Re-onboarding updates team to reflect methodology

---

## Risk Mitigation

### Technical Risks

| Risk | Mitigation |
|------|-----------|
| AI parsing errors | Fallback to direct questions if parsing fails |
| Recommendation quality | Use temperature 0.7, validate output format |
| Session state loss | Persist after each phase completion |
| Performance issues | Cache parsed data, async processing |

### User Experience Risks

| Risk | Mitigation |
|------|-----------|
| User confusion | Clear examples, friendly error messages |
| Too many questions | Intelligent parsing reduces question count |
| Rigid expectations | Accept flexible input, handle edge cases |
| Technical jargon slip | Comprehensive error message formatting |

---

## Definition of Done

### Phase 1-3 Complete When:
- [ ] All new tools created and tested
- [ ] OnboardingSession interface implemented
- [ ] Session store updated
- [ ] Onboarding prompt rewritten
- [ ] Unit tests passing (>80% coverage)

### Phase 4-5 Complete When:
- [ ] Methodology roles defined for all 10 methodologies
- [ ] Team generation reflects methodology
- [ ] All 10 E2E test cases passing
- [ ] No pattern matching in recommendation logic

### Phase 6 Complete When:
- [ ] Documentation updated
- [ ] Migration guide created
- [ ] User guide reflects new flow
- [ ] Code reviewed and approved

### Overall Success When:
- [ ] Interview completes in 3-7 minutes
- [ ] All 10 fields collected
- [ ] Methodology visible in team
- [ ] No technical jargon exposed
- [ ] User feedback positive

---

## Appendix: Code Examples

### Example: Intelligent Parsing Function

```typescript
async function parseOnboardingResponse(
  response: string,
  context: Partial<OnboardingSession>
): Promise<ParsingResult> {
  const systemPrompt = `You are parsing a user's response about their software project.
Extract all available information and categorize fields as explicit (directly stated) or inferred (logically implied).

Available fields:
1. projectVision: What they're building
2. targetAudience: Who will use it
3. timelineConstraints: Deadlines/schedule
4. qualityVsSpeed: Priority (quality/speed/balanced)
5. teamSize: Solo/team composition
6. experienceLevel: Technical experience (beginner/intermediate/expert)
7. budgetConstraints: Cost considerations
8. deploymentRequirements: Platform/hosting
9. securityRequirements: Compliance/security needs
10. scalabilityNeeds: Expected scale`;

  const result = await ai.complete({
    system: systemPrompt,
    prompt: `User response: "${response}"

Context from previous answers:
${JSON.stringify(context.requiredData || {}, null, 2)}

Extract ALL available information and return JSON:
{
  "extracted": {
    "fieldName": { "value": "...", "confidence": "high|medium|low", "explicit": true/false }
  },
  "missing": ["field1", "field2"]
}`,
    temperature: 0.3,
    responseFormat: 'json'
  });

  return formatParsingResult(result);
}
```

### Example: Methodology Recommendation

```typescript
async function generateRecommendations(
  session: OnboardingSession
): Promise<MethodologyRecommendation[]> {
  const context = buildContextString(session);
  
  const result = await ai.complete({
    system: `You recommend software development methodologies based on project context.
Use your intelligence to understand nuance - no rigid rules.`,
    
    prompt: `${context}

Recommend exactly 3 methodologies from: agile, tdd, bdd, waterfall, kanban, lean, ddd, devops, rapid, enterprise

For each:
1. Choose based on holistic understanding of ALL 10 data points
2. Provide specific reasoning tied to their project
3. Explain WHY this methodology addresses their situation

Return JSON array of 3 recommendations ranked by fit.`,
    
    temperature: 0.7,
    responseFormat: 'json'
  });

  return validateAndRankRecommendations(result);
}
```

---

## Conclusion

This implementation plan provides a complete blueprint for replacing the current onboarding with an intelligent AI interview system. The new system will:

1. **Collect all 10 required data points** efficiently through intelligent parsing
2. **Provide AI-powered methodology recommendations** without pattern matching
3. **Reflect methodology choice** in team composition
4. **Maintain conversational tone** throughout
5. **Validate data completeness** before proceeding
6. **Handle edge cases** gracefully

The plan supersedes all conflicting implementation ideas and aligns with both the onboarding specification and UX specification requirements.

**Next Steps**: Review and approve this plan, then proceed with Phase 1 implementation.
