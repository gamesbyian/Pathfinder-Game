#!/usr/bin/env node
/**
 * Unit tests for persistence composition boundaries.
 *
 * These keep Firebase/browser-global access injectable so tests and future ESM SDK
 * migration work can construct persistence without relying on compat globals.
 */
import assert from 'node:assert/strict';
import { createPersistence } from '../modules/persistence.js';
import { createFirebaseClient } from '../modules/persistence/firebase-client.js';
import { getFirebaseRuntimeConfig } from '../modules/persistence/firebase-runtime-config.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${error.stack || error.message}`);
    failed += 1;
  }
}

test('createPersistence accepts injected Firebase config, app id, and client factory', () => {
  const calls = [];
  const fakeClient = {
    appId: 'unit-app',
    auth: null,
    db: null,
    hasConfig: true,
    initAuth: () => {},
  };
  const persistence = createPersistence({
    getState: () => ({ runtime: { currentTheme: 'classic' }, levelIdx: 0 }),
    getTheme: (id) => (id === 'classic' ? { id } : null),
    getRawLevels: () => [{ id: 'level-1' }],
    onProgressChanged: () => {},
    firebaseConfigRaw: '{"projectId":"unit"}',
    appId: 'unit-app',
    firebaseClientOptions: { firebaseApi: 'api' },
    getRuntimeConfig: () => ({ initialAuthToken: 'runtime-token', appId: 'runtime-app', firebaseConfigRaw: '{}' }),
    createClient: (firebaseConfigRaw, appId, options) => {
      calls.push({ firebaseConfigRaw, appId, options });
      return fakeClient;
    },
  });

  assert.deepEqual(calls, [{ firebaseConfigRaw: '{"projectId":"unit"}', appId: 'unit-app', options: { firebaseApi: 'api', initialAuthToken: 'runtime-token' } }]);
  assert.equal(persistence.hasConfig, true);
  assert.equal(persistence.getCurrentUser(), undefined);
  assert.equal(typeof persistence.persistSessionState, 'function');
  assert.equal(typeof persistence.submitLevel, 'function');
});



test('createFirebaseClient accepts injected Firebase API and auth token', async () => {
  const calls = [];
  const provider = function GoogleAuthProvider() {};
  const timestamp = { sentinel: 'server-time' };
  const auth = {
    currentUser: null,
    signInWithCustomToken: async (token) => { calls.push(['customToken', token]); },
    signInAnonymously: async () => { calls.push(['anonymous']); },
    onAuthStateChanged: () => () => {},
  };
  const db = { settings: (settings) => calls.push(['settings', settings]) };
  const firebaseApi = {
    initializeApp: (config) => calls.push(['initializeApp', config]),
    auth: () => auth,
    firestore: () => db,
  };
  firebaseApi.auth.GoogleAuthProvider = provider;
  firebaseApi.firestore.FieldValue = { serverTimestamp: () => timestamp };

  const client = createFirebaseClient('{"projectId":"unit"}', 'unit-app', {
    firebaseApi,
    initialAuthToken: 'token-123',
  });

  await client.initAuth();
  assert.equal(client.auth, auth);
  assert.equal(client.db, db);
  assert.equal(client.hasConfig, true);
  assert.ok(client.createGoogleAuthProvider() instanceof provider);
  assert.equal(client.serverTimestamp(), timestamp);
  assert.deepEqual(calls[0], ['initializeApp', { projectId: 'unit' }]);
  assert.equal(calls.some(([kind, token]) => kind === 'customToken' && token === 'token-123'), true);
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
  const calls = [];
  createPersistence({
    getState: () => ({ runtime: { currentTheme: 'classic' }, levelIdx: 0 }),
    getTheme: () => ({}),
    getRawLevels: () => [],
    onProgressChanged: () => {},
    getRuntimeConfig: () => ({ firebaseConfigRaw: '{"projectId":"runtime"}', appId: 'runtime-app', initialAuthToken: 'runtime-token' }),
    createClient: (firebaseConfigRaw, appId, options) => {
      calls.push({ firebaseConfigRaw, appId, options });
      return { appId, auth: null, db: null, hasConfig: true, initAuth: () => {} };
    },
  });
  assert.deepEqual(calls, [{
    firebaseConfigRaw: '{"projectId":"runtime"}',
    appId: 'runtime-app',
    options: { initialAuthToken: 'runtime-token' },
  }]);
});

if (failed > 0) {
  console.error(`\nPersistence tests: ${passed} passed, ${failed} failed`);
  process.exit(1);
}

console.log(`\nPersistence tests: ${passed} passed, ${failed} failed`);
