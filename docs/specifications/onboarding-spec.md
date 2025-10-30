# AI Interview Specification for /forge-start Command

## Overview
Replace current onboarding with an intelligent AI interview that gathers comprehensive user information through friendly, efficient questions. The AI must be smart enough to extract multiple pieces of information from single responses and avoid redundant questions.

## Required Information Collection

Collect these **ten** data points before forging the roster. Methodology itself is data point #7, so the flow is: capture the six core discovery items, recommend/decide the methodology, then gather the remaining delivery requirements.

1. **Project vision** — what they want to build.
2. **Target audience** — who will use it.
3. **Timeline constraints** — deadlines or launch windows.
4. **Quality vs speed preference** — where they sit on the speed/rigor spectrum.
5. **Team size** — solo vs team, relevant roles.
6. **Experience level** — how comfortable they are with the tech stack.
7. **Chosen methodology** — the approach the assistant recommends and the user selects.
8. **Budget constraints** — resourcing or spend limits.
9. **Deployment & scale requirements** — hosting preferences plus expected load/performance needs.
10. **Security & compliance requirements** — sensitive data, regulatory guardrails, auditing expectations.

### Stage 1 – Core Discovery (items 1–6)
Capture items 1 through 6 before offering any methodology guidance. These answers let the assistant analyze trade-offs intelligently.

### Stage 2 – Methodology Recommendation (item 7)
Use the core discovery context to present the Top 6, recommend one methodology with project-specific reasoning, and record the user’s choice as item 7.

### Stage 3 – Delivery Readiness (items 8–10)
After methodology is locked in, gather the remaining delivery requirements (budget, deployment & scale, security/compliance) so the roster reflects the full context.

## Methodology UX (UX-first)

- Show a dynamic Top 6 methodologies tailored to user's project.
- Recommend exactly 1 primary methodology with project-specific reasoning.
- Offer "Show more" to reveal full catalog of 10 as reference.
- If user names a different/unknown methodology:
  - Do not reject. Provide a brief research summary and proceed with it.
- Accept numbers 1–6, names, or custom text gracefully.
- Make the user feel heard and understood throughout.
- Distinguish clearly: ten project properties vs ten methodology catalog entries.

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
   - Present 2–3 intelligent guesses derived from SMART_SCAN (frameworks, folders, docs) as "Maybe…" questions to let the user confirm or correct quickly.
2. **Vision Prompt**
   - Ask: "Tell me about your project. What are you building, who's it for, and what's your situation?"
   - Rotate two concise example answers to keep the prompt fresh.
3. **Follow-up Mini Brainstorm (2 questions)**
   - Ask two tailored clarifiers based on the user's vision (e.g., difficulty levels, target platforms). Never repeat the original question; keep it conversational.
4. **Vision Mirror**
   - Summarize the captured vision in 2–3 bullet points and ask, "Did I miss anything big?" before moving on.

#### Phase 2: Core Context Discovery (6/10 Gate)
- Maintain a dynamic checklist for the core discovery items (vision, audience, timeline, quality vs speed, team size, experience). Skip any item already inferred from earlier answers; otherwise ask a focused question with exactly two context-rich examples.
- Always confirm inferences ("Sounds like solo dev—log it that way?").
- Record each response via `record_onboarding_data` as soon as it's provided.
- Once all six core items are captured, mirror the understanding back and transition to methodology recommendations. If any are still missing, continue the conversation until the core gate is satisfied.

#### Phase 3: Methodology Discovery (Top 6 + 1 Recommendation)
1. **Contextual Recommendations**
   - Analyze the six core items you have plus any post-method signals gathered so far. Recommend three methodologies with explicit "because you said…" reasoning.
2. **Present Common Options**
   - Show the top 6 approaches (numbered) as the default catalog, while noting that other styles are available on request.
3. **Flexible Selection**
   - Accept numbers, names, or "you decide." If delegated, choose intelligently and explain the rationale.
4. **Transition Reminder**
   - Before forging, remind the user they'll need to restart the droid CLI to see the new commands once the team is created.

#### Phase 4: Delivery Requirements Wrap-up (10/10 Data)
- Resume the checklist for the remaining four items (budget, deployment, security, scalability). Leverage the chosen methodology to frame these questions (e.g., "Given we picked DevOps, what does deployment look like for you?").
- Confirm or update any earlier assumptions that might have shifted after methodology selection.
- After all ten items are captured, present a confidence summary showing every data point and ask for corrections.

#### Phase 5: Droid Team Forging
- Confirm all ten data points are captured (methodology is the seventh). If anything is missing, return to the phase that collects it.
- Personalize every specialist introduction:
  - Reuse the user's own wording (e.g., "remote fintech advisors", "HIPAA audits", "retro pinball feel").
  - Tie the chosen methodology directly into the role remit.
  - Introduce each droid in two sentences max, first-person, and remind the user of the command to invoke them.
- Finish with a "We heard you" recap connecting roster coverage back to the ten data points ("Because you're solo and quality-first...").
**Agile / Scrum** — Short sprints; adapt as you learn.
2. **Test-Driven Development (TDD)** — Tests first to prevent regressions.
3. **Behavior-Driven Development (BDD)** — Shared behavior stories keep everyone aligned.
4. **Rapid Prototyping** — Explore ideas quickly with low-risk experiments.
5. **DevOps / Platform** — Automation and reliability for frequent releases.
6. **Kanban / Continuous Flow** — Visual workflow; limit bottlenecks.

> Other methodologies (Lean, Waterfall, Enterprise, DDD) remain available on request. The assistant should mention this when presenting the top 6.

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
- Adapt question complexity to user's technical level
- Before forging the roster, remind the user to restart the droid CLI to load the new commands in their shell
- Never use pattern matching or rigid rules on description content

#### Example Intelligent Responses

**For beginners**: "That's a great project idea! Since you're learning, I'll recommend approaches that help you grow your skills."

**For experienced users**: "Solid architecture thinking. Given your background, I'll focus on methodologies that maximize your team's velocity."

**When unclear**: "That sounds interesting! Can you help me understand [specific missing aspect]?"

**When inferring**: "Based on what you've told me, it sounds like [inference]. Is that correct?"

## Data Storage

Store all responses in session object:

