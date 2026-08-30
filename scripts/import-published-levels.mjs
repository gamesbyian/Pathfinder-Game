#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { readLevelsWithHints, writeLevelsWithHints } from './level-data-io.mjs';
import { writeHeatmapsFile } from './generate-level-heatmaps.mjs';
// Run under tsx (see package.json) so this plain-.mjs script can import the TS domain
// module directly — the same canonical, mechanics-aware fingerprint the app uses for
// submission/publish duplicate detection (modules/domain/level-fingerprint.ts). This
// script used to keep its own private structural-comparison function; that duplicate
// implementation silently disagreed with the app once fingerprinting became landmark-aware
// (v2): a landmark-only authored level and its canonically-exported form (which also
// carries the landmark's derived block/must-pass cell) fingerprint identically in the app
// but did NOT under the old local stableStringify comparison, so a republished landmark
// level would have been treated as new instead of merged.
import { getLevelFingerprintSource } from '../modules/domain/level-fingerprint.js';
import { upgradeLegacyHints, hintPaths } from '../modules/domain/hint-types.js';
import { makeProvenanceEntry, makeLevelProvenance } from '../modules/domain/level-provenance-types.js';

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

// Firestore submissions can carry hints in either shape: a bare path (`number[]`, possibly
// JSON-stringified) from before the hint-provenance dual-field pattern shipped, or a
// JSON-stringified canonical `{path, provenance}` Hint from a submission made after it (e.g. a
// hints-only resubmission via submission-controller.ts, or win-controller.ts's auto-saved win
// hint). upgradeLegacyHints() normalizes both into canonical Hint[] — reused here rather than
// hand-rolling a second parser, per CLAUDE.md's "don't hand-roll the merge elsewhere".
//
// This script carries BOTH fields of the dual-field pattern: `.hints` (bare paths, what fingerprint/
// dedup logic reads) and `.hintRecords` (canonical Hint[] WITH provenance). It used to keep only
// bare paths, which silently discarded every player-contributed hint's provenance on import (all of
// P00157+ landed with empty provenance); writeLevelsWithHints's reconcileHints then persists the
// records, so the provenance a player captured survives the round-trip. An existing on-disk level
// already has its real .hintRecords hydrated by readLevelsWithHints — keep those; only an incoming
// Firestore level (no .hintRecords) derives them from its canonical hints.
function decodeHints(level) {
  if (!Array.isArray(level?.hints)) return level;
  const raw = level.hints.map(hint => typeof hint === 'string' ? JSON.parse(hint) : hint);
  const records = Array.isArray(level.hintRecords) && level.hintRecords.length
    ? level.hintRecords
    : upgradeLegacyHints(raw);
  return { ...level, hints: hintPaths(records), hintRecords: records };
}

export function normalizeLevel(level) {
  const clone = JSON.parse(JSON.stringify(decodeHints(level || {})));
  clone.designerName = typeof clone.designerName === 'string' ? clone.designerName : '';
  clone.description = typeof clone.description === 'string' ? clone.description : '';
  clone.difficulty = clone.difficulty === undefined || clone.difficulty === '' ? null : clone.difficulty;
  if (!Array.isArray(clone.hints)) clone.hints = [];
  return clone;
}

// The canonical payload (modules/domain/level-fingerprint.ts) only reads structural/mechanical
// fields (grid, reqLen/reqInt, gates, goal, falseGoals, blocks, mustPass, mustCross, filters,
// flippingFilters, portals, geese, landmarks) — hints/designerName/description/difficulty are
// never part of it, so there is nothing to strip before fingerprinting a normalized level.
export function levelFingerprint(level) {
  return getLevelFingerprintSource(level);
}

function writeLevels(levels) {
  writeLevelsWithHints(levelsJsonPath, levels.map(normalizeLevel));
}

// Uncapped: the 1000-hint cap was a UI-latency guard for player-initiated searches, not a data
// limit. A dev/import script must not skip or truncate a level for already having many hints — it
// only avoids saving DUPLICATE paths (dedup by signature, below). Runtime/UI caps are unchanged.
const MAX_HINTS_PER_LEVEL = Infinity;
const hintSignature = hint => (Array.isArray(hint) ? hint.join(',') : JSON.stringify(hint));

export function hasProvenance(level) {
  return !!(level.provenance && Array.isArray(level.provenance.history) && level.provenance.history.length > 0);
}

