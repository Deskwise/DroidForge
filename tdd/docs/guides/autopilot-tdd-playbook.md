# Autopilot TDD Playbook

Detailed guide for the RED → GREEN → COMMIT cycle.

## Overview

Autopilot enforces strict TDD:
1. **RED**: Write failing test first
2. **GREEN**: Write minimal code to pass
3. **COMMIT**: Save progress atomically

## RED Phase

### Goal
Create a test that fails because the feature doesn't exist yet.

### Steps
1. Read subtask requirements
2. Create test file in appropriate location (`src/**/__tests__/`)
3. Write test that exercises expected behavior
4. Run: `npm test`
5. Verify: test fails with clear error (not syntax error)

### Example
```typescript
// src/features/__tests__/calculator.test.ts
test('add() returns sum of two numbers', () => {
  const result = add(2, 3);
  expect(result).toBe(5);
});
```

### Complete Phase
```typescript
autopilot_complete_phase({
  testResults: { total: 1, passed: 0, failed: 1, skipped: 0 }
})
```

## GREEN Phase

### Goal
Make the test pass with minimal code. No gold-plating.

### Steps
1. Write simplest implementation that passes
2. Run: `npm test`
3. All tests must pass (not just the new one)
4. Refactor only if necessary for correctness

### Example
```typescript
// src/features/calculator.ts
export function add(a: number, b: number): number {
  return a + b;
}
```

### Complete Phase
```typescript
autopilot_complete_phase({
  testResults: { total: 1, passed: 1, failed: 0, skipped: 0 }
})
```

## COMMIT Phase

### Goal
Save progress with atomic, well-described commit.

### Steps
1. Stage all changes: `git add -A`
2. Call `autopilot_commit` (auto-generates message)
3. Verify commit succeeded

### Commit Message Format
```
feat(scope): brief description

- Detail 1
- Detail 2

Subtask: X.Y
```

## Anti-Patterns to Avoid

| Don't | Do Instead |
|-------|------------|
| Write code before test | Write failing test first |
| Write multiple features at once | One feature per cycle |
| Skip commit after green | Always commit when tests pass |
| Over-engineer in green phase | Minimal code to pass |
| Ignore failing tests | Fix or mark as known issue |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Test won't fail | Check imports, ensure feature doesn't exist |
| Test fails for wrong reason | Fix syntax/import errors first |
| Too many tests failing | Focus on one test at a time |
| Can't make test pass | Simplify the test or break into smaller pieces |

