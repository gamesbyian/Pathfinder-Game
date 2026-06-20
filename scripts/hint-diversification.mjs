#!/usr/bin/env node
/**
 * Ablative hint-discovery sweep. For each level, forces the solver through
 * every (gate × first-step direction) combination, cascading through
 * profile/template disables and independently testing strategy-flag
 * disables, to surface alternative valid solution paths. Novel paths
 * (not already in the level's `hints`) are appended to data/levels.json.
 *
 * See docs/hint-diversification-plan.md for the full methodology.
 *
 * Usage:
 *   node scripts/hint-diversification.mjs --levels=1-33
 *   node scripts/hint-diversification.mjs --levels=1-33 --attempt-budget-ms=4000 --output=audits/hint-discovery/batch1.json
 */
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';

const args     = process.argv.slice(2);
const argMap   = new Map(args.filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=') ?? '']; }));
const argFlags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')));

const parseLevelSpec = spec => {
    if (!spec || spec === 'all') return null;
    const set = new Set();
    for (const part of spec.split(',')) {
        const t = part.trim();
        if (t.includes('-')) {
            const [from, to] = t.split('-').map(v => Number(v.trim()));
            if (Number.isFinite(from) && Number.isFinite(to)) for (let i = Math.min(from, to); i <= Math.max(from, to); i++) set.add(i);
        } else { const n = Number(t); if (Number.isFinite(n) && n > 0) set.add(n); }
    }
    return set.size > 0 ? set : null;
};

const levelFilter      = parseLevelSpec(argMap.get('--levels'));
const attemptBudgetMs  = Number(argMap.get('--attempt-budget-ms')) > 0 ? Number(argMap.get('--attempt-budget-ms')) : 4000;
const baselineBudgetMs = Number(argMap.get('--baseline-budget-ms')) > 0 ? Number(argMap.get('--baseline-budget-ms')) : 8000;
const maxWallMs         = Number(argMap.get('--max-wall-ms')) > 0 ? Number(argMap.get('--max-wall-ms')) : 150 * 60 * 1000;
const outputFile        = argMap.get('--output') || 'audits/hint-discovery/latest.json';
const levelsJsonPath    = argMap.get('--levels-json') || 'data/levels.json';
const verbose           = argFlags.has('--verbose');
const combinedOnly      = argFlags.has('--combined-only');

// Browser stubs (mirrors scripts/run-solverv2-direct.mjs)
if (typeof globalThis.window === 'undefined')      globalThis.window      = { __PF_DISABLE_AUTO_PORTAL_VALIDATOR_DIAGNOSTICS__: true };
if (typeof globalThis.document === 'undefined')    globalThis.document    = { addEventListener(){}, getElementById: () => null, createElement: () => ({ classList: { add(){}, remove(){} }, style: {} }) };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => Date.now() };

const { createSolverV2, SOLVER_TESTING_API } = await import('../modules/SolverV2.js');
const { getAttemptConfigs } = await import('../modules/solver/attempts.js');
const { TEMPLATE_CONFIG_KEYS } = await import('../modules/solver/policy.js');
const { createState, getNeighbors } = await import('../modules/solver/search-state.js');
const { AXIS_H, AXIS_V } = await import('../modules/solver/encoding.js');
const {
    TEMPLATE_CONFIG_KEY, PROFILE_CONFIG_KEY, FEATURE_GROUPS,
    withFeaturesDisabled, withFeatureDisabled,
} = await import('./ablation-config.mjs');
const { stringifyLevelsJson } = await import('./level-json-format.mjs');

const SolverV2 = createSolverV2();
const STRATEGY_FLAGS = FEATURE_GROUPS.strategy; // 5 flags

const root = new URL('..', import.meta.url).pathname;
const levelsJsonAbs = path.join(root, levelsJsonPath);

function loadRawLevels() {
    const text = readFileSync(levelsJsonAbs, 'utf8');
    const levels = JSON.parse(text);
    if (!Array.isArray(levels) || levels.length === 0) throw new Error(`${levelsJsonPath} is empty or not an array`);
    return levels;
}

const getCommitSha = () => {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
    try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; }
};

async function atomicWriteJson(filePath, data, serialize = d => JSON.stringify(d, null, 2)) {
    const abs = path.resolve(filePath);
    const dir = path.dirname(abs);
    await mkdir(dir, { recursive: true });
    const tmp = `${abs}.tmp-${process.pid}`;
    await writeFile(tmp, `${serialize(data)}\n`);
    await rename(tmp, abs);
}

