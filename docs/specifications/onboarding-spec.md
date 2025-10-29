# AI Interview Specification for /forge-start Command

## Overview
Replace current onboarding with an intelligent AI interview that gathers comprehensive user information through friendly, efficient questions. The AI must be smart enough to extract multiple pieces of information from single responses and avoid redundant questions.

## Required Information Collection

The AI must secure all 10 items before proceeding to methodology selection:

1. **Project description/vision**
2. **Target audience** 
3. **Timeline constraints**
4. **Quality vs speed preferences**
5. **Team size/solo work**
6. **Technical experience level**
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

#### Phase 2: Requirements Checklist (10/10 Data)
- Maintain a dynamic checklist of the required fields. Skip any item already inferred from earlier answers; otherwise ask a focused question with exactly two context-rich examples.
- Always confirm inferences (“Sounds like solo dev—log it that way?”).
- Record each response via `record_onboarding_data` as soon as it’s provided.
- After all ten items are captured, present a confidence summary showing every data point and ask for corrections.

Required items remain:
1. Project description/vision (vision prompt)
2. Target audience
3. Timeline constraints
4. Quality vs speed preferences
5. Team size / solo
6. Technical experience level
7. Budget constraints
8. Deployment requirements
9. Security requirements
10. Scalability needs

#### Phase 3: Methodology Discovery (Top 5 Focus)
1. **Contextual Recommendations**
   - Analyze the 10 captured items and recommend three methodologies with explicit “because you said…” reasoning.
2. **Present Common Options**
   - Show the top 5 approaches (numbered) as the default catalog, while noting that other styles are available on request.
3. **Flexible Selection**
   - Accept numbers, names, or “you decide.” If delegated, choose intelligently and explain the rationale.
4. **Transition Reminder**
   - Before forging, remind the user they’ll need to restart the droid CLI to see the new commands once the team is created.

#### Phase 4: Droid Team Forging
- The final gate happens here: confirm all 10 items are recorded. If any are missing, return to Phase 2.
- Forge the roster, reiterate the restart instruction, and provide numbered next steps for immediate action (e.g., “1. /df to talk to the orchestrator, 2. /forge-task …”).
- Offer one or two optional follow-up assists (numbered) to keep momentum (“1. Scaffold tests, 2. Generate asset checklist”).

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
- Validate all 10 items are collected before methodology selection
- Allow users to correct or clarify AI inferences
- Store both explicit answers and AI inferences for droid team generation
