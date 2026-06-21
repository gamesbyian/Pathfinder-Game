#!/usr/bin/env node
/**
 * Unit tests for the importable app composition root.
 *
 * These use injected factories so the composition contract can be tested without
 * constructing DOM/canvas/Firebase/browser adapters.
 */
import assert from 'node:assert/strict';
import { createApp, createAppFacade, createDefaultDataAssetLoader, createReadOnlyDiagnostics } from '../modules/app.js';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${error.stack || error.message}`);
    failed += 1;
  }
}

function makeFactories(events = []) {
  const core = {
    SOUND_BUS: {
      provider: null,
      setMutedProvider(fn) {
        events.push('core.setMutedProvider');
        this.provider = fn;
      },
    },
    deepClone: (value) => JSON.parse(JSON.stringify(value)),
  };
  const state = { ENGINE: { muted: true, isDirty: false } };
  const solverV2 = { name: 'solver' };
  const data = {
    getLevels: () => [{ id: 'level-1' }],
    getThemes: () => ({ classic: {} }),
  };
  const ui = { name: 'ui' };
  const themes = {
    THEMES: { test: {} },
    getTheme: (id) => ({ id }),
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
    createCore: () => core,
    createState: ({ core: receivedCore }) => {
      assert.equal(receivedCore, core);
      return state;
    },
    createSolverV2: () => solverV2,
    createData: (options) => {
      events.push(['createData', options]);
      assert.equal(options.deepClone, core.deepClone);
      return data;
    },
    createUI: ({ core: receivedCore, getState, getRenderer }) => {
      assert.equal(receivedCore, core);
      assert.equal(getState(), state.ENGINE);
      // ui no longer depends on renderer (ui↔renderer cycle removed) — no getRenderer is passed.
      assert.equal(getRenderer, undefined);
      return ui;
    },
    createThemes: ({ state: receivedState, data: receivedData, persistence: receivedPersistence, getUI }) => {
      assert.equal(receivedState, state);
      assert.equal(receivedData, data);
      // persistence is built before themes now (cycle removed) and injected directly.
      assert.equal(receivedPersistence, persistence);
      assert.equal(getUI(), ui);
      return themes;
    },
    createRenderer: ({ core: receivedCore, state: receivedState, ui: receivedUi }) => {
      assert.equal(receivedCore, core);
      assert.equal(receivedState, state);
      assert.equal(receivedUi, ui);
      return renderer;
    },
    createDebug: ({ core: receivedCore }) => {
      assert.equal(receivedCore, core);
      return debug;
    },
    createLevelUtils: ({ core: receivedCore, data: receivedData, getState, getRenderer }) => {
      assert.equal(receivedCore, core);
      assert.equal(receivedData, data);
      assert.equal(getState(), state.ENGINE);
      assert.equal(getRenderer(), renderer);
      return levelUtils;
    },
    createEditor: ({ core: receivedCore, state: receivedState, ui: receivedUi, levelUtils: receivedLevelUtils, solverV2: receivedSolver, getEngineRuntime }) => {
      assert.equal(receivedCore, core);
      assert.equal(receivedState, state);
      assert.equal(receivedUi, ui);
      assert.equal(receivedLevelUtils, levelUtils);
      assert.equal(receivedSolver, solverV2);
      editor.capturedGetEngineRuntime = getEngineRuntime;
      events.push('editor.create');
      return editor;
    },
    createPersistence: ({ getState, themeExists, getRawLevels, onProgressChanged }) => {
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
    createEngine: ({ core: receivedCore, state: receivedState, ui: receivedUi, renderer: receivedRenderer, levelUtils: receivedLevelUtils, themes: receivedThemes, data: receivedData, persistence: receivedPersistence, editor: receivedEditor }) => {
      assert.equal(receivedCore, core);
      assert.equal(receivedState, state);
      assert.equal(receivedUi, ui);
      assert.equal(receivedRenderer, renderer);
      assert.equal(receivedLevelUtils, levelUtils);
      assert.equal(receivedThemes, themes);
      assert.equal(receivedData, data);
      assert.equal(receivedPersistence, persistence);
      assert.equal(receivedEditor, editor);
      return engine;
    },
    createInput: ({ core: receivedCore, state: receivedState, ui: receivedUi, engine: receivedEngine, levelUtils: receivedLevelUtils, editor: receivedEditor, renderer: receivedRenderer, themes: receivedThemes, data: receivedData, solverV2: receivedSolver, persistence: receivedPersistence }) => {
      assert.equal(receivedCore, core);
      assert.equal(receivedState, state);
      assert.equal(receivedUi, ui);
      assert.equal(receivedEngine, engine);
      assert.equal(receivedLevelUtils, levelUtils);
      assert.equal(receivedEditor, editor);
      assert.equal(receivedRenderer, renderer);
      assert.equal(receivedThemes, themes);
      assert.equal(receivedData, data);
      assert.equal(receivedSolver, solverV2);
      assert.equal(receivedPersistence, persistence);
      return input;
    },
    createLoader: ({ ui: receivedUi, data: receivedData, themes: receivedThemes, core: receivedCore, dataAssetLoader }) => {
      assert.equal(receivedUi, ui);
      assert.equal(receivedData, data);
      assert.equal(receivedThemes, themes);
      assert.equal(receivedCore, core);
      if (dataAssetLoader) events.push(['createLoaderDataAssetLoader', dataAssetLoader]);
      return loader;
    },
    createBoot: ({ ui: receivedUi, debug: receivedDebug, persistence: receivedPersistence, loader: receivedLoader, themes: receivedThemes, engine: receivedEngine, data: receivedData, core: receivedCore, state: receivedState }) => {
      assert.equal(receivedUi, ui);
      assert.equal(receivedDebug, debug);
      assert.equal(receivedPersistence, persistence);
      assert.equal(receivedLoader, loader);
      assert.equal(receivedThemes, themes);
      assert.equal(receivedEngine, engine);
      assert.equal(receivedData, data);
      assert.equal(receivedCore, core);
      assert.equal(receivedState, state);
      return boot;
    },
  };
}

await test('createApp supports injected factories and wires subsystems in order', () => {
  const events = [];
  const app = createApp({ factories: makeFactories(events), dataSources: { levels: [{ id: 'injected' }] } });
  assert.equal(app.core.SOUND_BUS.provider(), true);
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
  assert.equal(events[0], 'core.setMutedProvider');
  assert.ok(events.includes('editor.create'), 'editor is constructed');
  const dataEvent = events.find((e) => Array.isArray(e) && e[0] === 'createData');
  assert.deepEqual(dataEvent[1].levels, [{ id: 'injected' }]);
});


await test('createDefaultDataAssetLoader fetches level and theme JSON assets', async () => {
  const calls = [];
  const loader = createDefaultDataAssetLoader({
    basePath: '/assets',
    fetchImpl: async (url) => {
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

await test('createApp passes an injected dataAssetLoader to createLoader', () => {
  const events = [];
  const dataAssetLoader = async () => ({ levels: [], themes: {} });
  createApp({ factories: makeFactories(events), dataAssetLoader });
  const loaderEvent = events.find(event => Array.isArray(event) && event[0] === 'createLoaderDataAssetLoader');
  assert.equal(loaderEvent?.[1], dataAssetLoader);
});

await test('createAppFacade exposes live state and subsystem references', () => {
  const app = createApp({ factories: makeFactories() });
  const facade = createAppFacade(app);
  assert.equal(facade.Core, app.core);
  assert.equal(facade.Engine, app.engine);
  assert.equal(facade.Editor, app.editor);
  assert.equal(facade.State.ENGINE, app.state.ENGINE);
  app.state.ENGINE.muted = false;
  assert.equal(facade.State.ENGINE.muted, false);
});

await test('createReadOnlyDiagnostics exposes a frozen, snapshot-only surface', () => {
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
  assert.equal(diagnostics.State, undefined);
  assert.equal(diagnostics.Engine, undefined);
  assert.equal(diagnostics.getCurrentLevel(), null);
  assert.equal(diagnostics.getCurrentLevelIndex(), null);
});

if (failed > 0) {
  console.error(`\nApp module tests: ${passed} passed, ${failed} failed`);
  process.exit(1);
}

console.log(`\nApp module tests: ${passed} passed, ${failed} failed`);