// Returns true if at least one attempt config would survive the given disable set
// for this level — mirrors applyAttemptConfigOptions' filter predicate. We need this
// check ourselves because applyAttemptConfigOptions falls back to the *unfiltered*
// base list when every config is filtered out (a safety net for production solving),
// which would otherwise make our cascade loop never terminate.
function anyConfigSurvives(level, disabledKeys) {
    const baseConfigs = getAttemptConfigs(level);
    return baseConfigs.some(c => {
        if (c.template) {
            const tKey = TEMPLATE_CONFIG_KEYS[c.template.id];
            if (tKey && disabledKeys.has(tKey)) return false;
        }
        const pKey = `PROFILE_${c.profileName}`;
        if (disabledKeys.has(pKey)) return false;
        return true;
    });
}

function enumerateDirections(gateLevel, gateKey) {
    const prep = SOLVER_TESTING_API.prepLevel(gateLevel);
    const state = createState(gateKey, gateLevel, prep);
    return getNeighbors(gateKey, state, gateLevel, prep);
}

// Scans existing hints for portal jumps (consecutive path entries where the first is a
// portal whose dest equals the second), returning the distinct set of portal destination
// keys actually proven reachable. Forcing exit-direction at a destination no hint ever
// reaches would just waste budget on infeasible (gate→portal) combinations.
function findPortalExitPoints(level, hints) {
    if (level.portalMap.size === 0) return [];
    const dests = new Set();
    for (const hint of hints) {
        for (let i = 0; i < hint.length - 1; i++) {
            const portal = level.portalMap.get(hint[i]);
            if (portal && portal.dest === hint[i + 1]) dests.add(hint[i + 1]);
        }
    }
    return [...dests];
}

// Mirrors enumerateDirections, but for a portal destination instead of a gate: a fresh
// state has lastWasPortalJump=false, which would make getNeighbors think it must force
// another jump back out (since destKey is itself registered in portalMap). Force the flag
// so getNeighbors falls through to the normal static-neighbor enumeration instead.
function enumeratePortalExitDirections(level, destKey) {
    const prep = SOLVER_TESTING_API.prepLevel(level);
    const state = createState(destKey, level, prep);
    state.lastWasPortalJump = true;
    return getNeighbors(destKey, state, level, prep);
}

// Scans hints for (start, first-step-direction, portal-destination, end) quadruples that some
// real solution proves are jointly reachable. Bounds the combined gate+direction x portal-
// exit-direction nested phases: rather than trying the full cross product of (gate x
// direction) x portalDest x portalExitDirection, only combinations with existing evidence of
// joint feasibility (a real path that starts with that gate+direction and later jumps through
// that portal destination) are tried -- then the exit DIRECTION at that point is varied
// exhaustively, since that crossing was never tested before (Phase C/E only forced the portal
// exit direction with gate+direction left free; Phase A/B/D only forced gate+direction with
// portal routing left free). `endKey` is unused by the forward phase (the level has one fixed
// goal) but is exactly what the swap-direction mirror phase needs to know which original gate
// to target as the swap-level's goal, since that's lost once the hint is reversed.
function findGatePortalTriples(level, hints) {
    if (level.portalMap.size === 0) return [];
    const seen = new Set();
    const triples = [];
    for (const hint of hints) {
        if (hint.length < 2) continue;
        const startKey = hint[0];
        const direction = hint[1];
        const endKey = hint[hint.length - 1];
        for (let i = 1; i < hint.length - 1; i++) {
            const portal = level.portalMap.get(hint[i]);
            if (!portal || portal.dest !== hint[i + 1]) continue;
            const destKey = hint[i + 1];
            const sig = `${startKey},${direction},${destKey},${endKey}`;
            if (seen.has(sig)) continue;
            seen.add(sig);
            triples.push({ startKey, direction, destKey, endKey });
        }
    }
    return triples;
}

function flipTurnDir(dir) {
    if (dir === 'left') return 'right';
    if (dir === 'right') return 'left';
    return dir; // 'either' unchanged
}

function flipAxis(ax) { return ax === AXIS_H ? AXIS_V : (ax === AXIS_V ? AXIS_H : ax); }

