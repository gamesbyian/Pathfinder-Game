import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createBoot } from './boot.js';

test('boot falls back to level 1 when persisted level index is outside the loaded corpus', async () => {
  const calls: any[] = [];
  const boot = createBoot({
    ui: { initDom() {} },
    debug: { expose() {} },
    persistence: {
      applySessionState: () => ({ levelIdx: 99, currentTheme: 'classic' }),
      syncProgress() {},
      hasConfig: false,
    },
    loader: {
      async init() { return 'ready'; },
      getStatus() { return { phase: 'ready' }; },
      finish() { calls.push(['finish']); },
      fail(kind: any, payload: any) { calls.push(['fail', kind, payload]); },
    },
    themes: {
      ensureThemeLeaveColors() {},
      applyTheme(theme: string) { calls.push(['theme', theme]); },
    },
    engine: {
      game: { loadLevel(idx: number) { calls.push(['loadLevel', idx]); } },
      updatePlayModeLayout() {},
      loop() {},
    },
    data: {
      getLevels: () => [{ id: 'one' }, { id: 'two' }],
      getLevel: (idx: number) => [{ id: 'one' }, { id: 'two' }][idx],
      appendLevels() {},
    },
    state: { ENGINE: { runtime: { currentTheme: 'classic' } } },
  });

  const oldWindow = (globalThis as any).window;
  const oldDocument = (globalThis as any).document;
  (globalThis as any).window = { location: { search: '' } };
  (globalThis as any).document = { getElementById: () => null };
  try {
    await boot.start();
  } finally {
    (globalThis as any).window = oldWindow;
    (globalThis as any).document = oldDocument;
  }

  assert.deepEqual(calls.find((call) => call[0] === 'loadLevel'), ['loadLevel', 0]);
  assert.equal(calls.some((call) => call[0] === 'fail'), false);
});
