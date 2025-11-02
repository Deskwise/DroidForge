# AI Interview Specification for /forge-start Command

## Overview
Replace current onboarding with an intelligent AI interview that gathers comprehensive user information through friendly, efficient questions. The AI must be smart enough to extract multiple pieces of information from single responses and avoid redundant questions.

## Required Information Collection

The AI must still capture all ten onboarding data points by the time the roster is forged, but methodology selection should happen as soon as the **core discovery set** is complete. Breaking the checklist into two gates keeps the interview conversational and avoids the chicken-and-egg loop where methodology depends on answers we have not gathered yet.

### Core Discovery (pre-methodology gate)
Collect these six items before offering recommendations. They drive methodology trade-offs and allow meaningful suggestions.

1. **Project description/vision**
2. **Target audience**
3. **Timeline constraints**
4. **Quality vs speed preferences**
5. **Team size/solo work**
6. **Technical experience level**

### Delivery Requirements (post-methodology refinement)
Collect these four items after methodology selection. They may change once the user reflects on the chosen approach, so confirm or update them before forging the team.

7. **Budget constraints**
8. **Deployment requirements**
9. **Security requirements**
10. **Scalability needs**

## Interview Strategy

### Intelligent Parsing
The AI must intelligently extract information from user responses. Examples:

**User says**: "I'm making a weight management app just for me and my wife"
**AI extracts**:
- Project description: weight management app ✓
- Target audience: me and my wife ✓  
- Team size: solo work (implied) ✓
- Scalability needs: minimal (2 users) ✓

**User says**: "Building an e-commerce site for my startup, need it launched in 2 months for our Series A pitch"
**AI extracts**:
- Project description: e-commerce site ✓
- Timeline constraints: 2 months ✓
- Quality vs speed: speed prioritized (pitch deadline) ✓
- Budget constraints: startup context (cost-conscious) ✓

### Conversation Flow (User-Centric)

#### Phase 1: Context Hook & Vision
1. **Scan Reflection + Guesses**
   - Present 2–3 intelligent guesses derived from SMART_SCAN (frameworks, folders, docs) as “Maybe…” questions to let the user confirm or correct quickly.
2. **Vision Prompt**
   - Ask: “Tell me about your project. What are you building, who’s it for, and what’s your situation?”
   - Rotate two concise example answers to keep the prompt fresh.
3. **Follow-up Mini Brainstorm (2 questions)**
   - Ask two tailored clarifiers based on the user’s vision (e.g., difficulty levels, target platforms). Never repeat the original question; keep it conversational.
4. **Vision Mirror**
   - Summarize the captured vision in 2–3 bullet points and ask, “Did I miss anything big?” before moving on.

#### Phase 2: Core Context Discovery (6/10 Gate)
- Maintain a dynamic checklist for the core discovery items (vision, audience, timeline, quality vs speed, team size, experience). Skip any item already inferred from earlier answers; otherwise ask a focused question with exactly two context-rich examples.
- Always confirm inferences (“Sounds like solo dev—log it that way?”).
- Record each response via `record_onboarding_data` as soon as it’s provided.
- Once all six core items are captured, mirror the understanding back and transition to methodology recommendations. If any are still missing, continue the conversation until the core gate is satisfied.

#### Phase 3: Methodology Discovery (Top 5 Focus)
1. **Contextual Recommendations**
   - Analyze the six core items you have plus any post-method signals gathered so far. Recommend three methodologies with explicit “because you said…” reasoning.
2. **Present Common Options**
   - Show the top 5 approaches (numbered) as the default catalog, while noting that other styles are available on request.
3. **Flexible Selection**
   - Accept numbers, names, or “you decide.” If delegated, choose intelligently and explain the rationale.
4. **Transition Reminder**
   - Before forging, remind the user they’ll need to restart the droid CLI to see the new commands once the team is created.

#### Phase 4: Delivery Requirements Wrap-up (10/10 Data)
- Resume the checklist for the remaining four items (budget, deployment, security, scalability). Leverage the chosen methodology to frame these questions (e.g., “Given we picked DevOps, what does deployment look like for you?”).
- Confirm or update any earlier assumptions that might have shifted after methodology selection.
- After all ten items are captured, present a confidence summary showing every data point and ask for corrections.

