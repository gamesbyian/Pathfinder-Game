#!/usr/bin/env node
/**
 * Old->new technique-census temporal stability join.
 *
 * Compares two already-generated level-capability.json artifacts (one older, one refreshed) by
 * normalized level identity and normalized attempt identity, and reports per-action solve-set
 * movement plus per-level support-class movement. Rebuildable: intended to run again after any
 * future census refresh, not a one-off.
 *
 * Development/observational evidence only. Aggregate capability stability and per-action/per-level
 * capability-OWNERSHIP stability are reported separately on purpose -- see
 * reports/2026-09-04-technique-census-refresh-direct-analysis-rejoin.md for why the distinction
 * matters (aggregate oracle union can look almost flat while which action/level supplies that
 * capability moves substantially).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeAttemptIdentityKey } from '../modules/solver/attempt-identity.mjs';

const DEFAULT_OLD = 'reports/stress/technique-niches/2026-09-01/level-capability.json';
const DEFAULT_FRESH = 'reports/stress/technique-niches/2026-09-03/level-capability.json';

const median = (xs) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Normalize one side's raw action rows into normalizedAction -> {raw keys, aggregate row}. */
function normalizeActionRows(actions) {
    const byNormalized = new Map();
    for (const row of actions) {
        let normalized;
        try {
            normalized = normalizeAttemptIdentityKey(row.action);
        } catch {
            // Ablation/flag-variant rows (e.g. "...+connectivity-axis-exhausted-off") are not a
            // canonical attempt identity on their own; keep them addressable under their raw key
            // rather than dropping them, and mark them explicitly non-normalizable.
            normalized = row.action;
        }
        if (!byNormalized.has(normalized)) byNormalized.set(normalized, { rawKeys: [], rows: [] });
        const entry = byNormalized.get(normalized);
        entry.rawKeys.push(row.action);
        entry.rows.push(row);
    }
    return byNormalized;
}

/** Normalize one side's per-level solvingActions arrays into normalizedAction -> Set<levelId>. */
function buildSolveSets(levels) {
    const byAction = new Map();
    for (const level of levels) {
        for (const raw of level.solvingActions) {
            let normalized;
            try {
                normalized = normalizeAttemptIdentityKey(raw);
            } catch {
                normalized = raw;
            }
            if (!byAction.has(normalized)) byAction.set(normalized, new Set());
            byAction.get(normalized).add(level.levelId);
        }
    }
    return byAction;
}

function jaccard(a, b) {
    const intersection = [...a].filter((x) => b.has(x)).length;
    const union = a.size + b.size - intersection;
    return { intersection, union, jaccard: union ? intersection / union : null };
}

