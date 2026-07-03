#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { readLevelsWithHints, writeLevelsWithHints } from './level-data-io.mjs';
import { writeHeatmapsFile } from './generate-level-heatmaps.mjs';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const levelsJsonPath = path.join(repoRoot, 'data', 'levels.json');
const heatmapsJsonPath = path.join(repoRoot, 'data', 'level-heatmaps.json');
const firebaseConfigPath = path.join(repoRoot, 'firebase-config.js');

function loadRawLevels() {
  return readLevelsWithHints(levelsJsonPath);
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
  writeLevelsWithHints(levelsJsonPath, levels.map(normalizeLevel));
}

const MAX_HINTS_PER_LEVEL = 1000;
const hintSignature = hint => (Array.isArray(hint) ? hint.join(',') : JSON.stringify(hint));

/** Append hints from `incoming` that aren't already on `target` (dedupe by path signature), up to the
 *  per-level cap. Mutates `target.hints` in place; returns how many were added. Never reorders. */
function mergeNewHints(target, incoming) {
  if (!Array.isArray(target.hints)) target.hints = [];
  const seen = new Set(target.hints.map(hintSignature));
  let added = 0;
  for (const hint of Array.isArray(incoming.hints) ? incoming.hints : []) {
    if (target.hints.length >= MAX_HINTS_PER_LEVEL) break;
    const sig = hintSignature(hint);
    if (seen.has(sig)) continue;
    seen.add(sig);
    target.hints.push(hint);
    added++;
  }
  return added;
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
  const levels = loadRawLevels().map(normalizeLevel);
  // Fingerprint → existing level object (structural fingerprint ignores hints/metadata), so a
  // published level that already exists is matched and its NEW hints merged in, rather than
  // re-appended as a duplicate level. Existing levels keep their position (no reordering).
  const byFingerprint = new Map(levels.map(level => [fingerprint(level), level]));

  let newLevels = 0, hintsAdded = 0, levelsUpdated = 0;
  for (const level of await fetchPublishedLevels()) {
    const fp = fingerprint(level);
    const match = byFingerprint.get(fp);
    if (match) {
      const added = mergeNewHints(match, level);
      if (added > 0) { hintsAdded += added; levelsUpdated++; }
    } else {
      byFingerprint.set(fp, level);
      levels.push(level);
      newLevels++;
    }
  }
  writeLevels(levels);
  console.log(`Imported ${newLevels} new published level(s); appended ${hintsAdded} new hint(s) to ${levelsUpdated} existing level(s).`);

  if (newLevels > 0 || hintsAdded > 0) {
    const written = loadRawLevels();
    const output = writeHeatmapsFile(written, heatmapsJsonPath);
    console.log(`Updated heat maps for ${output.levels.length} levels in data/level-heatmaps.json.`);
  }
}

main().catch(err => {
  console.error(err?.message || err);
  process.exit(1);
});
