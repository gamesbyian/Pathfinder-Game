/**
 * Unit tests for the importable app composition root.
 *
 * These use injected factories so the composition contract can be tested without
 * constructing DOM/canvas/Firebase/browser adapters.
 */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createApp, createAppFacade, createDefaultDataAssetLoader, createReadOnlyDiagnostics, shouldExposeMutableFacade } from './app.js';

function makeFactories(events: any[] = []) {
  const audioService = {
    provider: null as null | (() => boolean),
    setMutedProvider(fn: () => boolean) {
      events.push('audio.setMutedProvider');
      this.provider = fn;
    },
    play() {},
  };
  const state = { ENGINE: { muted: true, isDirty: false } };
  const solverApi = { name: 'solver' };
  const data = {
    getLevels: () => [{ id: 'level-1' }],
    getThemes: () => ({ classic: {} }),
    setFirestoreHintsSource: () => {},
  };
  const ui = { name: 'ui' };
  const themes = {
    THEMES: { test: {} },
    getTheme: (id: any) => ({ id }),
  };
  const renderer = { name: 'renderer' };
  const debug = { name: 'debug' };
  const levelUtils = { name: 'levelUtils' };
  const editor = {
    name: 'editor',
    // The editor resolves its engine port lazily via getEngineRuntime() (no init() call).
    capturedGetEngineRuntime: null,
  };
  const persistence = { name: 'persistence' };
  const engine = {
    name: 'engine',
    // The editor-facing port (createEditorEnginePort) is assembled from these.
    switchMode() {}, clearHintPaths() {}, updatePencilState() {},
    setLogicState() {}, setOverlayState() {}, getRealLength() {},
    rebuildDerivedPathState() {}, assertStateConsistency() {},
    PathNavigator: { name: 'PathNavigator' },
  };
  const input = { name: 'input' };
  const loader = { name: 'loader' };
  const boot = { name: 'boot' };

  return {
    createState: () => state,
    createAudioService: ({ reportError }: any) => {
      assert.equal(typeof reportError, 'function');
      return audioService;
    },
    createSolver: () => solverApi,
    createData: (options: any) => {
      events.push(['createData', options]);
      assert.equal(typeof options.deepClone, 'function');
      assert.deepEqual(options.deepClone({ nested: { value: 1 } }), { nested: { value: 1 } });
      return data;
    },
    createUI: ({ getState, getRenderer }: any) => {
      assert.equal(getState(), state.ENGINE);
      // ui no longer depends on renderer (ui↔renderer cycle removed) — no getRenderer is passed.
      assert.equal(getRenderer, undefined);
      return ui;
    },
    createThemes: ({ state: receivedState, data: receivedData, persistence: receivedPersistence, getUI }: any) => {
      assert.equal(receivedState, state);
      assert.equal(receivedData, data);
      // persistence is built before themes now (cycle removed) and injected directly.
      assert.equal(receivedPersistence, persistence);
      assert.equal(getUI(), ui);
      return themes;
    },
    createRenderer: ({ state: receivedState, ui: receivedUi }: any) => {
      assert.equal(receivedState, state);
      assert.equal(receivedUi, ui);
      return renderer;
    },
    createDebug: () => debug,
    createLevelUtils: ({ data: receivedData, getState, getRenderer }: any) => {
      assert.equal(receivedData, data);
      assert.equal(getState(), state.ENGINE);
      assert.equal(getRenderer(), renderer);
      return levelUtils;
    },
    createEditor: ({ state: receivedState, ui: receivedUi, levelUtils: receivedLevelUtils, solverApi: receivedSolver, getEngineRuntime }: any) => {
      assert.equal(receivedState, state);
      assert.equal(receivedUi, ui);
      assert.equal(receivedLevelUtils, levelUtils);
      assert.equal(receivedSolver, solverApi);
      editor.capturedGetEngineRuntime = getEngineRuntime;
      events.push('editor.create');
      return editor;
    },
    createPersistence: ({ getState, themeExists, getRawLevels, onProgressChanged }: any) => {
      assert.equal(getState(), state.ENGINE);
      // persistence validates theme ids via a predicate sourced from data (not the themes
      // registry), so it no longer depends on themes.
      assert.equal(themeExists('classic'), true);
      assert.equal(themeExists('nope'), false);
      assert.deepEqual(getRawLevels(), [{ id: 'level-1' }]);
      onProgressChanged();
      assert.equal(state.ENGINE.isDirty, true);
      return persistence;
    },
    createEngine: ({ state: receivedState, ui: receivedUi, renderer: receivedRenderer, levelUtils: receivedLevelUtils, themes: receivedThemes, data: receivedData, persistence: receivedPersistence, editor: receivedEditor, audioService: receivedAudioService }: any) => {
      assert.equal(receivedState, state);
      assert.equal(receivedUi, ui);
      assert.equal(receivedRenderer, renderer);
      assert.equal(receivedLevelUtils, levelUtils);
      assert.equal(receivedThemes, themes);
      assert.equal(receivedData, data);
      assert.equal(receivedPersistence, persistence);
      assert.equal(receivedEditor, editor);
      assert.equal(receivedAudioService, audioService);
      return engine;
    },
    createInput: ({ state: receivedState, ui: receivedUi, engine: receivedEngine, levelUtils: receivedLevelUtils, editor: receivedEditor, renderer: receivedRenderer, themes: receivedThemes, data: receivedData, solverApi: receivedSolver, persistence: receivedPersistence, audioService: receivedAudioService }: any) => {
      assert.equal(receivedState, state);
      assert.equal(receivedUi, ui);
      assert.equal(receivedEngine, engine);
      assert.equal(receivedLevelUtils, levelUtils);
      assert.equal(receivedEditor, editor);
      assert.equal(receivedRenderer, renderer);
      assert.equal(receivedThemes, themes);
      assert.equal(receivedData, data);
      assert.equal(receivedSolver, solverApi);
      assert.equal(receivedPersistence, persistence);
      assert.equal(receivedAudioService, audioService);
      return input;
    },
    createLoader: ({ ui: receivedUi, data: receivedData, themes: receivedThemes, dataAssetLoader }: any) => {
      assert.equal(receivedUi, ui);
      assert.equal(receivedData, data);
      assert.equal(receivedThemes, themes);
      if (dataAssetLoader) events.push(['createLoaderDataAssetLoader', dataAssetLoader]);
      return loader;
    },
    createBoot: ({ ui: receivedUi, debug: receivedDebug, persistence: receivedPersistence, loader: receivedLoader, themes: receivedThemes, engine: receivedEngine, data: receivedData, state: receivedState }: any) => {
      assert.equal(receivedUi, ui);
      assert.equal(receivedDebug, debug);
      assert.equal(receivedPersistence, persistence);
      assert.equal(receivedLoader, loader);
      assert.equal(receivedThemes, themes);
      assert.equal(receivedEngine, engine);
      assert.equal(receivedData, data);
      assert.equal(receivedState, state);
      return boot;
    },
  };
}

