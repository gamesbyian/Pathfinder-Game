/**
 * Offline-only result cache for solver batch tooling, keyed by CODE IDENTITY (a hash of the
 * relevant solver source files), not by search state. Never touches modules/solver/orchestration.ts
 * or any production/live solve path — this only decides, in scripts/portfolio-solve-sweep.mjs,
 * whether to skip re-solving a level that a compiled baseline already recorded as unsolved.
 *
 * Design constraint (safety, not just performance): this cache is ONLY ever allowed to reuse a
 * NEGATIVE (still-unsolved) outcome from a prior baseline run — it never fabricates a "solved"
 * result. A level is skippable only when (a) the baseline record says ok:false for it, and
 * (b) every attempt family relevant to that level (per the CURRENT code's own
 * getConfiguredAttemptConfigs, not a hardcoded guess) has an unchanged dependency-file hash since
 * the hash was last recorded. Any file change anywhere in ORCHESTRATION_FILES invalidates EVERY
 * family at once (scheduling/budget-sharing logic can change any family's effective outcome even
 * if that family's own technique file is untouched) — over-invalidating is the safe direction of
 * error; under-invalidating could silently hide a real fix behind a stale "still unsolved" skip.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const SOLVER_DIR = path.join(root, 'modules', 'solver');

/** Read by every family's hash (see the module docstring): a change here can alter any family's
 *  observed outcome regardless of which technique file also changed. Keep in sync by hand when
 *  orchestration.ts's scheduling logic grows new dependencies — an omission here is the ONE way
 *  this cache could under-invalidate, so err toward including a file, not excluding it. */
const ORCHESTRATION_FILES = ['orchestration.ts', 'attempts.ts', 'policy.ts', 'prep.ts'];

/** Attempt-family -> the technique-specific files (beyond ORCHESTRATION_FILES, always included)
 *  that determine whether that family's attempts behave differently. */
const FAMILY_FILES = {
    'dfs-beam': ['search.ts', 'search-state.ts', 'move-rules.ts', 'step-processor.ts', 'path-state.ts', 'lower-bounds.ts'],
    repair: ['repair-search.ts'],
};

export const FAMILY_NAMES = Object.keys(FAMILY_FILES);

function hashFiles(files) {
    const hash = createHash('sha256');
    for (const f of [...new Set(files)].sort()) {
        const p = path.join(SOLVER_DIR, f);
        hash.update(f);
        hash.update(existsSync(p) ? readFileSync(p) : Buffer.from('__missing__'));
    }
    return hash.digest('hex').slice(0, 16);
}

/** { 'dfs-beam', repair } — each a short content hash that already folds in ORCHESTRATION_FILES,
 *  so a single per-family comparison is sufficient (no caller needs a separate orchestration
 *  check). */
export function computeCurrentFamilyHashes() {
    const hashes = {};
    for (const [family, files] of Object.entries(FAMILY_FILES)) {
        hashes[family] = hashFiles([...ORCHESTRATION_FILES, ...files]);
    }
    return hashes;
}

export function loadFamilyCache(cachePath) {
    if (!existsSync(cachePath)) return null;
    try {
        const parsed = JSON.parse(readFileSync(cachePath, 'utf8'));
        return parsed && typeof parsed.hashes === 'object' ? parsed.hashes : null;
    } catch {
        return null;
    }
}

export function saveFamilyCache(cachePath, hashes) {
    writeFileSync(cachePath, JSON.stringify({ updatedAt: new Date().toISOString(), hashes }, null, 2) + '\n');
}

/** Which attempt families are relevant (would actually be tried) for this level, using the
 *  CURRENT code's own policy — never a hand-rolled reimplementation of needsRepairFallback, so
 *  this can't drift from what solveLevel would really do. `getConfiguredAttemptConfigs` needs
 *  only the normalized level (no prep/search state). */
export function relevantFamiliesFor(level, getConfiguredAttemptConfigs) {
    const configs = getConfiguredAttemptConfigs(level, null);
    const families = new Set(['dfs-beam']);
    if (configs.some(c => c.repair)) families.add('repair');
    return families;
}

/** True iff every family in `families` has an identical hash in both `previousHashes` and
 *  `currentHashes` — i.e. nothing this level's solve would touch has changed since the cache was
 *  last written. `previousHashes` null (no prior cache) always returns false: a cache miss must
 *  never be treated as "unchanged". */
export function familiesUnchanged(families, previousHashes, currentHashes) {
    if (!previousHashes) return false;
    for (const family of families) {
        if (previousHashes[family] !== currentHashes[family]) return false;
    }
    return true;
}
