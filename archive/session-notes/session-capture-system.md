# Session Capture and Evaluation System

## Problem Statement

Currently, evaluating DroidForge onboarding sessions requires manual copy-pasting of terminal output and explaining the context each time. This is inefficient and makes it difficult to track improvements over time.

## Solution: Automated Session Capture System

### Overview
Create a system that automatically captures and evaluates onboarding sessions without requiring manual intervention.

### Components

#### 1. Session Capture
- **Location**: `~/.factory/sessions/<session-id>.jsonl` (already exists)
- **Enhancement**: Add evaluation metadata and scoring
- **Format**: Structured JSON with conversation flow, AI responses, and user inputs

#### 2. Automated Evaluation
- **Vision Comprehension Score**: Did AI ask meaningful follow-up questions?
- **Gate Jumping Detection**: Did AI skip conversation steps?
- **User Understanding Score**: Did user feel heard and understood?
- **Conversation Quality**: Natural vs robotic responses

#### 3. Test Scenarios
- **Incomplete Inputs**: "I want to create a..." (stops mid-sentence)
- **Vague Projects**: "building something for startups"
- **Personal Context**: "weekend project with wife"
- **Technical Requirements**: "Three.js with amazing graphics"

#### 4. Evaluation Metrics

```javascript
{
  "sessionId": "uuid",
  "timestamp": "2025-10-30T22:55:00Z",
  "scenario": "weekend-project-with-wife",
  "metrics": {
    "visionComprehension": 0.9, // 0-1 scale
    "gateJumping": 0.1, // 0-1 scale (lower is better)
    "userUnderstanding": 0.8, // 0-1 scale
    "conversationQuality": 0.85 // 0-1 scale
  },
  "issues": [
    {
      "type": "assumption_made",
      "description": "AI assumed 'letter A' instead of asking clarification",
      "severity": "high"
    }
  ],
  "recommendations": [
    "Add vision deep-dive questions before proceeding to checklist"
  ]
}
```

#### 5. Integration with UAT

Enhanced `scripts/uat` command:
```bash
# Run with automatic evaluation
uat --auto-evaluate

# Run specific test scenarios
uat --scenario incomplete-vision
uat --scenario weekend-project

# Generate evaluation report
uat --report --format markdown
```

#### 6. Continuous Improvement

**Daily Evaluation Report**:
- Track average scores over time
- Identify regression patterns
- Compare before/after changes

**Alert System**:
- Failures trigger immediate notifications
- Regression detection (scores dropping > 10%)
- New issue patterns identified

## Implementation Plan

### Phase 1: Enhanced Session Capture
1. Extend existing session storage with evaluation metadata
2. Add conversation flow tracking
3. Implement automatic scenario detection

### Phase 2: Evaluation Engine
1. Create scoring algorithms for each metric
2. Implement issue detection patterns
3. Build recommendation system

### Phase 3: UAT Integration
1. Enhance UAT script with auto-evaluation
2. Add test scenario runner
3. Implement reporting dashboard

### Phase 4: Continuous Monitoring
1. Daily automated testing
2. Regression detection
3. Performance tracking dashboard

## Benefits

1. **Efficiency**: No more manual copy-paste and explanation
2. **Consistency**: Standardized evaluation criteria
3. **Trend Tracking**: See improvements over time
4. **Regression Detection**: Catch issues before they reach users
5. **Objective Metrics**: Data-driven decisions about improvements

## Usage Examples

### Quick Test
```bash
# Test current changes
npm run test:vision-comprehension

# Run full UAT with evaluation
scripts/uat --auto-evaluate --scenario weekend-project
```

### Detailed Analysis
```bash
# Generate comprehensive report
scripts/uat --report --detailed --format markdown > evaluation-report.md

# Compare before/after
scripts/uat --compare before-commit-hash after-commit-hash
```

## Success Criteria

1. ✅ Automated session capture without manual intervention
2. ✅ Objective scoring of vision comprehension
3. ✅ Detection of gate-jumping behavior
4. ✅ Trend tracking over time
5. ✅ Integration with existing UAT system
6. ✅ Clear, actionable recommendations

## Next Steps

1. Implement enhanced session capture format
2. Build evaluation engine with scoring algorithms
3. Integrate with UAT automation
4. Create reporting dashboard
5. Set up continuous monitoring

This system will transform how we evaluate and improve DroidForge onboarding, making it data-driven and efficient.