#### Phase 5: Droid Team Forging
- The final gate happens here: confirm all 10 items are recorded. If any are missing, loop back to the appropriate collection phase (core context or delivery wrap-up) before proceeding.
- Forge the roster, reiterate the restart instruction, and provide numbered next steps for immediate action (e.g., “1. /df to talk to the orchestrator, 2. /forge-task …”).
- Offer one or two optional follow-up assists (numbered) to keep momentum (“1. Scaffold tests, 2. Generate asset checklist”).
- When revealing the team, personalize every specialist introduction:
  - Echo the user’s own wording from the collected data (“remote fintech advisors”, “HIPAA audits”, “retro pinball feel”) so each role proves it understands the project.
  - Tie the chosen methodology directly into the remit (“I guard the red→green→refactor loop you picked for TDD”; “I own the blue/green deploys you said must stay zero downtime”).
  - Give each droid a short first-person handshake (two sentences max) that states how to summon them and what ritual they promise (“Ping me when you tweak dosage logic; I’ll scaffold regression suites around it.”).
  - Close with a “We heard you” recap linking roster coverage back to the ten data points (“Because you’re solo and quality-first, `/df-review` and `/df-testing` watch for regressions while `/df-docs` keeps the SOC 2 workbook current.”).

### Methodology Catalog (Top 5 Default)

1. **Agile / Scrum** — Short sprints; adapt as you learn.
2. **Test-Driven Development (TDD)** — Tests first to prevent regressions.
3. **Behavior-Driven Development (BDD)** — Shared behavior stories keep everyone aligned.
4. **Rapid Prototyping** — Explore ideas quickly with low-risk experiments.
5. **DevOps / Platform** — Automation and reliability for frequent releases.

> Other methodologies (Kanban, Lean, Waterfall, Enterprise, DDD, etc.) remain available on request. The assistant should mention this when presenting the top 5.

### AI Behavior Guidelines

#### Conversational Style
- Friendly but professional
- Never use emojis
- Ask follow-up questions if answers are unclear
- Acknowledge their experience level in responses
- Use their terminology back to them
- Do not use emojis or emoticons during onboarding conversations (keep tone warm with words only)

#### Intelligence Requirements
- Parse compound responses for multiple data points
- Infer logical connections (startup = budget conscious)
- Avoid asking redundant questions
- Recognize when all 10 items are collected
- Adapt question complexity to user's experience level
- Before forging the roster, remind the user to restart the droid CLI to load the new commands in their shell.

#### Example Intelligent Responses

**For beginners**: "That's a great project idea! Since you're learning, I'll recommend approaches that help you grow your skills."

**For experienced users**: "Solid architecture thinking. Given your background, I'll focus on methodologies that maximize your team's velocity."

**When unclear**: "That sounds interesting! Can you help me understand [specific missing aspect]?"

**When inferring**: "Based on what you've told me, it sounds like [inference]. Is that correct?"

## Data Storage

Store all responses in session object:
```typescript
{
  projectVision: string,
  targetAudience: string,
  timelineConstraints: string,
  qualityVsSpeed: string,
  teamSize: string,
  experienceLevel: string,
  budgetConstraints: string,
  deploymentRequirements: string,
  securityRequirements: string,
  scalabilityNeeds: string,
  methodologyChoice: string,
  aiRecommendations: string[],
  inferredData: Record<string, string> // Track what was inferred vs explicitly stated
}
```

## Success Criteria

1. **Efficiency**: Interview completes in 3-7 minutes (not 10+)
2. **Completeness**: All 10 required items captured
3. **Intelligence**: AI avoids redundant questions by parsing responses
4. **User Experience**: Users feel heard and understood, not interrogated
5. **Accuracy**: Methodology recommendations are informed by specific user context
6. **Adaptability**: Question complexity matches user's technical level

## Implementation Notes

- Replace current scripted onboarding flow
- AI has full conversational freedom during interview
- Verify the six core discovery items are captured before methodology selection, then ensure the remaining four are gathered before forging the roster
- Allow users to correct or clarify AI inferences
- Store both explicit answers and AI inferences for droid team generation
