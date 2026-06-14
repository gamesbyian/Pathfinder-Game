#!/usr/bin/env node
/**
 * Characterization tests for firestore.rules.
 *
 * These tests intentionally avoid a Firebase emulator dependency. They lock the
 * current access model at the source-rule level so future authorization changes
 * are explicit and reviewed. If the project later adds @firebase/rules-unit-testing
 * and an emulator-backed suite, keep these as fast structural smoke tests or
 * replace them with equivalent behavioral assertions.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';

const RULES_PATH = 'firestore.rules';
const source = fs.readFileSync(RULES_PATH, 'utf8');
const compact = source.replace(/\s+/g, ' ');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assertRule(pattern, message) {
  assert.match(compact, pattern, message);
}

// Admin access is currently intentionally narrow and hard-coded. This is not the
// desired long-term design, but locking it here prevents accidental widening while
// the codebase moves toward custom claims or an allowlist.
test('admin helper requires auth and the current admin email', () => {
  assertRule(
    /function isAdmin\(\) \{ return request\.auth != null && request\.auth\.token\.email == 'ianmakesjokes@gmail\.com'; \}/,
    'isAdmin() must require auth and match the current admin email exactly',
  );
});

test('user data is isolated to the authenticated uid', () => {
  assertRule(
    /match \/artifacts\/\{appId\}\/users\/\{uid\}\/data\/\{doc\} \{ allow read, write: if request\.auth != null && request\.auth\.uid == uid; \}/,
    'user data rule must require request.auth.uid == uid',
  );
});

test('submissions can only be created by their submittedBy user', () => {
  assertRule(
    /match \/artifacts\/\{appId\}\/submissions\/\{submissionId\} \{[^}]*allow create: if request\.auth != null && request\.resource\.data\.submittedBy == request\.auth\.uid;/,
    'submission create rule must require auth and submittedBy == auth uid',
  );
});

test('authenticated users can read submissions for duplicate detection', () => {
  assertRule(
    /match \/artifacts\/\{appId\}\/submissions\/\{submissionId\} \{[^}]*allow read: if request\.auth != null;/,
    'submission read rule must require authentication',
  );
});

test('only admins can delete submissions and updates are disabled', () => {
  assertRule(
    /match \/artifacts\/\{appId\}\/submissions\/\{submissionId\} \{[^}]*allow delete: if isAdmin\(\);[^}]*allow update: if false;/,
    'submission delete/update rules must stay admin-only/delete and update-disabled',
  );
});

test('published levels are public-read and admin-write', () => {
  assertRule(
    /match \/artifacts\/\{appId\}\/published_levels\/\{levelId\} \{ allow read: if true; allow write: if isAdmin\(\); \}/,
    'published levels must remain public-read and admin-write',
  );
});

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${error.message}`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`\nFirestore rules tests: ${passed} passed, ${failed} failed`);
  process.exit(1);
}

console.log(`\nFirestore rules tests: ${passed} passed, ${failed} failed`);