test('createApp supports injected factories and wires subsystems in order', () => {
  const events: any[] = [];
  const app = createApp({ factories: makeFactories(events), dataSources: { levels: [{ id: 'injected' }] } });
  assert.equal(app.audioService.provider?.(), true);
  // The editor resolves a narrow engine port lazily (no init() call), whose members are the exact
  // engine methods the editor needs — not the whole engine.
  const port = app.editor.capturedGetEngineRuntime();
  assert.notEqual(port, app.engine);
  assert.equal(port.switchMode, app.engine.switchMode);
  assert.equal(port.PathNavigator, app.engine.PathNavigator);
  assert.deepEqual(Object.keys(port).sort(), [
    'PathNavigator', 'assertStateConsistency', 'clearHintPaths', 'getRealLength',
    'rebuildDerivedPathState', 'setLogicState', 'setOverlayState', 'switchMode', 'updatePencilState',
  ]);
  assert.equal(events[0], 'audio.setMutedProvider');
  assert.ok(events.includes('editor.create'), 'editor is constructed');
  const dataEvent = events.find((e: any) => Array.isArray(e) && e[0] === 'createData')!;
  assert.deepEqual(dataEvent[1].levels, [{ id: 'injected' }]);
});

test('createDefaultDataAssetLoader fetches level and theme JSON assets', async () => {
  const calls: any[] = [];
  const loader = createDefaultDataAssetLoader({
    basePath: '/assets',
    fetchImpl: async (url: any) => {
      calls.push(url);
      return {
        ok: true,
        json: async () => url.endsWith('/levels.json') ? [{ id: 'level-json' }] : { classic: { name: 'Classic' } },
      };
    },
  });
  assert.deepEqual(await loader(), { levels: [{ id: 'level-json' }], themes: { classic: { name: 'Classic' } } });
  assert.deepEqual(calls, ['/assets/levels.json', '/assets/themes.json']);
});

test('createApp passes an injected dataAssetLoader to createLoader', () => {
  const events: any[] = [];
  const dataAssetLoader = async () => ({ levels: [], themes: {} });
  createApp({ factories: makeFactories(events), dataAssetLoader });
  const loaderEvent = events.find(event => Array.isArray(event) && event[0] === 'createLoaderDataAssetLoader')!;
  assert.equal(loaderEvent?.[1], dataAssetLoader);
});

test('createAppFacade exposes live state and subsystem references', () => {
  const app = createApp({ factories: makeFactories() });
  const facade = createAppFacade(app);
  assert.equal(facade.Engine, app.engine);
  assert.equal(facade.Editor, app.editor);
  assert.equal(facade.State.ENGINE, app.state.ENGINE);
  app.state.ENGINE.muted = false;
  assert.equal(facade.State.ENGINE.muted, false);
});

test('createReadOnlyDiagnostics exposes a frozen, snapshot-only surface', () => {
  const app = createApp({ factories: makeFactories() });
  const diagnostics = createReadOnlyDiagnostics(app);
  assert.equal(Object.isFrozen(diagnostics), true);

  // Snapshot is a copy: mutating it must not affect live ENGINE.
  app.state.ENGINE.muted = true;
  const snapshot = diagnostics.getStateSnapshot();
  assert.equal(snapshot.muted, true);
  snapshot.muted = false;
  assert.equal(app.state.ENGINE.muted, true);

  // Diagnostics expose no live subsystem references and no mutators.
  assert.equal((diagnostics as any).State, undefined);
  assert.equal((diagnostics as any).Engine, undefined);
  assert.equal(diagnostics.getCurrentLevel(), null);
  assert.equal(diagnostics.getCurrentLevelIndex(), null);
});

test('shouldExposeMutableFacade is opt-in via ?debug alone, on any host', () => {
  // No ?debug → never expose.
  assert.equal(shouldExposeMutableFacade({ search: '' }), false);
  assert.equal(shouldExposeMutableFacade({ search: '?foo=1' }), false);

  // ?debug → exposed, regardless of host (dev or production) — no storage opt-in required.
  assert.equal(shouldExposeMutableFacade({ search: '?debug' }), true);
  assert.equal(shouldExposeMutableFacade({ search: '?debug=1' }), true);
  assert.equal(shouldExposeMutableFacade({}), false);

  // A malformed search input must not crash and must stay closed.
  assert.equal(shouldExposeMutableFacade({ search: null }), false);
});
