#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const levelsPath = path.join(repoRoot, 'levels.js');
const firebaseConfigPath = path.join(repoRoot, 'firebase-config.js');

function loadRawLevels() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(levelsPath, 'utf8'), sandbox, { filename: levelsPath });
  return Array.isArray(sandbox.window.RAW_LEVELS) ? sandbox.window.RAW_LEVELS : [];
}

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

function decodeHints(level) {
  if (!Array.isArray(level?.hints)) return level;
  return { ...level, hints: level.hints.map(hint => typeof hint === 'string' ? JSON.parse(hint) : hint) };
}

function normalizeLevel(level) {
  const clone = JSON.parse(JSON.stringify(decodeHints(level || {})));
  clone.designerName = typeof clone.designerName === 'string' ? clone.designerName : '';
  clone.description = typeof clone.description === 'string' ? clone.description : '';
  clone.difficulty = clone.difficulty === undefined || clone.difficulty === '' ? null : clone.difficulty;
  if (!Array.isArray(clone.hints)) clone.hints = [];
  return clone;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function fingerprint(level) {
  const comparable = normalizeLevel(level);
  delete comparable.hints;
  delete comparable.designerName;
  delete comparable.description;
  delete comparable.difficulty;
  return stableStringify(comparable);
}

function writeLevels(levels) {
  const lines = ['window.RAW_LEVELS = ['];
  levels.forEach((level, index) => {
    lines.push(`    /* ${index + 1} */ ${JSON.stringify(normalizeLevel(level))}${index === levels.length - 1 ? '' : ','}`);
  });
  lines.push('];', '');
  fs.writeFileSync(levelsPath, lines.join('\n'));
}

async function fetchPublishedLevels() {
  const { config, appId } = loadFirebaseConfig();
  if (!config.projectId || !config.apiKey) throw new Error('firebase-config.js is missing projectId or apiKey.');
  const url = new URL(`https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/artifacts/${appId}/published_levels`);
  url.searchParams.set('key', config.apiKey);
  url.searchParams.set('orderBy', 'sortOrder');
  const headers = process.env.FIREBASE_BEARER_TOKEN ? { Authorization: `Bearer ${process.env.FIREBASE_BEARER_TOKEN}` } : {};
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Firestore REST request failed (${res.status}): ${await res.text()}`);
  const payload = await res.json();
  return (payload.documents || [])
    .map(doc => decodeFirestoreFields(doc.fields || {}).levelData)
    .filter(Boolean)
    .map(normalizeLevel);
}

async function main() {
  const existing = loadRawLevels().map(normalizeLevel);
  const seen = new Set(existing.map(fingerprint));
  const additions = [];
  for (const level of await fetchPublishedLevels()) {
    const fp = fingerprint(level);
    if (!seen.has(fp)) {
      seen.add(fp);
      additions.push(level);
    }
  }
  writeLevels([...existing, ...additions]);
  console.log(`Imported ${additions.length} new published level(s) from Firestore into levels.js.`);
}

main().catch(err => {
  console.error(err?.message || err);
  process.exit(1);
});
