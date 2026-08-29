#!/usr/bin/env node
/**
 * Shared "a solve produced a path — record it with provenance" logic.
 *
 * WHY THIS IS A SHARED MODULE AND NOT COPY-PASTED
 *
 *   Getting a hint saved correctly means getting five things right together: build provenance via
 *   the canonical `provenanceFromSolveResult` (never hand-rolled), stamp `levelRevision` from
 *   `getLevelFingerprint` — NOT `getLevelFingerprintSource`, see CLAUDE.md's provenance section —
 *   merge via `mergeHints` so a rediscovered path appends an entry instead of duplicating or being
 *   dropped, keep the dual `hints`/`hintRecords` fields in step, and write through
 *   `writeLevelsWithHints`. Every one of those has a documented past bug behind it.
 *
 *   This repo has already been bitten twice this month by a second hand-maintained copy of a
 *   solver-adjacent projection drifting from the first (scripts/stress/benchmark.mjs's attempt
 *   whitelist silently lost repairTurnBiased, then the admissible-order flags). A second copy of
 *   the hint-merge path would be the same mistake with higher stakes, since its failure mode is
 *   silently-wrong persisted provenance rather than a missing report column.
 *
 *   Kept separate from portfolio-solve-sweep-lib.mjs deliberately: that module is documented as
 *   pure JS with no Solver dependency so it can run under plain node, and this one necessarily
 *   imports from modules/ (so its callers must run through run-bundled.mjs).
 *
 * Usage:
 *   const capture = await createHintCapture({ solverVersion, budgetMs });
 *   await capture.prepare(levels);                  // precompute level revisions
 *   capture.record(level, result);                  // per solved level
 *   const summary = capture.flush(levelsJsonPath, levels);
 */

import { provenanceEventIdentity } from './hint-provenance-identity.mjs';

/** Loads the solver-side helpers. Async because these are TS modules resolved by the bundler.
 *  `isolatedTechnique`: true iff every result passed to `record()` comes from running ONE
 *  technique in isolation rather than the real, full, competitively-budgeted solveLevel()
 *  production ladder (e.g. technique-census tooling) — see
 *  modules/domain/hint-types.ts's HintContextProvenance.isolatedTechnique for why this must be
 *  set correctly: an isolated technique can solve a level the real ladder cannot, so persisting
 *  its find without this flag would misrepresent it as ordinary production-solver capability
 *  evidence (docs/solver-optimization-workstreams.md's Priority 0). Defaults false — every
 *  existing caller (portfolio-solve-sweep.mjs) already runs the real ladder. */
export async function createHintCapture({ solverVersion, budgetMs, enabled = true, isolatedTechnique = false }) {
    if (!enabled) {
        return {
            enabled: false,
            async prepare() {},
            record: () => false,
            flush: () => ({ levelsTouched: 0, hintFilesChanged: 0, newPaths: 0, rediscoveries: 0 }),
        };
    }

    const { provenanceFromSolveResult } = await import('../modules/solver/hint-provenance.js');
    const { toHint, mergeHints, hintPaths } = await import('../modules/domain/hint-types.js');
    const { getLevelFingerprint } = await import('../modules/domain/level-fingerprint.js');
    const { writeLevelsWithHints } = await import('./level-data-io.mjs');

    /** level object -> its shape fingerprint, so a stored hint can't silently keep pointing at a
     *  since-edited level. Precomputed because getLevelFingerprint is async while `record` is
     *  called from synchronous result callbacks. */
    const levelRevisions = new Map();
    let newPaths = 0;
    let rediscoveries = 0;
    const touched = new Set();

    return {
        enabled: true,

        async prepare(levels) {
            await Promise.all(levels.map(async (level) => {
                if (level) levelRevisions.set(level, await getLevelFingerprint(level));
            }));
        },

        /**
         * Records one solved result against its level. Returns true when the on-disk artifact would
         * change — either a genuinely new path, or a new provenance entry on a path already known
         * (a rediscovery, which is NOT a no-op: it is what gives hint-cost-drift.mjs a comparable
         * measurement at this commit).
         */
        record(level, result) {
            if (!level || !result?.ok || !Array.isArray(result.solution) || result.solution.length === 0) return false;
            const provenance = provenanceFromSolveResult(result, {
                solverVersion,
                budgetMs,
                usedExistingHints: false,
                randomSeed: null,
                levelRevision: levelRevisions.get(level) ?? null,
                isolatedTechnique,
            });
            const before = level.hintRecords ?? [];
            const beforeCount = before.length;
            const signature = result.solution.join(',');
            const existing = before.find(h => h.path.join(',') === signature);
            const beforeEntries = existing?.provenance.length ?? 0;

            // Refuse to append an entry that duplicates one already stored. Without this, re-running
            // the capture at the SAME commit (a re-triggered workflow, a retried job, a local repeat)
            // appends an identical entry every time — the exact shape that had to be cleaned up
            // retroactively by dedupe-hint-provenance.mjs. Prevented at the source instead.
            if (existing?.provenance?.some(e => provenanceEventIdentity(e) === provenanceEventIdentity(provenance))) {
                return false;
            }

            level.hintRecords = mergeHints(before, [toHint(result.solution, [provenance])]);
            level.hints = hintPaths(level.hintRecords);

            const afterEntries = level.hintRecords.find(h => h.path.join(',') === signature)?.provenance.length ?? 0;
            if (level.hintRecords.length !== beforeCount) { newPaths++; touched.add(level); return true; }
            if (afterEntries > beforeEntries) { rediscoveries++; touched.add(level); return true; }
            return false;
        },

        flush(levelsJsonPath, levels) {
            if (touched.size === 0) return { levelsTouched: 0, hintFilesChanged: 0, newPaths, rediscoveries };
            const { hintFilesChanged } = writeLevelsWithHints(levelsJsonPath, levels);
            return { levelsTouched: touched.size, hintFilesChanged, newPaths, rediscoveries };
        },
    };
}
