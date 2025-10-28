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

### Question Flow

#### Phase 1: Initial Open Question
**Goal**: Get maximum information with minimal questions

**Q1: Project Overview**
"Tell me about your project. What are you building, who's it for, and what's your situation?"

**Examples to provide**:
- "E-commerce site for handmade pottery, targeting craft enthusiasts, solo developer with 3-month timeline"
- "Internal tool for employee training tracking, 50-person company, team of 2 developers, needs HIPAA compliance"

#### Phase 2: Intelligent Follow-up
**Goal**: Fill in missing information only

The AI analyzes the initial response and asks targeted questions for missing items:

**If missing technical experience**:
"How would you describe your coding experience?"
- Example 1: "Beginner, learning as I build"
- Example 2: "Senior engineer, 8 years experience"

**If missing quality vs speed**:
"What's more important right now: getting it working fast or building it rock-solid?"
- Example 1: "Speed - need to validate the idea quickly"
- Example 2: "Quality - this will handle sensitive financial data"

**If missing deployment requirements**:
"Where do you want to deploy this? Any platform preferences?"
- Example 1: "Heroku or Vercel, want it simple"
- Example 2: "AWS, need full control and custom infrastructure"

**If missing security requirements**:
"Any security requirements or sensitive data I should know about?"
- Example 1: "Just basic user accounts, nothing sensitive"
- Example 2: "Payment processing and PII data, need SOC 2 compliance"

**If missing budget constraints**:
"Any budget constraints or resource limitations?"
- Example 1: "Bootstrap startup, minimal costs preferred"
- Example 2: "Enterprise project, cost not a major factor"

**If missing scalability needs**:
"How many users do you expect? Any special performance needs?"
- Example 1: "Maybe 100 users max, simple CRUD operations"
- Example 2: "Could scale to 10k+ users, real-time features needed"

#### Phase 3: Methodology Selection
**Goal**: Choose development approach based on all collected information

**Step 1: Show All 10 Methodologies**
```
Here are all development approaches (pick 1-10):

1. Agile/Scrum - Short sprints, adapt as you learn
2. Test-Driven Development - Write tests first, catch bugs early
3. Behavior-Driven Development - Clear specs everyone understands
4. Waterfall - Plan everything upfront, execute step-by-step
5. Kanban - Steady flow, visual progress tracking
6. Lean Startup - Build minimum, test with real users, iterate
7. Domain-Driven Design - Model complex business rules clearly
8. DevOps - Automated deployments, rock-solid infrastructure
9. Rapid Prototyping - Quick experiments to test ideas
10. Enterprise - Documentation, approvals, audit trails
```

**Step 2: AI Recommendations**
Based on ALL collected information, AI provides 2 specific recommendations:

```
"Based on your answers, I recommend:

1. [Methodology] - Because you mentioned [specific user context] and need [specific requirement]
2. [Methodology] - Since you're [user situation] and prioritize [user priority]

Which fits better, or would you prefer a different approach?"
```

### AI Behavior Guidelines

#### Conversational Style
- Friendly but professional
- Never use emojis
- Ask follow-up questions if answers are unclear
- Acknowledge their experience level in responses
- Use their terminology back to them

#### Intelligence Requirements
- Parse compound responses for multiple data points
- Infer logical connections (startup = budget conscious)
- Avoid asking redundant questions
- Recognize when all 10 items are collected
- Adapt question complexity to user's experience level

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