// Builds a gate/goal-swapped clone of `level` for reverse-direction solving: starts from
// the original goal, ends at original gate `gateKey`. Turn-direction landmark requirements
// are pre-flipped (reversing a path always flips left<->right turns at every cell — a fixed,
// deterministic transform: the cross-product sign in computeTurnDir negates under reversal).
// Flipper axis requirements are NOT a fixed transform — whether the swap-level's own
// flippingFilterMap entries should be flipped to compensate depends on the parity of how many
// distinct flippers the eventual path touches (k), which is an outcome of the search, not
// knowable in advance: leaving axes as-is is correct when k turns out odd, flipping is correct
// when k is even. Callers try both `flipFlippers` variants for levels with >=2 flippers (a
// level with <2 flippers can only ever produce k<=1, which the unflipped variant always
// handles correctly), and rely on the existing double-validation gate (validateCandidatePath
// against the *real* level) to discard whichever variant's guess doesn't match reality.
function buildSwapLevel(level, gateKey, flipFlippers) {
    const mustPassTurnDirs = new Map();
    for (const [k, dir] of level.mustPassTurnDirs) mustPassTurnDirs.set(k, flipTurnDir(dir));
    const adjacentTurnDirs = level.adjacentTurnDirs.map(flipTurnDir);
    const flippingFilterMap = flipFlippers
        ? new Map([...level.flippingFilterMap].map(([k, ax]) => [k, flipAxis(ax)]))
        : level.flippingFilterMap;
    return { ...level, gateKeys: [level.goalKey], goalKey: gateKey, mustPassTurnDirs, adjacentTurnDirs, flippingFilterMap };
}

function pathSignature(p) { return p.join(','); }

async function runCascade(gateLevel, gateKey, direction, deadlineAt, report) {
    const disabled = new Set();
    const found = [];
    let round = 0;
    while (true) {
        if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
        if (disabled.size > 0 && !anyConfigSurvives(gateLevel, disabled)) break;

        const cfg = disabled.size > 0 ? withFeaturesDisabled([...disabled]) : null;
        let result;
        try {
            result = await SolverV2.solve(gateLevel, { timeBudgetMs: attemptBudgetMs, forcedFirstStepKey: direction, ablation: cfg });
        } catch (e) {
            report.errors.push(`gate=${gateKey} dir=${direction} round=${round}: ${e?.message}`);
            break;
        }
        round++;
        if (!result?.ok || !result.solution) break;

        const winner = result.attempts?.find(a => a.ok);
        found.push({ path: result.solution, gateKey, direction, profile: winner?.profile ?? null, template: winner?.template ?? null, disabledFeatures: [...disabled] });

        const disableKey = winner?.template ? TEMPLATE_CONFIG_KEY[winner.template] : PROFILE_CONFIG_KEY[winner?.profile];
        if (!disableKey || disabled.has(disableKey)) break; // safety: can't make further progress
        disabled.add(disableKey);
    }
    return found;
}

async function runStrategyPhase(gateLevel, gateKey, direction, deadlineAt, report) {
    const found = [];
    for (const flag of STRATEGY_FLAGS) {
        if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
        let result;
        try {
            result = await SolverV2.solve(gateLevel, { timeBudgetMs: attemptBudgetMs, forcedFirstStepKey: direction, ablation: withFeatureDisabled(flag) });
        } catch (e) {
            report.errors.push(`strategy=${flag} gate=${gateKey} dir=${direction}: ${e?.message}`);
            continue;
        }
        if (result?.ok && result.solution) {
            const winner = result.attempts?.find(a => a.ok);
            found.push({ path: result.solution, gateKey, direction, profile: winner?.profile ?? null, template: winner?.template ?? null, disabledFeatures: [flag] });
        }
    }
    return found;
}

// Portal-exit-direction cascade/strategy phase. Mirrors runCascade/runStrategyPhase, but
// runs on the FULL (non-gate-restricted) level — the route TO the portal stays free; only
// the move immediately after the forced portal jump is constrained via forcedPortalExitKey.
async function runPortalCascade(level, destKey, direction, deadlineAt, report) {
    const disabled = new Set();
    const found = [];
    let round = 0;
    while (true) {
        if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
        if (disabled.size > 0 && !anyConfigSurvives(level, disabled)) break;

        const cfg = disabled.size > 0 ? withFeaturesDisabled([...disabled]) : null;
        let result;
        try {
            result = await SolverV2.solve(level, { timeBudgetMs: attemptBudgetMs, forcedPortalExitKey: { from: destKey, to: direction }, ablation: cfg });
        } catch (e) {
            report.errors.push(`portalDest=${destKey} dir=${direction} round=${round}: ${e?.message}`);
            break;
        }
        round++;
        if (!result?.ok || !result.solution) break;

        const winner = result.attempts?.find(a => a.ok);
        found.push({ path: result.solution, portalDest: destKey, portalExitDirection: direction, profile: winner?.profile ?? null, template: winner?.template ?? null, disabledFeatures: [...disabled] });

        const disableKey = winner?.template ? TEMPLATE_CONFIG_KEY[winner.template] : PROFILE_CONFIG_KEY[winner?.profile];
        if (!disableKey || disabled.has(disableKey)) break; // safety: can't make further progress
        disabled.add(disableKey);
    }
    return found;
}

