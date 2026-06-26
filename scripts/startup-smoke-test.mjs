import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformSync } from 'esbuild';

// Helper: strip ES-module import/export declarations so sources can run as
// plain scripts in the VM context.  Named imports become free-variable
// references resolved from the same VM scope; exports become plain functions.
const stripEsm = src =>
  src.replace(/^import\b[^\n]*\n/gm, '')
     .replace(/^export\s+(?=function|const|class|async\s)/gm, '')
     .replace(/^export\s*\{[^}]*\};?\s*$/gm, '');

// Read a module source; for `.ts` modules (the .js→.ts migration, ADR 0011) strip TypeScript type
// annotations first via esbuild so the result is plain JS the VM can eval. ESM is preserved so
// stripEsm still applies.
const readSrc = async (relPath) => {
  const src = await readFile(new URL(relPath, import.meta.url), 'utf8');
  return relPath.endsWith('.ts') ? transformSync(src, { loader: 'ts' }).code : src;
};

// Load module sources
const persistenceSrc = await readFile(new URL('../modules/persistence.js', import.meta.url), 'utf8');
const loaderSrc      = await readFile(new URL('../modules/loader.js',      import.meta.url), 'utf8');
const bootSrc        = await readFile(new URL('../modules/boot.js',        import.meta.url), 'utf8');

// modules/state-actions.js is now a re-export barrel; its actual implementations live in
// modules/state/actions/. Load the shared helper + each slice module so the state-action
// functions are defined in the VM scope for boot.js (which references several of them).
const stateActionsSubModuleSrcs = await Promise.all([
  '../modules/state/actions/shared.ts',
  '../modules/state/actions/core-actions.ts',
  '../modules/state/actions/navigation-actions.ts',
  '../modules/state/actions/hazard-actions.ts',
  '../modules/state/actions/hint-actions.ts',
  '../modules/state/actions/solver-actions.ts',
  '../modules/state/actions/review-actions.ts',
  '../modules/state/actions/editor-actions.ts',
  '../modules/state/actions/ui-actions.ts',
  '../modules/state/actions/runtime-actions.ts',
  '../modules/state/actions/rating-actions.ts',
].map(readSrc));

// Load persistence sub-modules — their factory functions must be in scope when
// createPersistence runs in the VM context.  Also include domain helpers that
// persistence.js imports (ESM imports are stripped, so the functions must be
// injected as plain scripts before the factory runs).
const persistenceSubModuleSrcs = await Promise.all([
  '../modules/domain/level-fingerprint.ts',
  '../modules/persistence/firebase-runtime-config.ts',
  '../modules/persistence/firebase-client.ts',
  '../modules/persistence/local-session-store.ts',
  '../modules/persistence/progress-store.ts',
  '../modules/persistence/level-submission-repository.ts',
  '../modules/persistence/review-repository.ts',
  '../modules/persistence/level-rating-repository.ts',
].map(readSrc));

const persistenceSubModules = persistenceSubModuleSrcs.map(stripEsm).join('\n');

// Full harnesses: sub-modules + factory, all ESM stripped
const stateActionsHarness = stateActionsSubModuleSrcs.map(stripEsm).join('\n');
const persistenceHarness  = persistenceSubModules + '\n' + stripEsm(persistenceSrc);
const loaderHarness       = stripEsm(loaderSrc);
const bootHarness         = stateActionsHarness + '\n' + stripEsm(bootSrc);


// 1) syncProgress should not duplicate cloud listeners for the same signed-in user.
{
  const counters = {
    levelProgressSubs: 0,
    sessionStateSubs:  0,
    levelProgressUnsubs: 0,
    sessionStateUnsubs:  0
  };

  const makeFirestore = () => {
    const mkDataDoc = (name) => ({
      onSnapshot(cb) {
        if (name === 'levelProgress') counters.levelProgressSubs += 1;
        if (name === 'sessionState')  counters.sessionStateSubs  += 1;
        cb({ exists: false, data: () => ({}) });
        return () => {
          if (name === 'levelProgress') counters.levelProgressUnsubs += 1;
          if (name === 'sessionState')  counters.sessionStateUnsubs  += 1;
        };
      }
    });

    const dataCollection = {
      doc(name) {
        if (name === 'levelProgress' || name === 'sessionState') return mkDataDoc(name);
        return this;
      }
    };

    const usersCollection = { doc() { return { collection: () => dataCollection }; } };
    const artifactsCollection = { doc() { return { collection: () => usersCollection }; } };
    return { collection() { return artifactsCollection; } };
  };

  const authObj = { currentUser: { uid: 'user-1' } };
  const storage = new Map();

  const fakeDeps = {
    getState:          () => ({ progressSet: new Set(), runtime: { currentTheme: 'classic' }, levelIdx: 0, mode: 'play' }),
    getTheme:          () => ({}),
    getRawLevels:      () => [{}],
    onProgressChanged: () => {},
  };

  const ctx = {
    ...fakeDeps,
    __firebase_config: '{}',
    __app_id: 'test-app',
    firebase: {
      initializeApp() {},
      auth: () => authObj,
      firestore: () => { const db = makeFirestore(); db.settings = () => {}; return db; }
    },
    localStorage: {
      getItem:  (key)        => storage.get(key) ?? null,
      setItem:  (key, value) => { storage.set(key, String(value)); }
    },
  };

  vm.createContext(ctx);
  vm.runInContext(persistenceHarness, ctx, { filename: 'persistence-harness.js' });

  const persistence = ctx.createPersistence(fakeDeps);

  persistence.syncProgress();
  persistence.syncProgress();
  assert.equal(counters.levelProgressSubs, 1, 'levelProgress listener should subscribe only once for same uid');
  assert.equal(counters.sessionStateSubs,  1, 'sessionState listener should subscribe only once for same uid');

  authObj.currentUser = { uid: 'user-2' };
  persistence.syncProgress();
  assert.equal(counters.levelProgressUnsubs, 1, 'switching users should unsubscribe prior levelProgress listener');
  assert.equal(counters.sessionStateUnsubs,  1, 'switching users should unsubscribe prior sessionState listener');

  authObj.currentUser = null;
  persistence.syncProgress();
  assert.equal(counters.levelProgressUnsubs, 2, 'clearing user should unsubscribe active levelProgress listener');
  assert.equal(counters.sessionStateUnsubs,  2, 'clearing user should unsubscribe active sessionState listener');
}

