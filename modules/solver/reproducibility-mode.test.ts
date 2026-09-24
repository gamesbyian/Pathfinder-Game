import assert from 'node:assert/strict';
import { test } from 'vitest';
import { classifyReproducibilityMode, EXECUTION_BACKENDS, REPRODUCIBILITY_MODES } from './reproducibility-mode.mjs';

test('classifyReproducibilityMode: external backend is externally-determined regardless of schedulerMode', () => {
    assert.equal(classifyReproducibilityMode({ backend: 'external' }), 'externally-determined');
    assert.equal(classifyReproducibilityMode({ backend: 'external', schedulerMode: 'production' }), 'externally-determined');
});

test('classifyReproducibilityMode: raced backend is first-success-race even though race.mjs always uses the production scheduler', () => {
    assert.equal(classifyReproducibilityMode({ backend: 'raced', schedulerMode: 'production' }), 'first-success-race');
    assert.equal(classifyReproducibilityMode({ backend: 'raced' }), 'first-success-race');
});

test('classifyReproducibilityMode: legacy-latency-portfolio-experiment scheduler is historical-wall-clock-sensitive', () => {
    assert.equal(classifyReproducibilityMode({ schedulerMode: 'legacy-latency-portfolio-experiment' }), 'historical-wall-clock-sensitive');
    // Even a (contradictory/unexpected) declared direct backend does not override the historical
    // wall-clock scheduler's own reproducibility contract.
    assert.equal(classifyReproducibilityMode({ schedulerMode: 'legacy-latency-portfolio-experiment', backend: 'direct' }), 'historical-wall-clock-sensitive');
});

test('classifyReproducibilityMode: direct and webWorker backends under production/static-portfolio are deterministic-work', () => {
    assert.equal(classifyReproducibilityMode({ schedulerMode: 'production', backend: 'direct' }), 'deterministic-work');
    assert.equal(classifyReproducibilityMode({ schedulerMode: 'production', backend: 'webWorker' }), 'deterministic-work');
    assert.equal(classifyReproducibilityMode({ schedulerMode: 'static-portfolio', backend: 'direct' }), 'deterministic-work');
});

test('classifyReproducibilityMode: absent backend is unknown, never assumed deterministic', () => {
    assert.equal(classifyReproducibilityMode({ schedulerMode: 'production' }), 'unknown');
    assert.equal(classifyReproducibilityMode({ schedulerMode: 'static-portfolio' }), 'unknown');
    assert.equal(classifyReproducibilityMode({}), 'unknown');
    assert.equal(classifyReproducibilityMode(), 'unknown');
});

test('classifyReproducibilityMode: unrecognized schedulerMode with no raced/external backend is unknown', () => {
    assert.equal(classifyReproducibilityMode({ schedulerMode: 'some-future-mode', backend: 'direct' }), 'unknown');
});

test('EXECUTION_BACKENDS and REPRODUCIBILITY_MODES are frozen and every classifier output is a member', () => {
    assert.ok(Object.isFrozen(EXECUTION_BACKENDS));
    assert.ok(Object.isFrozen(REPRODUCIBILITY_MODES));
    const inputs = [
        {}, { backend: 'external' }, { backend: 'raced' },
        { schedulerMode: 'legacy-latency-portfolio-experiment' },
        { schedulerMode: 'production', backend: 'direct' },
        { schedulerMode: 'production', backend: 'webWorker' },
        { schedulerMode: 'static-portfolio', backend: 'direct' },
    ];
    for (const input of inputs) {
        assert.ok(REPRODUCIBILITY_MODES.includes(classifyReproducibilityMode(input)));
    }
});