async function runPortalStrategyPhase(level, destKey, direction, deadlineAt, report) {
    const found = [];
    for (const flag of STRATEGY_FLAGS) {
        if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
        let result;
        try {
            result = await SolverV2.solve(level, { timeBudgetMs: attemptBudgetMs, forcedPortalExitKey: { from: destKey, to: direction }, ablation: withFeatureDisabled(flag) });
        } catch (e) {
            report.errors.push(`strategy=${flag} portalDest=${destKey} dir=${direction}: ${e?.message}`);
            continue;
        }
        if (result?.ok && result.solution) {
            const winner = result.attempts?.find(a => a.ok);
            found.push({ path: result.solution, portalDest: destKey, portalExitDirection: direction, profile: winner?.profile ?? null, template: winner?.template ?? null, disabledFeatures: [flag] });
        }
    }
    return found;
}

// Combined gate+direction x portal-exit-direction cascade/strategy. Sets both forcedFirstStepKey
// and forcedPortalExitKey in the SAME solve call -- confirmed independent, non-conflicting opts
// in orchestration.js/search.js (one filters the gate's first move, the other filters the move
// immediately after a portal landing). `level` here is already gate-restricted (or a swap-level)
// by the caller, mirroring runCascade/runPortalCascade's pattern.
async function runCombinedCascade(level, firstStepKey, destKey, exitDirKey, deadlineAt, report) {
    const disabled = new Set();
    const found = [];
    let round = 0;
    while (true) {
        if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
        if (disabled.size > 0 && !anyConfigSurvives(level, disabled)) break;

        const cfg = disabled.size > 0 ? withFeaturesDisabled([...disabled]) : null;
        let result;
        try {
            result = await SolverV2.solve(level, {
                timeBudgetMs: attemptBudgetMs,
                forcedFirstStepKey: firstStepKey,
                forcedPortalExitKey: { from: destKey, to: exitDirKey },
                ablation: cfg,
            });
        } catch (e) {
            report.errors.push(`combined firstStep=${firstStepKey} portalDest=${destKey} dir=${exitDirKey} round=${round}: ${e?.message}`);
            break;
        }
        round++;
        if (!result?.ok || !result.solution) break;

        const winner = result.attempts?.find(a => a.ok);
        found.push({ path: result.solution, portalDest: destKey, portalExitDirection: exitDirKey, profile: winner?.profile ?? null, template: winner?.template ?? null, disabledFeatures: [...disabled] });

        const disableKey = winner?.template ? TEMPLATE_CONFIG_KEY[winner.template] : PROFILE_CONFIG_KEY[winner?.profile];
        if (!disableKey || disabled.has(disableKey)) break; // safety: can't make further progress
        disabled.add(disableKey);
    }
    return found;
}

async function runCombinedStrategyPhase(level, firstStepKey, destKey, exitDirKey, deadlineAt, report) {
    const found = [];
    for (const flag of STRATEGY_FLAGS) {
        if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
        let result;
        try {
            result = await SolverV2.solve(level, {
                timeBudgetMs: attemptBudgetMs,
                forcedFirstStepKey: firstStepKey,
                forcedPortalExitKey: { from: destKey, to: exitDirKey },
                ablation: withFeatureDisabled(flag),
            });
        } catch (e) {
            report.errors.push(`combined-strategy=${flag} firstStep=${firstStepKey} portalDest=${destKey} dir=${exitDirKey}: ${e?.message}`);
            continue;
        }
        if (result?.ok && result.solution) {
            const winner = result.attempts?.find(a => a.ok);
            found.push({ path: result.solution, portalDest: destKey, portalExitDirection: exitDirKey, profile: winner?.profile ?? null, template: winner?.template ?? null, disabledFeatures: [flag] });
        }
    }
    return found;
}

