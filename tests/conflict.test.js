import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateClaims } from '../dist/orchestrator/fileClaims.js';
import { resolveConflicts, generateConflictReport, suggestScopeAdjustments } from '../dist/detectors/conflictResolver.js';

describe('Conflict Detection and Resolution', () => {
  it('should detect conflicts between droids with overlapping patterns', async () => {
    const claims = [
      {
        droidName: 'dev',
        patterns: ['src/**/*.ts', 'src/**/*.js']
      },
      {
        droidName: 'reviewer',
        patterns: ['src/**/*.ts', 'tests/**/*.test.js']
      }
    ];

    const result = await validateClaims(claims);

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.conflicts.length, 1);
    assert.strictEqual(result.conflicts[0].droid1, 'dev');
    assert.strictEqual(result.conflicts[0].droid2, 'reviewer');
    assert(result.conflicts[0].pattern.includes('src'));
  });

  it('should resolve conflicts using appropriate strategies', async () => {
    const claims = [
      {
        droidName: 'dev',
        patterns: ['src/**/*.ts']
      },
      {
        droidName: 'reviewer',
        patterns: ['src/**/*.ts']
      }
    ];

    const validation = await validateClaims(claims);
    const resolution = await resolveConflicts(validation.conflicts);

    assert.strictEqual(resolution.conflicts.length, 1);
    assert.strictEqual(resolution.resolutions.length, 1);

    const resolutionItem = resolution.resolutions[0];
    assert(['merge', 'prioritize', 'split', 'manual'].includes(resolutionItem.strategy));
    assert.strictEqual(typeof resolutionItem.resolution, 'string');
    assert(resolutionItem.confidence > 0);
    assert(resolutionItem.confidence <= 1);
  });

  it('should generate readable conflict reports', async () => {
    const claims = [
      {
        droidName: 'dev',
        patterns: ['src/**/*.ts']
      },
      {
        droidName: 'reviewer',
        patterns: ['src/**/*.ts']
      }
    ];

    const validation = await validateClaims(claims);
    const resolution = await resolveConflicts(validation.conflicts);
    const report = generateConflictReport(resolution);

    assert(typeof report === 'string');
    assert(report.includes('conflict'));
    assert(report.includes('dev'));
    assert(report.includes('reviewer'));
  });

  it('should provide scope adjustment suggestions', async () => {
    const claims = [
      {
        droidName: 'dev',
        patterns: ['src/**/*.ts']
      },
      {
        droidName: 'reviewer',
        patterns: ['src/**/*.ts']
      }
    ];

    const validation = await validateClaims(claims);
    const resolution = await resolveConflicts(validation.conflicts);
    const suggestions = suggestScopeAdjustments(resolution);

    assert(Array.isArray(suggestions));
    assert(suggestions.length > 0);
    assert(typeof suggestions[0] === 'string');
  });

  it('should handle droids with non-overlapping patterns', async () => {
    const claims = [
      {
        droidName: 'frontend',
        patterns: ['src/**/*.tsx', 'src/**/*.css']
      },
      {
        droidName: 'backend',
        patterns: ['src/**/*.js', 'src/**/*.py']
      }
    ];

    const result = await validateClaims(claims);

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.conflicts.length, 0);
  });

  it('should handle complex multi-droid conflicts', async () => {
    const claims = [
      {
        droidName: 'dev',
        patterns: ['src/**/*']
      },
      {
        droidName: 'reviewer',
        patterns: ['src/**/*.ts']
      },
      {
        droidName: 'qa',
        patterns: ['src/**/*.ts', 'tests/**/*']
      }
    ];

    const result = await validateClaims(claims);

    assert.strictEqual(result.valid, false);
    assert(result.conflicts.length >= 2);

    const resolution = await resolveConflicts(result.conflicts);
    assert.strictEqual(resolution.resolutions.length, result.conflicts.length);
  });

  it('should handle script droids with specific patterns', async () => {
    const claims = [
      {
        droidName: 'script-build',
        patterns: ['scripts/build.sh', 'package.json']
      },
      {
        droidName: 'script-deploy',
        patterns: ['scripts/deploy.sh']
      }
    ];

    const result = await validateClaims(claims);

    // Script droids should not conflict if they have different patterns
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.conflicts.length, 0);
  });
});