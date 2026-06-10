import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const moduleSources = {
  persistence: await readFile(new URL('../modules/persistence.js', import.meta.url), 'utf8'),
  loader: await readFile(new URL('../modules/loader.js', import.meta.url), 'utf8'),
  boot: await readFile(new URL('../modules/boot.js', import.meta.url), 'utf8')
};

// Load persistence sub-modules so their factory functions are available when
// the stripped installPersistence body runs in the VM context.
const persistenceSubModuleSrcs = await Promise.all([
  '../modules/persistence/firebase-client.js',
  '../modules/persistence/local-session-store.js',
  '../modules/persistence/progress-store.js',
  '../modules/persistence/level-submission-repository.js',
  '../modules/persistence/review-repository.js',
].map(p => readFile(new URL(p, import.meta.url), 'utf8')));

// Strip ES-module syntax (import/export declarations) so the source can run
// as a plain script in the VM context.  Named imports become free-variable
// references resolved from the same VM scope; exports become plain functions.
const stripEsm = src =>
  src.replace(/^import\b[^\n]*\n/gm, '')
     .replace(/^export\s+(?=function|const|class|async\s)/gm, '');
const stripModuleWrapper = (source, installName) => {
  const token = `export function ${installName}(APP) {`;
  const start = source.indexOf(token);
  if (start < 0) return source;
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return source;
};
const persistenceSubModules = persistenceSubModuleSrcs.map(stripEsm).join('\n');
const persistenceHarness = persistenceSubModules + '\n' + stripModuleWrapper(moduleSources.persistence, 'installPersistence');
const loaderHarness = stripModuleWrapper(moduleSources.loader, 'installLoader');
const bootHarness = stripModuleWrapper(moduleSources.boot, 'installBoot').replace(/\n\s*window\.onload = \(\) => \{[\s\S]*$/, '');


function extractIifeAssignment(source, token) {
  const start = source.indexOf(token);
  if (start < 0) throw new Error(`Unable to locate token: ${token}`);
  const openBrace = source.indexOf('{', start);
  if (openBrace < 0) throw new Error(`Unable to locate body start for: ${token}`);
  let depth = 0;
  let end = -1;
  for (let i = openBrace; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) throw new Error(`Unable to locate body end for: ${token}`);
  const semicolon = source.indexOf(';', end);
  if (semicolon < 0) throw new Error(`Unable to locate assignment terminator for: ${token}`);
  return source.slice(start, semicolon + 1);
}

function extractWindowOnload(source) {
  const token = 'window.onload = () => {';
  const start = source.indexOf(token);
  if (start < 0) throw new Error('Unable to locate window.onload assignment');
  const openBrace = source.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = openBrace; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) throw new Error('Unable to locate window.onload body end');
  const semicolon = source.indexOf(';', end);
  return source.slice(start, semicolon + 1);
}

const persistenceSource = html.includes('APP.Persistence = (() => {') ? extractIifeAssignment(html, 'APP.Persistence = (() => {') : persistenceHarness;
const loaderSource = html.includes('APP.Loader = (() => {') ? extractIifeAssignment(html, 'APP.Loader = (() => {') : loaderHarness;
const bootSource = html.includes('APP.Boot = (() => {') ? extractIifeAssignment(html, 'APP.Boot = (() => {') : bootHarness;
const onloadSource = html.includes('window.onload = () => {') ? extractWindowOnload(html) : moduleSources.boot.match(/window\.onload = \(\) => \{[\s\S]*?\n\s*\};/)?.[0];