async function processLevel(levelNumber, raw, deadlineAt) {
    const level = SolverV2.prepareLevelForSolver(raw, { source: 'raw', levelNumber });
    const existingSigs = new Set((raw.hints || []).map(pathSignature));
    const loggedSigs = new Set();
    const discoveries = new Map(); // pathSignature -> provenance entry (first producer wins, mirrors novelty semantics)
    const novel = [];
    const report = {
        level: levelNumber, gates: level.gateKeys.length,
        combosTried: 0, swapCombosTried: 0, portalCombosTried: 0, swapPortalCombosTried: 0,
        combinedCombosTried: 0, swapCombinedCombosTried: 0,
        baselineWinner: null, novelFound: 0, errors: [], haltedByWallClock: false,
    };

    function consider(path, provenance) {
        const sig = pathSignature(path);
        if (loggedSigs.has(sig)) return;
        const v = SolverV2.validateCandidatePath(level, path);
        if (!v.ok) return;
        loggedSigs.add(sig);
        discoveries.set(sig, provenance);
        if (!existingSigs.has(sig)) novel.push(path);
    }

    // Phases 0/A/B/D/C are skipped entirely under --combined-only: they've already run to
    // completion in prior batches and committed their discoveries into raw.hints, so re-running
    // them here would just re-derive the same (already-saved) paths at full cost. Phase F/G's
    // findGatePortalTriples() draws its evidence straight from raw.hints, so skipping straight to
    // F/G still gets the full benefit of every previously-discovered hint as bounding evidence —
    // it just skips re-discovering anything Phase F/G itself isn't responsible for.
    const flipperVariants = level.flippingFilterMap.size >= 2 ? [false, true] : [false];
    if (!combinedOnly) {
    // Phase 0: unconstrained baseline (establishes "what wins by default").
    try {
        const base = await SolverV2.solve(level, { timeBudgetMs: baselineBudgetMs });
        if (base?.ok && base.solution) {
            const winner = base.attempts?.find(a => a.ok);
            report.baselineWinner = winner?.profile ?? null;
            consider(base.solution, { phase: 'baseline', gateKey: null, direction: null, profile: winner?.profile ?? null, template: winner?.template ?? null, disabledFeatures: [] });
        }
    } catch (e) { report.errors.push(`baseline: ${e?.message}`); }

    for (const gateKey of level.gateKeys) {
        if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
        const gateLevel = { ...level, gateKeys: [gateKey] };
        const directions = enumerateDirections(gateLevel, gateKey);

        for (const direction of directions) {
            if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
            report.combosTried++;

            const cascadeResults = await runCascade(gateLevel, gateKey, direction, deadlineAt, report);
            for (const r of cascadeResults) {
                consider(r.path, { phase: 'cascade', gateKey: r.gateKey, direction: r.direction, profile: r.profile, template: r.template, disabledFeatures: r.disabledFeatures });
            }

            if (cascadeResults.length > 0) {
                const strategyResults = await runStrategyPhase(gateLevel, gateKey, direction, deadlineAt, report);
                for (const r of strategyResults) {
                    consider(r.path, { phase: 'strategy', gateKey: r.gateKey, direction: r.direction, profile: r.profile, template: r.template, disabledFeatures: r.disabledFeatures });
                }
            }
        }
    }

    // Phase D: gate/goal-swap. For each original gate, solve the REVERSED problem (start at
    // the original goal, end at the original gate) and reverse the resulting path back
    // before validating. Surfaces paths the forward search's heuristics would never produce,
    // since move-scoring and pruning are direction-sensitive (goal-attraction scoring, fixed
    // traversal order in perimeter templates, etc). See buildSwapLevel for how turn-direction
    // landmarks and flipper-axis requirements are carried across the reversal.
    for (const gateKey of level.gateKeys) {
        if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
        for (const flipFlippers of flipperVariants) {
            if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
            const swapLevel = buildSwapLevel(level, gateKey, flipFlippers);
            const swapGateKey = swapLevel.gateKeys[0];
            const directions = enumerateDirections(swapLevel, swapGateKey);

            for (const direction of directions) {
                if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
                report.swapCombosTried++;

                const cascadeResults = await runCascade(swapLevel, swapGateKey, direction, deadlineAt, report);
                for (const r of cascadeResults) {
                    consider(r.path.slice().reverse(), { phase: 'swap-cascade', gateKey, direction, flipFlippers, profile: r.profile, template: r.template, disabledFeatures: r.disabledFeatures });
                }

                if (cascadeResults.length > 0) {
                    const strategyResults = await runStrategyPhase(swapLevel, swapGateKey, direction, deadlineAt, report);
                    for (const r of strategyResults) {
                        consider(r.path.slice().reverse(), { phase: 'swap-strategy', gateKey, direction, flipFlippers, profile: r.profile, template: r.template, disabledFeatures: r.disabledFeatures });
                    }
                }
            }
        }
    }

    // Phase C: portal-exit-direction cascade. Scoped to levels with portals, and within
    // those, only to destination keys an existing hint actually proves reachable —
    // forcing a direction at a destination no hint ever reaches would just burn budget on
    // (gate→portal) combinations that are infeasible regardless of what happens after.
    // Scans this run's accumulated novel hints too (e.g. from Phase D), so swap-discovered
    // portal usage feeds forward-direction portal-exit forcing in the same run.
    const portalDests = findPortalExitPoints(level, [...(raw.hints || []), ...novel]);
    for (const destKey of portalDests) {
        if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
        const directions = enumeratePortalExitDirections(level, destKey);

        for (const direction of directions) {
            if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
            report.portalCombosTried++;

            const cascadeResults = await runPortalCascade(level, destKey, direction, deadlineAt, report);
            for (const r of cascadeResults) {
                consider(r.path, { phase: 'portal-cascade', portalDest: r.portalDest, portalExitDirection: r.portalExitDirection, profile: r.profile, template: r.template, disabledFeatures: r.disabledFeatures });
            }

            if (cascadeResults.length > 0) {
                const strategyResults = await runPortalStrategyPhase(level, destKey, direction, deadlineAt, report);
                for (const r of strategyResults) {
                    consider(r.path, { phase: 'portal-strategy', portalDest: r.portalDest, portalExitDirection: r.portalExitDirection, profile: r.profile, template: r.template, disabledFeatures: r.disabledFeatures });
                }
            }
        }
    }
    } // !combinedOnly

    // Phase F: combined gate+direction x portal-exit-direction forcing. Phase A/B forces gate+
    // direction with portal routing left free; Phase C forces portal-exit-direction with gate+
    // direction left free. Neither tests both constraints in the SAME solve call, so a solution
    // that only emerges when BOTH are pinned simultaneously would never surface from either
    // phase alone. Bounded via findGatePortalTriples to (gate, direction, portalDest) triples
    // an existing/novel hint already proves are jointly reachable -- isolated portal-only combos
    // were measured up to 200-280s each on heavy multi-portal levels (L133, L140, L146), so an
    // unbounded full cross product here would be intractable; the exit DIRECTION at the proven
    // destination is still varied exhaustively, since that's the one crossing genuinely untested
    // by Phase A/B/C/D. Runs after Phase C so it also benefits from Phase C's own discoveries.
    const gatePortalTriples = findGatePortalTriples(level, [...(raw.hints || []), ...novel]);
    for (const { startKey: triGateKey, direction: triDirection, destKey: triDestKey } of gatePortalTriples) {
        if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
        const gateLevel = { ...level, gateKeys: [triGateKey] };
        const exitDirections = enumeratePortalExitDirections(gateLevel, triDestKey);

        for (const exitDir of exitDirections) {
            if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
            report.combinedCombosTried++;

            const cascadeResults = await runCombinedCascade(gateLevel, triDirection, triDestKey, exitDir, deadlineAt, report);
            for (const r of cascadeResults) {
                consider(r.path, { phase: 'combined-cascade', gateKey: triGateKey, direction: triDirection, portalDest: r.portalDest, portalExitDirection: r.portalExitDirection, profile: r.profile, template: r.template, disabledFeatures: r.disabledFeatures });
            }

            if (cascadeResults.length > 0) {
                const strategyResults = await runCombinedStrategyPhase(gateLevel, triDirection, triDestKey, exitDir, deadlineAt, report);
                for (const r of strategyResults) {
                    consider(r.path, { phase: 'combined-strategy', gateKey: triGateKey, direction: triDirection, portalDest: r.portalDest, portalExitDirection: r.portalExitDirection, profile: r.profile, template: r.template, disabledFeatures: r.disabledFeatures });
                }
            }
        }
    }

    // Phase E: gate/goal-swap x portal-exit-direction. Mirrors Phase D's reversal trick, but
    // targets the post-jump move Phase C forces. For every forward portal jump X->Y found in
    // any hint accumulated so far (existing + this run's novel, including Phase C/D's own
    // finds), the REVERSE-direction search (swapLevel, goal->gate) hits the same jump as
    // Y->X, so X is the destination key to force a direction at in the reverse search.
    // portalMap pairs are always mutually bidirectional (normalizeRawLevelV2 inserts both
    // directions), so findPortalExitPoints applied to REVERSED hints returns exactly these
    // reverse-side destination keys — no new scanning logic needed. Skipped under --combined-only
    // for the same reason as Phases 0/A/B/D/C above.
    if (!combinedOnly) {
    const reversedHintsForPortalScan = [...(raw.hints || []), ...novel].map(h => h.slice().reverse());
    const swapPortalDests = findPortalExitPoints(level, reversedHintsForPortalScan);
    for (const gateKey of level.gateKeys) {
        if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
        for (const flipFlippers of flipperVariants) {
            if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
            const swapLevel = buildSwapLevel(level, gateKey, flipFlippers);

            for (const destKey of swapPortalDests) {
                if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
                const directions = enumeratePortalExitDirections(swapLevel, destKey);

                for (const direction of directions) {
                    if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
                    report.swapPortalCombosTried++;

                    const cascadeResults = await runPortalCascade(swapLevel, destKey, direction, deadlineAt, report);
                    for (const r of cascadeResults) {
                        consider(r.path.slice().reverse(), { phase: 'swap-portal-cascade', gateKey, portalDest: r.portalDest, portalExitDirection: r.portalExitDirection, flipFlippers, profile: r.profile, template: r.template, disabledFeatures: r.disabledFeatures });
                    }

                    if (cascadeResults.length > 0) {
                        const strategyResults = await runPortalStrategyPhase(swapLevel, destKey, direction, deadlineAt, report);
                        for (const r of strategyResults) {
                            consider(r.path.slice().reverse(), { phase: 'swap-portal-strategy', gateKey, portalDest: r.portalDest, portalExitDirection: r.portalExitDirection, flipFlippers, profile: r.profile, template: r.template, disabledFeatures: r.disabledFeatures });
                        }
                    }
                }
            }
        }
    }
    } // !combinedOnly

    // Phase G: gate/goal-swap x combined gate+direction x portal-exit-direction. Mirrors Phase F
    // for the reversed problem, the way Phase E mirrors Phase C for Phase D. findGatePortalTriples
    // applied to REVERSED hints yields, per triple: `direction` = first step from the swap-level's
    // fixed gate (level.goalKey); `destKey` = portal destination reached in the reverse-direction
    // traversal; `endKey` = the original gate the (reversed) hint terminates at, which is exactly
    // the gate buildSwapLevel needs to install as the swap-level's GOAL. Runs after Phase E so it
    // benefits from the fully accumulated novel pool (A/B/D/C/F/E).
    const reversedForCombined = [...(raw.hints || []), ...novel].map(h => h.slice().reverse());
    const swapGatePortalTriples = findGatePortalTriples(level, reversedForCombined);
    for (const { direction: triDirection, destKey: triDestKey, endKey: triGateKey } of swapGatePortalTriples) {
        if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
        for (const flipFlippers of flipperVariants) {
            if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
            const swapLevel = buildSwapLevel(level, triGateKey, flipFlippers);
            const exitDirections = enumeratePortalExitDirections(swapLevel, triDestKey);

            for (const exitDir of exitDirections) {
                if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
                report.swapCombinedCombosTried++;

                const cascadeResults = await runCombinedCascade(swapLevel, triDirection, triDestKey, exitDir, deadlineAt, report);
                for (const r of cascadeResults) {
                    consider(r.path.slice().reverse(), { phase: 'swap-combined-cascade', gateKey: triGateKey, direction: triDirection, portalDest: r.portalDest, portalExitDirection: r.portalExitDirection, flipFlippers, profile: r.profile, template: r.template, disabledFeatures: r.disabledFeatures });
                }

                if (cascadeResults.length > 0) {
                    const strategyResults = await runCombinedStrategyPhase(swapLevel, triDirection, triDestKey, exitDir, deadlineAt, report);
                    for (const r of strategyResults) {
                        consider(r.path.slice().reverse(), { phase: 'swap-combined-strategy', gateKey: triGateKey, direction: triDirection, portalDest: r.portalDest, portalExitDirection: r.portalExitDirection, flipFlippers, profile: r.profile, template: r.template, disabledFeatures: r.disabledFeatures });
                    }
                }
            }
        }
    }

    report.novelFound = novel.length;
    return { novel, report, discoveries };
}