// 2) Data-asset load failure should settle the loader to a terminal mode (not hang).
//    The loader requires a dataAssetLoader; when none is provided it settles to 'failed'.
{
  const uiStub = {
    setProgress()           {},
    reportError()           {},
    setOverlayOpacity()     {},
    hideOverlay()           {}
  };
  const dataStub = {
    ingest()      {},
    getLevels:    () => []
  };
  const themesStub = {
    ensureThemeLeaveColors() {},
    populateThemes()         {}
  };
  const coreStub = { DEV: false };

  const ctx = {
    createLoader: null, // will be set by vm.runInContext
    document: {
      head: { appendChild() {} },
      createElement() { return { src: '', onload: null, onerror: null }; },
      getElementById() { return null; }
    },
    window:       { addEventListener() {} },
    setTimeout,
    clearTimeout,
    console
  };

  vm.createContext(ctx);
  vm.runInContext(loaderHarness, ctx, { filename: 'loader-harness.js' });

  // No dataAssetLoader provided — loader must fail rather than hang.
  const loader = ctx.createLoader({ ui: uiStub, data: dataStub, themes: themesStub, core: coreStub });
  const mode   = await loader.init();
  const status = loader.getStatus();
  assert.equal(mode,         'failed', 'loader should resolve to failed when dataAssetLoader is absent');
  assert.equal(status.mode,  'failed', 'loader mode should settle to failed');
}

// 3) Auth rejection path should still settle loader via finish.
{
  const calls = { syncProgress: 0, loaderFinish: 0, loaderFail: 0 };

  const fakeDeps = {
    ui:    { initDom() {} },
    debug: { expose() {} },
    themes: { ensureThemeLeaveColors() {}, applyTheme() {} },
    persistence: {
      applySessionState: () => ({ levelIdx: 0, currentTheme: 'classic' }),
      syncProgress() { calls.syncProgress += 1; },
      hasConfig: true,
      async loadPublishedLevels() { return []; },
      async initAuth() { throw new Error('auth rejected'); }
    },
    state: { ENGINE: { runtime: { currentTheme: 'classic' } } },
    data:  { appendLevels() {} },
    loader: {
      async init()    { return 'ready'; },
      getStatus()     { return { phase: 'loading' }; },
      finish()        { calls.loaderFinish += 1; },
      fail()          { calls.loaderFail   += 1; }
    },
    engine: { game: { loadLevel() {} }, updatePlayModeLayout() {}, loop() {} },
    core:   { PLAY: 0 }
  };

  const ctx = {
    createBoot: null, // set by vm.runInContext
    createOnloadHandler: null,
    console,
    URLSearchParams,
    window: { location: { search: '' } },
    document: { getElementById() { return null; } }
  };

  vm.createContext(ctx);
  vm.runInContext(bootHarness, ctx, { filename: 'boot-harness.js' });

  const boot = ctx.createBoot(fakeDeps);
  await boot.start();
  await Promise.resolve();

  assert.equal(calls.loaderFinish, 1, 'boot should still finish loader when initAuth rejects');
  assert.equal(calls.loaderFail,   0, 'boot should not fail loader for auth rejection path');
  assert.equal(calls.syncProgress, 2, 'syncProgress should run before and after auth attempt');
}

// 4) Input-init failure path should report while allowing startup promise chain to resolve.
{
  const calls = { bootStart: 0, reportedErrors: [], loaderFail: 0 };

  const fakeDeps = {
    input:  { init() { throw new Error('input init failed'); } },
    boot:   { async start() { calls.bootStart += 1; } },
    ui:     { reportError(kind) { calls.reportedErrors.push(kind); } },
    loader: { fail() { calls.loaderFail += 1; } }
  };

  const ctx = {
    createBoot: null,
    createOnloadHandler: null,
    console,
    window: {}
  };

  vm.createContext(ctx);
  vm.runInContext(bootHarness, ctx, { filename: 'boot-harness-onload.js' });

  const handler = ctx.createOnloadHandler(fakeDeps);
  handler();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(calls.bootStart, 1,   'onload handler should continue into boot start even when input init throws');
  assert.equal(calls.loaderFail, 0,  'onload handler should not fail loader when boot start succeeds');
  assert.ok(calls.reportedErrors.includes('startup-input-init'), 'onload handler should report input init error after boot');
}

console.log('Startup smoke test passed (listener dedupe + loader settle paths).');