export function analyzeTemporalStability(oldBase, freshBase) {
    if (!Array.isArray(oldBase.levels) || !Array.isArray(freshBase.levels))
        throw new Error('Expected both bases to have a levels array.');

    const oldLevelsById = new Map(oldBase.levels.map((l) => [l.levelId, l]));
    const freshLevelsById = new Map(freshBase.levels.map((l) => [l.levelId, l]));
    const oldIds = new Set(oldLevelsById.keys());
    const freshIds = new Set(freshLevelsById.keys());
    const comparableIds = [...oldIds].filter((id) => freshIds.has(id));
    const missingFromFresh = [...oldIds].filter((id) => !freshIds.has(id));
    const missingFromOld = [...freshIds].filter((id) => !oldIds.has(id));

    const oldActionAgg = normalizeActionRows(oldBase.actions ?? []);
    const freshActionAgg = normalizeActionRows(freshBase.actions ?? []);
    const oldSolveSets = buildSolveSets(oldBase.levels);
    const freshSolveSets = buildSolveSets(freshBase.levels);

    // Ownership: a level "owned" by action A means A is that level's sole solvingActions member.
    const oldOwner = new Map(); // levelId -> normalizedAction, only for solverCount === 1
    for (const level of oldBase.levels) {
        if (level.solverCount === 1 && level.solvingActions.length === 1) {
            try { oldOwner.set(level.levelId, normalizeAttemptIdentityKey(level.solvingActions[0])); }
            catch { oldOwner.set(level.levelId, level.solvingActions[0]); }
        }
    }
    const freshOwner = new Map();
    for (const level of freshBase.levels) {
        if (level.solverCount === 1 && level.solvingActions.length === 1) {
            try { freshOwner.set(level.levelId, normalizeAttemptIdentityKey(level.solvingActions[0])); }
            catch { freshOwner.set(level.levelId, level.solvingActions[0]); }
        }
    }

    const allActionKeys = new Set([...oldActionAgg.keys(), ...freshActionAgg.keys()]);
    const actions = [...allActionKeys].sort().map((action) => {
        const oldEntry = oldActionAgg.get(action) ?? null;
        const freshEntry = freshActionAgg.get(action) ?? null;
        const oldRow = oldEntry?.rows[0] ?? null;
        const freshRow = freshEntry?.rows[0] ?? null;
        const comparable = Boolean(oldRow && freshRow);
        const nonComparableReason = comparable ? null
            : (!oldRow ? 'action absent from old census' : 'action absent from fresh census');

        const oldSet = oldSolveSets.get(action) ?? new Set();
        const freshSet = freshSolveSets.get(action) ?? new Set();
        // Restrict solve-set comparison to the comparable level universe so a level missing from
        // one side never manufactures a spurious gain/loss.
        const oldSetComparable = new Set([...oldSet].filter((id) => freshIds.has(id)));
        const freshSetComparable = new Set([...freshSet].filter((id) => oldIds.has(id)));
        const { intersection, union, jaccard: j } = jaccard(oldSetComparable, freshSetComparable);
        const gainedIds = [...freshSetComparable].filter((id) => !oldSetComparable.has(id)).sort();
        const lostIds = [...oldSetComparable].filter((id) => !freshSetComparable.has(id)).sort();

        let singletonRetained = 0, singletonGained = 0, singletonLost = 0;
        for (const id of comparableIds) {
            const ownedOld = oldOwner.get(id) === action;
            const ownedFresh = freshOwner.get(id) === action;
            if (ownedOld && ownedFresh) singletonRetained++;
            else if (!ownedOld && ownedFresh) singletonGained++;
            else if (ownedOld && !ownedFresh) singletonLost++;
        }

        return {
            action,
            oldRawKeys: oldEntry?.rawKeys ?? [],
            freshRawKeys: freshEntry?.rawKeys ?? [],
            comparable,
            nonComparableReason,
            old: oldRow ? {
                solvedLevels: oldRow.solvedLevels, exclusiveLevels: oldRow.exclusiveLevels,
                thinBoundaryLevels: oldRow.thinBoundaryLevels, productionMissWins: oldRow.productionMissWins,
                successfulNodesMedian: oldRow.successfulNodes?.median ?? null, successfulNodesP90: oldRow.successfulNodes?.p90 ?? null,
                failedNodesMedian: oldRow.failedNodes?.median ?? null, failedNodesP90: oldRow.failedNodes?.p90 ?? null,
            } : null,
            fresh: freshRow ? {
                solvedLevels: freshRow.solvedLevels, exclusiveLevels: freshRow.exclusiveLevels,
                thinBoundaryLevels: freshRow.thinBoundaryLevels, productionMissWins: freshRow.productionMissWins,
                successfulNodesMedian: freshRow.successfulNodes?.median ?? null, successfulNodesP90: freshRow.successfulNodes?.p90 ?? null,
                failedNodesMedian: freshRow.failedNodes?.median ?? null, failedNodesP90: freshRow.failedNodes?.p90 ?? null,
            } : null,
            solveSet: {
                oldCount: oldSetComparable.size, freshCount: freshSetComparable.size,
                intersection, union, jaccard: j,
                gainedCount: gainedIds.length, lostCount: lostIds.length, gainedIds, lostIds,
            },
            singletonOwnership: { retained: singletonRetained, gained: singletonGained, lost: singletonLost },
            depthMovement: comparable ? {
                successfulNodesMedianDelta: numDelta(oldRow.successfulNodes?.median, freshRow.successfulNodes?.median),
                successfulNodesP90Delta: numDelta(oldRow.successfulNodes?.p90, freshRow.successfulNodes?.p90),
                failedNodesMedianDelta: numDelta(oldRow.failedNodes?.median, freshRow.failedNodes?.median),
                failedNodesP90Delta: numDelta(oldRow.failedNodes?.p90, freshRow.failedNodes?.p90),
            } : null,
        };
    });

    // Level-side summary over the comparable universe only.
    let supportClassStable = 0, supportClassChanged = 0;
    let singletonRetained = 0, singletonGained = 0, singletonLost = 0;
    let doubletonRetained = 0, doubletonGained = 0, doubletonLost = 0;
    const solverCountDeltas = [];
    const changedLevels = [];
    for (const id of comparableIds) {
        const o = oldLevelsById.get(id), f = freshLevelsById.get(id);
        const classStable = o.isolatedOracleSolved === f.isolatedOracleSolved && o.productionSolved === f.productionSolved;
        if (classStable) supportClassStable++; else supportClassChanged++;

        if (o.singleton && f.singleton) singletonRetained++;
        else if (!o.singleton && f.singleton) singletonGained++;
        else if (o.singleton && !f.singleton) singletonLost++;

        if (o.doubleton && f.doubleton) doubletonRetained++;
        else if (!o.doubleton && f.doubleton) doubletonGained++;
        else if (o.doubleton && !f.doubleton) doubletonLost++;

        solverCountDeltas.push(f.solverCount - o.solverCount);

        let oldActionsNorm, freshActionsNorm;
        try { oldActionsNorm = new Set(o.solvingActions.map(normalizeAttemptIdentityKey)); }
        catch { oldActionsNorm = new Set(o.solvingActions); }
        try { freshActionsNorm = new Set(f.solvingActions.map(normalizeAttemptIdentityKey)); }
        catch { freshActionsNorm = new Set(f.solvingActions); }
        const retainedActions = [...oldActionsNorm].filter((a) => freshActionsNorm.has(a)).length;
        const gainedActions = [...freshActionsNorm].filter((a) => !oldActionsNorm.has(a)).length;
        const lostActions = [...oldActionsNorm].filter((a) => !freshActionsNorm.has(a)).length;

        if (!classStable || o.singleton !== f.singleton || o.doubleton !== f.doubleton) {
            changedLevels.push({
                levelId: id, corpus: f.corpus,
                oldSupport: { isolatedOracleSolved: o.isolatedOracleSolved, productionSolved: o.productionSolved, singleton: o.singleton, doubleton: o.doubleton, solverCount: o.solverCount },
                freshSupport: { isolatedOracleSolved: f.isolatedOracleSolved, productionSolved: f.productionSolved, singleton: f.singleton, doubleton: f.doubleton, solverCount: f.solverCount },
                actionsRetained: retainedActions, actionsGained: gainedActions, actionsLost: lostActions,
            });
        }
    }

    return {
        schemaVersion: 1,
        evidenceRole: 'observational-development',
        levelUniverse: {
            old: oldBase.levels.length, fresh: freshBase.levels.length,
            comparable: comparableIds.length, missingFromFresh, missingFromOld,
        },
        actions,
        levelSummary: {
            comparableLevels: comparableIds.length,
            supportClassStable, supportClassChanged,
            singleton: { retained: singletonRetained, gained: singletonGained, lost: singletonLost },
            doubleton: { retained: doubletonRetained, gained: doubletonGained, lost: doubletonLost },
            solverCountDelta: {
                mean: solverCountDeltas.length ? solverCountDeltas.reduce((a, b) => a + b, 0) / solverCountDeltas.length : null,
                median: median(solverCountDeltas),
            },
        },
        changedLevels,
    };
}

