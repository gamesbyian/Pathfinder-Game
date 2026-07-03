/**
 * Unit tests for persistence composition boundaries.
 *
 * These keep Firebase/browser-global access injectable so tests and future ESM SDK
 * migration work can construct persistence without relying on compat globals.
 */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createPersistence } from './persistence.js';
import { createFirebaseClient } from './persistence/firebase-client.js';
import { getFirebaseRuntimeConfig } from './persistence/firebase-runtime-config.js';

test('createPersistence accepts injected Firebase config, app id, and client factory', () => {
  const calls: any[] = [];
  const fakeClient = {
    appId: 'unit-app',
    auth: null,
    db: null,
    hasConfig: true,
    initAuth: () => {},
  };
  const persistence = createPersistence({
    getState: () => ({ runtime: { currentTheme: 'classic' }, levelIdx: 0 }),
    themeExists: (id: any) => id === 'classic',
    getRawLevels: () => [{ id: 'level-1' }],
    onProgressChanged: () => {},
    firebaseConfigRaw: '{"projectId":"unit"}',
    appId: 'unit-app',
    firebaseClientOptions: { firebaseApi: 'api' },
    getRuntimeConfig: () => ({ initialAuthToken: 'runtime-token', appId: 'runtime-app', firebaseConfigRaw: '{}' }),
    createClient: (firebaseConfigRaw: any, appId: any, options: any) => {
      calls.push({ firebaseConfigRaw, appId, options });
      return fakeClient;
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].firebaseConfigRaw, '{"projectId":"unit"}');
  assert.equal(calls[0].appId, 'unit-app');
  // The error-reporting seam is threaded into the client options (hardening plan §4).
  const { reportError, ...restOptions } = calls[0].options;
  assert.equal(typeof reportError, 'function');
  assert.deepEqual(restOptions, { firebaseApi: 'api', initialAuthToken: 'runtime-token' });
  assert.equal(persistence.hasConfig, true);
  assert.equal(persistence.getCurrentUser(), undefined);
  assert.equal(typeof persistence.persistSessionState, 'function');
  assert.equal(typeof persistence.submitLevel, 'function');
  assert.equal(typeof persistence.approveHintAddition, 'function');
});

// A minimal fake of the modular firebase SDK surface the client uses (firebase/app|auth|firestore).
function makeModularApi(calls: any[] = []) {
  class GoogleAuthProvider {}
  const timestamp = { sentinel: 'server-time' };
  const auth = { currentUser: null };
  const db = { __fakeFirestore: true };
  const app = { __fakeApp: true };
  const api: any = {
    initializeApp: (config: any) => { calls.push(['initializeApp', config]); return app; },
    getAuth: (a: any) => { calls.push(['getAuth', a]); return auth; },
    initializeFirestore: (a: any, settings: any) => { calls.push(['initializeFirestore', a, settings]); return db; },
    signInWithCustomToken: async (a: any, token: any) => { calls.push(['customToken', token]); },
    signInAnonymously: async (a: any) => { calls.push(['anonymous', a]); },
    signInWithPopup: async (a: any, provider: any) => { calls.push(['popup', a, provider]); },
    signOut: async (a: any) => { calls.push(['signOut', a]); },
    onAuthStateChanged: () => () => {},
    GoogleAuthProvider,
    serverTimestamp: () => timestamp,
  };
  return { api, auth, db, app, timestamp, GoogleAuthProvider };
}

test('createFirebaseClient initializes the modular SDK and exposes its instances', async () => {
  const calls: any[] = [];
  const { api, auth, db, app, timestamp, GoogleAuthProvider } = makeModularApi(calls);

  const client = createFirebaseClient('{"projectId":"unit"}', 'unit-app', {
    firebaseApi: api,
    initialAuthToken: 'token-123',
  });

  await client.initAuth();
  assert.equal(client.auth, auth);
  assert.equal(client.db, db);
  assert.equal(client.hasConfig, true);
  assert.ok(client.createGoogleAuthProvider() instanceof GoogleAuthProvider);
  assert.equal(client.serverTimestamp(), timestamp);
  assert.deepEqual(calls[0], ['initializeApp', { projectId: 'unit' }]);
  // modular: getAuth(app) and initializeFirestore(app, settings) wired to the initialized app.
  assert.deepEqual(calls.find(([k]: any) => k === 'getAuth'), ['getAuth', app]);
  assert.equal(calls.some(([k, a, s]: any) => k === 'initializeFirestore' && a === app && s?.experimentalAutoDetectLongPolling === true), true);
  assert.equal(calls.some(([kind, token]: any) => kind === 'customToken' && token === 'token-123'), true);
});

test('createFirebaseClient signInWithPopup/signOut wrap the modular free functions with the auth instance', async () => {
  const calls: any[] = [];
  const { api, auth } = makeModularApi(calls);
  const client = createFirebaseClient('{"projectId":"unit"}', 'unit-app', { firebaseApi: api });
  const provider = client.createGoogleAuthProvider();
  await client.signInWithPopup(provider);
  await client.signOut();
  assert.deepEqual(calls.find(([k]: any) => k === 'popup'), ['popup', auth, provider]);
  assert.deepEqual(calls.find(([k]: any) => k === 'signOut'), ['signOut', auth]);
});

test('createFirebaseClient runs local-only (no auth/db) when config is absent', async () => {
  const calls: any[] = [];
  const { api } = makeModularApi(calls);
  const client = createFirebaseClient(null, 'unit-app', { firebaseApi: api });
  assert.equal(client.auth, null);
  assert.equal(client.db, null);
  assert.equal(client.hasConfig, false);
  await client.initAuth(); // no-op without auth
  assert.equal(calls.length, 0);
  assert.throws(() => client.signOut(), /No Firebase connection/);
});

test('getFirebaseRuntimeConfig reads injected globals with safe defaults', () => {
  const config = getFirebaseRuntimeConfig({
    getGlobal: () => ({
      __firebase_config: '{"projectId":"unit"}',
      __app_id: 'unit-app',
      __admin_uid: 'admin-1',
      __initial_auth_token: 'token-1',
    }),
  });
  assert.deepEqual(config, {
    firebaseConfigRaw: '{"projectId":"unit"}',
    appId: 'unit-app',
    adminUid: 'admin-1',
    initialAuthToken: 'token-1',
  });
});

test('createPersistence falls back to runtime config provider when explicit config is omitted', () => {
  const calls: any[] = [];
  createPersistence({
    getState: () => ({ runtime: { currentTheme: 'classic' }, levelIdx: 0 }),
    themeExists: () => true,
    getRawLevels: () => [],
    onProgressChanged: () => {},
    getRuntimeConfig: () => ({ firebaseConfigRaw: '{"projectId":"runtime"}', appId: 'runtime-app', initialAuthToken: 'runtime-token' }),
    createClient: (firebaseConfigRaw: any, appId: any, options: any) => {
      calls.push({ firebaseConfigRaw, appId, options });
      return { appId, auth: null, db: null, hasConfig: true, initAuth: () => {} };
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].firebaseConfigRaw, '{"projectId":"runtime"}');
  assert.equal(calls[0].appId, 'runtime-app');
  const { reportError, ...restOptions } = calls[0].options;
  assert.equal(typeof reportError, 'function');
  assert.deepEqual(restOptions, { initialAuthToken: 'runtime-token' });
});
