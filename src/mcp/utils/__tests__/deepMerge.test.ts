import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { deepMerge } from '../deepMerge.js';

describe('deepMerge utility', () => {
  it('merges nested objects without mutating inputs', () => {
    const base: any = {
      requiredData: {
        vision: { value: 'v1', confidence: 0.8, source: 'user' },
        targetAudience: { value: 'builders', confidence: 0.7, source: 'ai' }
      },
      methodology: { choice: 'agile' }
    };
    const incoming: any = {
      requiredData: {
        vision: { value: 'v2', confidence: 0.95, source: 'user' }
      },
      methodology: { confirmed: true }
    };

    const merged = deepMerge(base, incoming);

    assert.notStrictEqual(merged, base, 'result should be a new object');
    assert.equal(base.requiredData.vision.value, 'v1');
    assert.equal(merged.requiredData.vision.value, 'v2');
    assert.equal(merged.requiredData.targetAudience.value, 'builders');
    assert.equal((merged.methodology as any).confirmed, true);
    assert.equal((merged.methodology as any).choice, 'agile');
  });

  it('replaces arrays instead of concatenating', () => {
    const merged = deepMerge(
      { aiRecommendations: ['a', 'b'] },
      { aiRecommendations: ['c'] }
    );

    assert.deepStrictEqual(merged.aiRecommendations, ['c']);
  });

  it('ignores undefined values so existing keys stay intact', () => {
    const base = { onboarding: { projectVision: 'build' } };
    const merged = deepMerge(base, { onboarding: { projectVision: undefined } } as any);

    assert.equal(merged.onboarding.projectVision, 'build');
  });
});