function numDelta(a, b) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return b - a;
}

function renderMarkdown(result, oldPath, freshPath) {
    const lines = [];
    lines.push('# Technique census temporal stability');
    lines.push('');
    lines.push('<!-- report-metadata: generated -->');
    lines.push('');
    lines.push(`Generated by \`scripts/analyze-technique-census-temporal-stability.mjs\` comparing \`${oldPath}\` (old) against \`${freshPath}\` (fresh).`);
    lines.push('');
    lines.push('Development/observational re-analysis of two already-collected census-derived capability artifacts. Not a controlled confirmation of either snapshot.');
    lines.push('');
    lines.push('## Level universe');
    lines.push('');
    lines.push(`old: ${result.levelUniverse.old}, fresh: ${result.levelUniverse.fresh}, comparable: ${result.levelUniverse.comparable}, missing from fresh: ${result.levelUniverse.missingFromFresh.length}, missing from old: ${result.levelUniverse.missingFromOld.length}`);
    lines.push('');
    lines.push('## Level-side summary (comparable universe)');
    lines.push('');
    const ls = result.levelSummary;
    lines.push('| metric | value |');
    lines.push('|---|---:|');
    lines.push(`| comparable levels | ${ls.comparableLevels} |`);
    lines.push(`| support class stable | ${ls.supportClassStable} |`);
    lines.push(`| support class changed | ${ls.supportClassChanged} |`);
    lines.push(`| singleton retained/gained/lost | ${ls.singleton.retained} / ${ls.singleton.gained} / ${ls.singleton.lost} |`);
    lines.push(`| doubleton retained/gained/lost | ${ls.doubleton.retained} / ${ls.doubleton.gained} / ${ls.doubleton.lost} |`);
    lines.push(`| solver-count delta (fresh - old) mean/median | ${ls.solverCountDelta.mean?.toFixed(3)} / ${ls.solverCountDelta.median} |`);
    lines.push('');
    lines.push(`${result.changedLevels.length} levels changed support class or singleton/doubleton status (see JSON \`changedLevels\` for the full per-level table).`);
    lines.push('');
    lines.push('## Per-action stability (comparable actions only, sorted by |Jaccard change is not computed; sorted by fresh solvedLevels desc|)');
    lines.push('');
    lines.push('| action | old solved | fresh solved | Jaccard | gained | lost | old excl. | fresh excl. | singleton ret/gain/lost | succ. node median old->fresh |');
    lines.push('|---|---:|---:|---:|---:|---:|---:|---:|---|---|');
    const comparableActions = result.actions.filter((a) => a.comparable).sort((a, b) => (b.fresh.solvedLevels) - (a.fresh.solvedLevels));
    for (const a of comparableActions) {
        lines.push(`| \`${a.action}\` | ${a.old.solvedLevels} | ${a.fresh.solvedLevels} | ${a.solveSet.jaccard?.toFixed(3) ?? '—'} | ${a.solveSet.gainedCount} | ${a.solveSet.lostCount} | ${a.old.exclusiveLevels} | ${a.fresh.exclusiveLevels} | ${a.singletonOwnership.retained}/${a.singletonOwnership.gained}/${a.singletonOwnership.lost} | ${a.old.successfulNodesMedian ?? '—'} -> ${a.fresh.successfulNodesMedian ?? '—'} |`);
    }
    const nonComparable = result.actions.filter((a) => !a.comparable);
    if (nonComparable.length) {
        lines.push('');
        lines.push('Non-comparable action rows (present on only one side):');
        lines.push('');
        for (const a of nonComparable) lines.push(`- \`${a.action}\`: ${a.nonComparableReason}`);
    }
    lines.push('');
    return lines.join('\n') + '\n';
}

