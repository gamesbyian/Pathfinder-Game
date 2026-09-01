#!/usr/bin/env node
// Retrieves Dev Mode level ratings/tags from Firestore and prints a report.
//
// The `level_ratings` collection is public-read / admin-write (see
// firestore.rules) — same pattern as scripts/import-published-levels.mjs's
// `published_levels` collection — so FIREBASE_BEARER_TOKEN is optional.
//
// Usage:
//   npm run levels:ratings-report
//   npm run levels:ratings-report -- --json
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const firebaseConfigPath = path.join(repoRoot, 'firebase-config.js');

function loadFirebaseConfig() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(firebaseConfigPath, 'utf8'), sandbox, { filename: firebaseConfigPath });
  return {
    config: JSON.parse(sandbox.window.__firebase_config || '{}'),
    appId: sandbox.window.__app_id || 'pathfinder-standalone'
  };
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== 'object') return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return !!value.booleanValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeFirestoreValue);
  if ('mapValue' in value) return decodeFirestoreFields(value.mapValue.fields || {});
  return undefined;
}

function decodeFirestoreFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, decodeFirestoreValue(value)]));
}

async function fetchLevelRatings() {
  const { config, appId } = loadFirebaseConfig();
  if (!config.projectId || !config.apiKey) throw new Error('firebase-config.js is missing projectId or apiKey.');
  const url = new URL(`https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/artifacts/${appId}/level_ratings`);
  url.searchParams.set('key', config.apiKey);
  const headers = process.env.FIREBASE_BEARER_TOKEN ? { Authorization: `Bearer ${process.env.FIREBASE_BEARER_TOKEN}` } : {};
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Firestore REST request failed (${res.status}): ${await res.text()}`);
  const payload = await res.json();
  return (payload.documents || []).map(doc => {
    const fields = decodeFirestoreFields(doc.fields || {});
    const levelFingerprint = doc.name.split('/').pop();
    return {
      levelFingerprint,
      levelNumber: fields.levelNumber ?? null,
      tags: Array.isArray(fields.tags) ? fields.tags : [],
      customTags: Array.isArray(fields.customTags) ? fields.customTags : [],
      difficulty: Number(fields.difficulty) || 0,
      fun: Number(fields.fun) || 0,
      updatedAt: fields.updatedAt ?? null,
    };
  });
}

function printReport(ratings, { json = false } = {}) {
  if (json) {
    console.log(JSON.stringify(ratings, null, 2));
    return;
  }
  if (!ratings.length) {
    console.log('No level ratings found.');
    return;
  }
  const sorted = [...ratings].sort((a, b) => (a.levelNumber ?? Infinity) - (b.levelNumber ?? Infinity));
  for (const r of sorted) {
    const allTags = [...r.tags, ...r.customTags];
    const label = r.levelNumber !== null ? `Level ${r.levelNumber}` : `(no level #) ${r.levelFingerprint}`;
    console.log(`${label}: difficulty=${r.difficulty || '-'} fun=${r.fun || '-'} tags=[${allTags.join(', ')}]`);
  }
  console.log(`\n${ratings.length} rated level(s).`);
}

async function main() {
  const json = process.argv.includes('--json');
  const ratings = await fetchLevelRatings();
  printReport(ratings, { json });
}

main().catch(err => {
  console.error(err?.message || err);
  process.exit(1);
});