async function main() {
    const rawLevels = loadRawLevels();
    const levelNumbers = levelFilter
        ? [...levelFilter].filter(n => n >= 1 && n <= rawLevels.length).sort((a, b) => a - b)
        : Array.from({ length: rawLevels.length }, (_, i) => i + 1);

    console.log(`Hint diversification sweep: ${levelNumbers.length} level(s), attempt budget ${attemptBudgetMs}ms, wall-clock cap ${Math.round(maxWallMs / 60000)}min`);

    const runStart = Date.now();
    const deadlineAt = runStart + maxWallMs;
    const levelReports = [];
    let totalNovel = 0;
    let haltedEarly = false;

    for (const levelNumber of levelNumbers) {
        if (Date.now() >= deadlineAt) { haltedEarly = true; break; }
        const raw = rawLevels[levelNumber - 1];
        if (!raw) continue;

        const t0 = Date.now();
        let outcome;
        try {
            outcome = await processLevel(levelNumber, raw, deadlineAt);
        } catch (e) {
            console.log(`  L${levelNumber}: ERROR — ${e?.message}`);
            levelReports.push({ level: levelNumber, status: 'error', error: e?.message, elapsedMs: Date.now() - t0 });
            continue;
        }
        const elapsedMs = Date.now() - t0;

        if (outcome.novel.length > 0) {
            raw.hints = [...(raw.hints || []), ...outcome.novel];
            totalNovel += outcome.novel.length;
        }

        const hintProvenance = (raw.hints || []).map((hintPath, hintIndex) => {
            const entry = outcome.discoveries.get(pathSignature(hintPath));
            return entry ? { hintIndex, ...entry } : { hintIndex, phase: 'unmatched' };
        });

        levelReports.push({ ...outcome.report, status: 'done', elapsedMs, hintsAfter: raw.hints.length, hintProvenance });
        const swapNote         = outcome.report.swapCombosTried > 0 ? `, ${outcome.report.swapCombosTried} swap combos` : '';
        const portalNote       = outcome.report.portalCombosTried > 0 ? `, ${outcome.report.portalCombosTried} portal combos` : '';
        const swapPortalNote   = outcome.report.swapPortalCombosTried > 0 ? `, ${outcome.report.swapPortalCombosTried} swap-portal combos` : '';
        const combinedNote     = outcome.report.combinedCombosTried > 0 ? `, ${outcome.report.combinedCombosTried} combined combos` : '';
        const swapCombinedNote = outcome.report.swapCombinedCombosTried > 0 ? `, ${outcome.report.swapCombinedCombosTried} swap-combined combos` : '';
        console.log(`  L${levelNumber}: +${outcome.novel.length} novel hint(s) (total ${raw.hints.length}), ${outcome.report.combosTried} combos${swapNote}${portalNote}${swapPortalNote}${combinedNote}${swapCombinedNote}, ${elapsedMs}ms${outcome.report.haltedByWallClock ? ' [WALL-CLOCK HALT]' : ''}`);
        if (verbose && outcome.report.errors.length > 0) console.log(`    errors: ${outcome.report.errors.join('; ')}`);

        // Checkpoint after every level.
        await atomicWriteJson(levelsJsonAbs, rawLevels, stringifyLevelsJson);
        await atomicWriteJson(outputFile, {
            timestamp: new Date().toISOString(),
            commitSha: getCommitSha(),
            attemptBudgetMs, baselineBudgetMs, maxWallMs,
            levelFilter: levelFilter ? [...levelFilter].sort((a, b) => a - b) : 'all',
            inProgress: true,
            totalMs: Date.now() - runStart,
            totalNovel,
            levels: levelReports,
        });

        if (outcome.report.haltedByWallClock) { haltedEarly = true; break; }
    }

    const totalMs = Date.now() - runStart;
    await atomicWriteJson(outputFile, {
        timestamp: new Date().toISOString(),
        commitSha: getCommitSha(),
        attemptBudgetMs, baselineBudgetMs, maxWallMs,
        levelFilter: levelFilter ? [...levelFilter].sort((a, b) => a - b) : 'all',
        inProgress: false,
        haltedEarly,
        totalMs, totalNovel,
        levels: levelReports,
    });

    console.log(`\nDone: ${totalNovel} novel hint(s) discovered across ${levelReports.length} level(s) — ${totalMs}ms${haltedEarly ? ' (halted early: wall-clock cap reached)' : ''}`);
    console.log(`Results → ${outputFile}`);
    console.log(`Updated → ${levelsJsonPath}`);
}

await main();