// CLAUDE.md's provenance invariant ("every newly-created level must include provenance... stamped
// at the moment of creation") is normally satisfied upstream by submission-controller.ts/
// review-controller.ts before a level ever reaches published_levels. But that invariant postdates
// some real Firestore submissions still sitting in the staging collection, so a level graduating
// here can genuinely arrive with no provenance at all (2026-07-15: two such stragglers were found
// on the first live import run after this script existed) — the same situation
// scripts/backfill-level-provenance.mjs one-time-fixed for the original 156, except that script
// can't be re-run (its classifier report source is retired). Stamp the same 'unknown'/'unverified'
// tier that script used for its unclassifiable levels, rather than letting check:level-provenance
// hard-fail on every future import that happens to pull in another one.
export function ensureProvenance(level) {
  if (hasProvenance(level)) return level;
  const entry = makeProvenanceEntry('unknown', 'imported-without-provenance', {
    method: 'levels:import-published',
    detail: { reason: 'Firestore published_levels doc predates provenance stamping; no history available' },
  });
  return { ...level, provenance: makeLevelProvenance([entry], 'unverified') };
}

const PUBLISHED_ID_PREFIX = 'P';

/** A level graduating from Firestore's `published_levels` staging into the git-committed corpus
 *  gets its permanent id minted here, at the same point stress-corpus levels get theirs at
 *  generation time (see docs/archive/level-id-unification-plan.md) — never earlier, since the staging
 *  collection itself stays keyed by Firestore's own doc id + fingerprint. Mirrors
 *  scripts/stress/generate*.mjs's idCounter pattern: resumes after the highest existing numeric
 *  suffix, never reused even across deletions. Returns a mint() function so main() can assign
 *  several new ids in one run without recomputing the starting point each time. */
export function makeLevelIdMinter(existingLevels) {
  const existingIdNums = existingLevels
    .map(l => (typeof l.id === 'string' ? parseInt(l.id.replace(/\D/g, ''), 10) : NaN))
    .filter(Number.isFinite);
  const counter = { next: (existingIdNums.length ? Math.max(...existingIdNums) : 0) + 1 };
  return () => `${PUBLISHED_ID_PREFIX}${String(counter.next++).padStart(5, '0')}`;
}

/** Append hints from `incoming` that aren't already on `target` (dedupe by path signature), up to the
 *  per-level cap. Mutates BOTH `target.hints` (bare paths) and `target.hintRecords` (canonical Hint[]
 *  with provenance) in place; returns how many were added. Never reorders. Iterates the canonical
 *  records so a new hint's provenance is carried in — falling back to deriving empty-provenance
 *  records from bare `incoming.hints` when no records are present. */
export function mergeNewHints(target, incoming) {
  if (!Array.isArray(target.hints)) target.hints = [];
  if (!Array.isArray(target.hintRecords)) target.hintRecords = [];
  const seen = new Set(target.hints.map(hintSignature));
  const incomingRecords = Array.isArray(incoming.hintRecords) && incoming.hintRecords.length
    ? incoming.hintRecords
    : upgradeLegacyHints(Array.isArray(incoming.hints) ? incoming.hints : []);
  let added = 0;
  for (const rec of incomingRecords) {
    if (target.hints.length >= MAX_HINTS_PER_LEVEL) break;
    const sig = hintSignature(rec.path);
    if (seen.has(sig)) continue;
    seen.add(sig);
    target.hints.push(rec.path);
    target.hintRecords.push(rec);
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

export async function main() {
  const levels = loadRawLevels().map(normalizeLevel);
  // Fingerprint → existing level object (structural fingerprint ignores hints/metadata), so a
  // published level that already exists is matched and its NEW hints merged in, rather than
  // re-appended as a duplicate level. Existing levels keep their position (no reordering).
  const byFingerprint = new Map(levels.map(level => [levelFingerprint(level), level]));
  const mintId = makeLevelIdMinter(levels);

  let newLevels = 0, hintsAdded = 0, levelsUpdated = 0;
  for (const level of await fetchPublishedLevels()) {
    const fp = levelFingerprint(level);
    const match = byFingerprint.get(fp);
    if (match) {
      const added = mergeNewHints(match, level);
      if (added > 0) { hintsAdded += added; levelsUpdated++; }
    } else {
      // `id` first, matching the established field order (see backfill-level-ids.mjs) --
      // the Firestore staging doc itself never carries one (see makeLevelIdMinter's doc
      // comment), so this is always a fresh mint, never a preserved value.
      const withId = ensureProvenance(typeof level.id === 'string' && level.id ? level : { id: mintId(), ...level });
      byFingerprint.set(fp, withId);
      levels.push(withId);
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

// Guarded (matches generate-level-heatmaps.mjs's convention): this module now exports pure
// helpers (normalizeLevel/levelFingerprint/mergeNewHints) for unit testing, and importing it must
// never have the side effect of hitting the network / rewriting data/levels.json.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err?.message || err);
    process.exit(1);
  });
}