// 1) syncProgress should not duplicate cloud listeners for the same signed-in user.
{
  const counters = {
    levelProgressSubs: 0,
    sessionStateSubs: 0,
    levelProgressUnsubs: 0,
    sessionStateUnsubs: 0
  };

  const makeFirestore = () => {
    const mkDataDoc = (name) => ({
      onSnapshot(cb) {
        if (name === 'levelProgress') counters.levelProgressSubs += 1;
        if (name === 'sessionState') counters.sessionStateSubs += 1;
        cb({ exists: false, data: () => ({}) });
        return () => {
          if (name === 'levelProgress') counters.levelProgressUnsubs += 1;
          if (name === 'sessionState') counters.sessionStateUnsubs += 1;
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

  const ctx = {
    APP: {
      State: { ENGINE: { progressSet: new Set(), runtime: { currentTheme: 'classic' }, levelIdx: 0, mode: 'play' } },
      Themes: { getTheme: () => ({}) },
      LevelUtils: { getRawLevels: () => [{}] },
      UI: { updateLevelDisplay() {} }
    },
    __firebase_config: '{}',
    __app_id: 'test-app',
    firebase: {
      initializeApp() {},
      auth: () => authObj,
      firestore: () => { const db = makeFirestore(); db.settings = () => {}; return db; }
    },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => { storage.set(key, String(value)); }
    }
  };

  vm.createContext(ctx);
  vm.runInContext(persistenceSource, ctx, { filename: 'persistence-slice.js' });

  ctx.APP.Persistence.syncProgress();
  ctx.APP.Persistence.syncProgress();
  assert.equal(counters.levelProgressSubs, 1, 'levelProgress listener should subscribe only once for same uid');
  assert.equal(counters.sessionStateSubs, 1, 'sessionState listener should subscribe only once for same uid');

  authObj.currentUser = { uid: 'user-2' };
  ctx.APP.Persistence.syncProgress();
  assert.equal(counters.levelProgressUnsubs, 1, 'switching users should unsubscribe prior levelProgress listener');
  assert.equal(counters.sessionStateUnsubs, 1, 'switching users should unsubscribe prior sessionState listener');

  authObj.currentUser = null;
  ctx.APP.Persistence.syncProgress();
  assert.equal(counters.levelProgressUnsubs, 2, 'clearing user should unsubscribe active levelProgress listener');
  assert.equal(counters.sessionStateUnsubs, 2, 'clearing user should unsubscribe active sessionState listener');
}

// 2) Levels-load failure should settle the loader to a terminal mode (not hang).
//    There is no local level fallback — levels.js IS the level data — so the loader
//    settles to 'failed' when it cannot load. (Themes load independently and fall
//    back to a default theme, which is why themes progress still advances here.)
{
  const progress = [];
  const ctx = {
    APP: {
      UI: {
        setProgress(entry) { progress.push(entry); },
        reportError() {},
        setOverlayOpacity() {},
        hideOverlay() {}
      },
      Data: {
        ingest() {},
        getLevels: () => []
      },
      Themes: {
        ensureThemeLeaveColors() {},
        populateThemes() {}
      }
    },
    document: {
      head: {
        appendChild(scriptEl) {
          if (scriptEl.src.endsWith('/themes.js') || scriptEl.src === './themes.js') setTimeout(() => scriptEl.onload?.(), 0);
          if (scriptEl.src.endsWith('/levels.js') || scriptEl.src === './levels.js') setTimeout(() => scriptEl.onerror?.(new Error('load failure')), 0);
        }
      },
      createElement() { return { src: '', onload: null, onerror: null }; },
      getElementById() { return null; }
    },
    window: { addEventListener() {} },
    setTimeout,
    clearTimeout,
    console
  };

  vm.createContext(ctx);
  vm.runInContext(loaderSource, ctx, { filename: 'loader-slice.js' });

  const mode = await ctx.APP.Loader.init();
  const status = ctx.APP.Loader.getStatus();
  assert.equal(mode, 'failed', 'loader should resolve to failed when levels.js cannot load');
  assert.equal(status.mode, 'failed', 'loader mode should settle to failed');
  assert.ok(progress.some((entry) => entry.phase === 'Loading Themes...'), 'themes load progress should be emitted before the levels failure');
}

// 3) Auth rejection path should still settle loader via finish.
{
  const calls = { syncProgress: 0, loaderFinish: 0, loaderFail: 0 };

  const ctx = {
    APP: {
      UI: { initDom() {} },
      Debug: { expose() {} },
      Themes: { ensureThemeLeaveColors() {}, applyTheme() {} },
      Persistence: {
        applySessionState: () => ({ levelIdx: 0, currentTheme: 'classic' }),
        syncProgress() { calls.syncProgress += 1; },
        hasConfig: true,
        async loadPublishedLevels() { return []; },
        async initAuth() { throw new Error('auth rejected'); }
      },
      State: { ENGINE: { runtime: { currentTheme: 'classic' } } },
      Data: { appendLevels() {} },
      Loader: {
        async init() { return 'ready'; },
        getStatus() { return { phase: 'loading' }; },
        finish() { calls.loaderFinish += 1; },
        fail() { calls.loaderFail += 1; }
      },
      Engine: { loadLevel() {}, updatePlayModeLayout() {}, loop() {} },
      Core: { PLAY: 0 }
    },
    console,
    URLSearchParams,
    window: { location: { search: '' } },
    document: { getElementById() { return null; } }
  };

  vm.createContext(ctx);
  vm.runInContext(bootSource, ctx, { filename: 'boot-slice.js' });
  await ctx.APP.Boot.start();
  await Promise.resolve();

  assert.equal(calls.loaderFinish, 1, 'boot should still finish loader when initAuth rejects');
  assert.equal(calls.loaderFail, 0, 'boot should not fail loader for auth rejection path');
  assert.equal(calls.syncProgress, 2, 'syncProgress should run before and after auth attempt');
}

// 4) Input-init failure path should report while allowing startup promise chain to resolve.
{
  const calls = { bootStart: 0, reportedErrors: [], loaderFail: 0 };

  const ctx = {
    APP: {
      Input: { init() { throw new Error('input init failed'); } },
      Boot: {
        async start() { calls.bootStart += 1; }
      },
      UI: {
        reportError(kind) { calls.reportedErrors.push(kind); }
      },
      Loader: {
        fail() { calls.loaderFail += 1; }
      }
    },
    window: {},
    console
  };

  vm.createContext(ctx);
  vm.runInContext(onloadSource, ctx, { filename: 'onload-slice.js' });

  ctx.window.onload();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(calls.bootStart, 1, 'window.onload should continue into boot start even when input init throws');
  assert.equal(calls.loaderFail, 0, 'window.onload should not fail loader when boot start succeeds');
  assert.ok(calls.reportedErrors.includes('startup-input-init'), 'window.onload should report input init error after boot');
}

console.log('Startup smoke test passed (listener dedupe + loader settle paths).');
