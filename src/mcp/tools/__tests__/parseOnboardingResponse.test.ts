import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseOnboardingResponse,
  configureParseOnboardingDeps,
  resetParseOnboardingDeps
} from '../parseOnboardingResponse.js';

const baseSession: any = {
  sessionId: 's',
  repoRoot: '/tmp',
  createdAt: new Date().toISOString(),
  state: 'collecting-goal',
  onboarding: {
    projectVision: 'Existing vision',
    requiredData: {
      projectVision: { value: 'Existing vision', confidence: 0.6, source: 'user' }
    },
    collectionMetadata: {},
    methodology: {},
    team: {}
  }
};

const createSession = () => JSON.parse(JSON.stringify(baseSession));

describe('parseOnboardingResponse scaffold', () => {
  afterEach(() => {
    resetParseOnboardingDeps();
  });

  it('exports an async function', async () => {
    assert.equal(typeof parseOnboardingResponse, 'function');

    configureParseOnboardingDeps({
      aiClient: {
        async completePrompt() {
          return JSON.stringify({});
        }
      }
    });

    const session = createSession();
    const result = await parseOnboardingResponse('hello world', session);
    assert.strictEqual(result, session);
  });

  it('constructs prompts and invokes the AI client with JSON expectation', async () => {
    const calls: any[] = [];
    let mergedPayload: any;

    configureParseOnboardingDeps({
      aiClient: {
        async completePrompt(request) {
          calls.push(request);
          return JSON.stringify({
            projectVision: { value: 'Reimagined vision', confidence: 0.92, source: 'user' }
          });
        }
      },
      mergeSession: (session, extracted) => {
        mergedPayload = extracted;
        return session;
      }
    });

    await parseOnboardingResponse('Need a SaaS to help clinics track visits', createSession());

    assert.equal(calls.length, 1, 'AI client should be invoked once');
    const [{ systemPrompt, userPrompt }] = calls;
    assert.match(systemPrompt, /JSON ONLY/i);
    assert.match(systemPrompt, /projectVision/);
    assert.match(systemPrompt, /targetAudience/);
    assert.match(userPrompt, /Need a SaaS/);
    assert.match(userPrompt, /Known session data/);

    assert.ok(mergedPayload, 'merge function should receive parsed AI data');
    assert.equal(mergedPayload.projectVision.value, 'Reimagined vision');
    assert.equal(mergedPayload.projectVision.confidence, 0.92);
  });

  it('updates empty fields even with moderate confidence', async () => {
    configureParseOnboardingDeps({
      aiClient: {
        async completePrompt() {
          return JSON.stringify({
            targetAudience: { value: 'Clinics', confidence: 0.55, source: 'user' }
          });
        }
      }
    });

    const updated = await parseOnboardingResponse('target audience hint', createSession());
    assert.equal(updated.onboarding.targetAudience, 'Clinics');
    assert.equal(updated.onboarding.requiredData.targetAudience.value, 'Clinics');
  });

  it('ignores low-confidence updates when data already exists', async () => {
    configureParseOnboardingDeps({
      aiClient: {
        async completePrompt() {
          return JSON.stringify({
            projectVision: { value: 'Flaky vision', confidence: 0.4, source: 'user' }
          });
        }
      }
    });

    const updated = await parseOnboardingResponse('new info', createSession());
    assert.equal(updated.onboarding.projectVision, 'Existing vision');
    assert.equal(updated.onboarding.requiredData.projectVision.value, 'Existing vision');
  });

  it('applies high-confidence updates even when data exists', async () => {
    configureParseOnboardingDeps({
      aiClient: {
        async completePrompt() {
          return JSON.stringify({
            projectVision: { value: 'Bold new plan', confidence: 0.91, source: 'analysis' }
          });
        }
      }
    });

    const updated = await parseOnboardingResponse('new info', createSession());
    assert.equal(updated.onboarding.projectVision, 'Bold new plan');
    assert.equal(updated.onboarding.requiredData.projectVision.value, 'Bold new plan');
    assert.equal(updated.onboarding.requiredData.projectVision.source, 'analysis');
  });

  it('logs the AI extraction payload for observability', async () => {
    const events: any[] = [];
    configureParseOnboardingDeps({
      aiClient: {
        async completePrompt() {
          return JSON.stringify({
            projectVision: { value: 'Clinic assistant', confidence: 0.88, source: 'user' }
          });
        }
      },
      logger: event => events.push(event)
    });

    const updated = await parseOnboardingResponse('help clinics', createSession());

    assert.equal(events.length, 1, 'expected a single log event');
    const evt = events[0];
    assert.equal(evt.event, 'parse_onboarding_response');
    assert.equal(evt.sessionId, updated.sessionId);
    assert.equal(evt.userInput, 'help clinics');
    assert.ok(String(evt.rawAIResponse).includes('Clinic assistant'));
    assert.equal(evt.mergedSession.onboarding.projectVision, 'Clinic assistant');
  });
});
