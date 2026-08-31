import assert from 'node:assert/strict';
import { afterEach, test, vi } from 'vitest';

const tone = vi.hoisted(() => ({
    start: vi.fn(async () => {}),
    resume: vi.fn(async () => {}),
    trigger: vi.fn(),
    synthCount: 0,
}));

vi.mock('tone', () => ({
    start: tone.start,
    context: { state: 'running', resume: tone.resume },
    Synth: class {
        constructor() { tone.synthCount++; }
        toDestination() { return this; }
        triggerAttackRelease(freq: unknown, dur: unknown) { tone.trigger(freq, dur); }
    },
}));

import { createAudioService } from './audio-service.js';

const originalWindow = globalThis.window;
afterEach(() => {
    vi.clearAllMocks();
    tone.synthCount = 0;
    if (originalWindow === undefined) delete (globalThis as any).window;
    else globalThis.window = originalWindow;
});

test('audio service honors the injected mute provider before constructing or playing a synth', () => {
    const audioService = createAudioService();
    audioService.setMutedProvider(() => true);
    audioService.play('C4', '8n');
    assert.equal(tone.synthCount, 0);
    assert.equal(tone.trigger.mock.calls.length, 0);

    audioService.setMutedProvider(() => false);
    audioService.play('D4', '16n');
    assert.equal(tone.synthCount, 1);
    assert.deepEqual(tone.trigger.mock.calls, [['D4', '16n']]);
});

test('audio service arms one-shot browser unlock listeners and resumes Tone on user input', async () => {
    const listeners = new Map<string, { listener: () => Promise<void>; options: unknown }>();
    (globalThis as any).window = {
        addEventListener(type: string, listener: () => Promise<void>, options: unknown) {
            listeners.set(type, { listener, options });
        },
    };
    createAudioService();
    assert.deepEqual([...listeners.keys()], ['pointerdown', 'keydown', 'touchstart']);
    for (const { options } of listeners.values()) assert.deepEqual(options, { once: true, passive: true });

    await listeners.get('pointerdown')!.listener();
    assert.equal(tone.start.mock.calls.length, 1);
    assert.equal(tone.resume.mock.calls.length, 0);
});
