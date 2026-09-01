#!/usr/bin/env node
/**
 * Characterization tests for firestore.rules.
 *
 * These fast tests intentionally inspect the source-rule contract directly. The
 * repository also has an emulator-backed identity-boundary proof for the rating,
 * submission, and local-hint repositories; keep this structural suite as the cheap
 * authorization smoke layer rather than treating it as the persistence-boundary proof.
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

// Admin access prefers a deployment-managed custom claim (`admin: true`), with the legacy
// hard-coded email kept as a transitional fallback (no-lockout migration; §4 Phase 2). Locking
// the exact shape here prevents accidental widening and documents the migration target.
test('admin helper requires auth and accepts the admin custom claim or the legacy email', () => {
  assertRule(
    /function isAdmin\(\) \{ return request\.auth != null && \(request\.auth\.token\.admin == true \|\| request\.auth\.token\.email == 'ianmakesjokes@gmail\.com'\); \}/,
    'isAdmin() must require auth and accept token.admin==true OR the legacy admin email',
  );
});

test('admin helper still requires authentication (never grants anonymous admin)', () => {
  // Every privileged path keys off isAdmin(), which is guarded by `request.auth != null`.
  assertRule(
    /function isAdmin\(\) \{ return request\.auth != null &&/,
    'isAdmin() must short-circuit on unauthenticated requests',
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

test('level ratings are public-read and admin-write', () => {
  assertRule(
    /match \/artifacts\/\{appId\}\/level_ratings\/\{fingerprint\} \{ allow read: if true; allow write: if isAdmin\(\); \}/,
    'level ratings must remain public-read and admin-write',
  );
});

test('local level hints are public-read and any-authenticated-user create-only', () => {
  assertRule(
    /match \/artifacts\/\{appId\}\/local_level_hints\/\{fingerprint\}\/entries\/\{entryId\} \{ allow read: if true;/,
    'local level hints must remain public-read',
  );
  assertRule(
    /local_level_hints\/\{fingerprint\}\/entries\/\{entryId\} \{[^}]*allow create: if request\.auth != null/,
    'local level hint entries must require authentication (anonymous auth included) to create',
  );
  assertRule(
    /local_level_hints\/\{fingerprint\}\/entries\/\{entryId\} \{[^}]*allow update, delete: if false;/,
    'local level hint entries must be immutable once created (no update/delete)',
  );
});

test('local level hint creation validates document shape and caps path size', () => {
  assertRule(
    /request\.resource\.data\.keys\(\)\.hasOnly\(\['path', 'pathSignature', 'provenance', 'createdAt'\]\)/,
    'local level hint create must restrict the document to its expected fields',
  );
  assertRule(
    /request\.resource\.data\.pathSignature is string/,
    'local level hint create must require a pathSignature field',
  );
  assertRule(
    /request\.resource\.data\.path\.size\(\) <= 500/,
    'local level hint create must cap path size against abuse',
  );
});

// ── Negative cases (modernization-plan §4 Phase 2): assert the rules can't be widened into
// anonymous or cross-user writes at the source level. These complement, rather than replace,
// the repository/emulator boundary test.

test('no collection grants an unconditional write/create/delete (no `if true` writes)', () => {
  // Public *reads* are intentional (published_levels, level_ratings, local_level_hints);
  // public *writes* are not — local_level_hints' create still requires request.auth != null.
  const writeIfTrue = /allow (?:write|create|delete|update)[^;]*:\s*if true\b/;
  assert.doesNotMatch(compact, writeIfTrue, 'no write/create/delete/update may be `if true`');
});

test('public reads are limited to published_levels, level_ratings, and local_level_hints', () => {
  // Count `allow read: if true;` occurrences — must be exactly the three public collections.
  const publicReads = compact.match(/allow read: if true;/g) || [];
  assert.equal(publicReads.length, 3, 'exactly three collections may be public-read (published_levels, level_ratings, local_level_hints)');
});

test('user data and submission writes are never granted by mere authentication', () => {
  // User data requires uid match (not just auth); submissions require submittedBy == uid.
  assert.doesNotMatch(
    compact,
    /users\/\{uid\}\/data\/\{doc\} \{ allow read, write: if request\.auth != null; \}/,
    'user data must require uid match, not bare authentication',
  );
  assert.match(
    compact,
    /submissions\/\{submissionId\} \{[^}]*allow create: if request\.auth != null && request\.resource\.data\.submittedBy == request\.auth\.uid;/,
    'submission create must bind the document to the creating uid',
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