function main() {
    const args = new Map(process.argv.slice(2).map((arg) => arg.split('=', 2)));
    const oldPath = args.get('--old') ?? DEFAULT_OLD;
    const freshPath = args.get('--fresh') ?? DEFAULT_FRESH;
    const jsonOut = args.get('--out') ?? 'reports/stress/technique-niches/2026-09-03/temporal-stability.json';
    const mdOut = args.get('--summary-out') ?? jsonOut.replace(/\.json$/u, '.md');
    const check = process.argv.includes('--check');

    const oldBase = JSON.parse(readFileSync(oldPath, 'utf8'));
    const freshBase = JSON.parse(readFileSync(freshPath, 'utf8'));
    const result = analyzeTemporalStability(oldBase, freshBase);
    const json = JSON.stringify(result, null, 2) + '\n';
    const markdown = renderMarkdown(result, oldPath, freshPath);

    if (check) {
        const stale = [[jsonOut, json], [mdOut, markdown]]
            .filter(([file, expected]) => { try { return readFileSync(file, 'utf8') !== expected; } catch { return true; } })
            .map(([file]) => file);
        if (stale.length) throw new Error(`Stale temporal-stability generated output: ${stale.join(', ')}`);
        console.log(`Temporal stability outputs are current (${result.levelUniverse.comparable} comparable levels, ${result.actions.length} actions)`);
        return;
    }

    writeFileSync(jsonOut, json);
    writeFileSync(mdOut, markdown);
    console.log(`Wrote ${jsonOut} and ${mdOut}: ${result.levelUniverse.comparable} comparable levels, ${result.actions.length} actions`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
