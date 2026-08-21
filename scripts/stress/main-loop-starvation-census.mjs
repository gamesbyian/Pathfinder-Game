#!/usr/bin/env node
// Main-loop attempt-allocation starvation census.
//
// BACKGROUND. reports/2026-08-08-main-loop-profile-order-starvation.md hand-traced a small
// (11-level) sample and found the same "earlier tiers eat the whole ceiling" bug shape already
// fixed twice elsewhere (repair-probe node starvation, admissible-order tier node starvation)
// recurring inside the ORDINARY main loop's own per-level attempt list: an attempt config can end
// up with `nodesExpanded === 0, elapsedMs === 0` in the committed attempt log -- a real attempt
// entry, but zero actual search -- because earlier attempts in the ladder consumed the entire
// cumulative node budget first. This script answers the natural follow-up: how prevalent is that,
// corpus-wide, and how much of it is a PROVABLE lost solve (not just "the ladder ran out, as
// expected for a genuinely hard level")?
//
// METHOD. Pure read-only cross-reference over two ALREADY-COMMITTED data sources -- no new
// solving, no solver code imported:
//   1. logs/stress-corpus{1,2}-baseline.json -- the routine continuity baseline. Each level's
//      `attempts[]` is the FULL, already-recorded ladder log (every config tried, in order, at the
//      current routine node/work budget) from the last real solver-stress-refresh.yml run.
//   2. data/stress/hints{,-random}/<id>.json -- the stored hint corpus's per-discovery provenance
//      (solver.technique/profile/template/beamWidth/repair/admissibleOrder, search.nodesExpanded).
//
// A level's attempt is STARVED if `nodesExpanded === 0 && elapsedMs === 0` (validated directly by
// hand-tracing in the report above: this signature means the search primitive bailed before doing
// any work at all, distinct from a small-but-nonzero count, which is genuine fast exhaustion).
//
// A starved attempt is a HISTORICALLY MATCHED, BUDGET-FITTING loss only if the level ALSO carries a cold
// (non-hint-guided), trustworthy (nodesExpanded >= 100 -- excludes a documented batch of ~1,100
// stale/buggy near-zero beam provenance entries from an old instrumentation era, see the
// mc-neighbor-budget-propagation report's own note on this) hint whose (technique-family, profile,
// template, beamWidth) signature matches a STARVED attempt's config AND whose own recorded
// nodesExpanded fits under this run's node budget (36M for corpus-2, 50M for corpus-1). That is a
// real, validated historical solution whose matching config the current routine run gave zero
// nodes. It is evidence of allocation opportunity, not proof the current solver revision will
// reproduce that old witness (the 2026-08-10 reserve pilot recovered only 1/14 deterministic
// matches; code/search evolution can invalidate that inference).
//
// SCOPE LIMITS, HONEST. `repair`'s match is COARSE (any repair-flagged attempt matches any
// repair-flagged hint) -- repair uses a per-attempt randomized seed
// (repairPrimarySeed(gateKey, seedSalt)), so a "recoverable" repair match does not guarantee the
// SAME seed would reproduce the SAME solution; it is a much softer signal than dfs/beam's exact,
// deterministic (profile, template, beamWidth, gateKey) match. Flagged separately in the output --
// do not quote the repair count with the same confidence as dfs/beam's.
//
// Usage:
//   node scripts/stress/main-loop-starvation-census.mjs [--corpus2-only] [--out=<file>]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };
const OUT_FILE = arg('out', null);
const corpus2Only = argv.includes('--corpus2-only');

const CORPORA = [
    { name: 'corpus-2', baseline: 'logs/stress-corpus2-baseline.json', hintsDir: 'data/stress/hints-random', nodeBudget: 36_000_000 },
    { name: 'corpus-1', baseline: 'logs/stress-corpus1-baseline.json', hintsDir: 'data/stress/hints', nodeBudget: 50_000_000 },
].filter(c => !corpus2Only || c.name === 'corpus-2');

const COLD_PREFIXES = ['dfs', 'beam', 'repair', 'admissible-order', 'enumerate-complete'];

function configSig(a) {
    if (a.admissibleOrder) return ['admissible-order', a.profile ?? null, !!a.admissibleOrderNoTieBreak];
    if (a.repair) return ['repair', !!a.repairMustTurnBiased, !!a.repairTurnBiased];
    if (a.beamWidth) return ['beam', a.profile ?? null, a.template ?? null, a.beamWidth, !!a.diverseBeam];
    return ['dfs', a.profile ?? null, a.template ?? null];
}

function hintSig(s) {
    const t = s.technique || '';
    if (t.startsWith('admissible-order')) {
        const prof = s.profile ?? null;
        const noTieBreak = prof === null || prof === 'none';
        return ['admissible-order', noTieBreak ? null : prof, noTieBreak];
    }
    if (t.startsWith('repair')) return ['repair', false, false]; // coarse -- see file doc
    if (t.startsWith('beam')) return ['beam', s.profile ?? null, s.template ?? null, s.beamWidth ?? null, !!s.diverseBeam];
    if (t.startsWith('dfs') || t.startsWith('enumerate-complete')) return ['dfs', s.profile ?? null, s.template ?? null];
    return null;
}
const sigKey = (sig) => sig.join('');

function analyzePopulation(levels, hintsDir, nodeBudget) {
    let totalAttempts = 0, starvedAttempts = 0, levelsWithStarved = 0;
    const starvedByFamily = {};
    const recoverableLevels = new Map(); // id -> Set(family)

    for (const lv of levels) {
        const attempts = lv.attempts || [];
        totalAttempts += attempts.length;
        const starved = attempts.filter(a => a.nodesExpanded === 0 && a.elapsedMs === 0);
        starvedAttempts += starved.length;
        if (starved.length === 0) continue;
        levelsWithStarved++;
        const starvedSigs = new Set(starved.map(a => sigKey(configSig(a))));
        for (const a of starved) {
            const fam = configSig(a)[0];
            starvedByFamily[fam] = (starvedByFamily[fam] || 0) + 1;
        }

        const hintPath = path.resolve(ROOT, hintsDir, `${lv.id}.json`);
        if (!existsSync(hintPath)) continue;
        let hd;
        try { hd = JSON.parse(readFileSync(hintPath, 'utf8')); } catch { continue; }
        for (const h of hd.hints || []) {
            for (const p of h.provenance || []) {
                const s = p.solver || {};
                const se = p.search || {};
                const ctx = p.context || {};
                if (ctx.hintGuided) continue;
                const t = s.technique || '';
                if (!COLD_PREFIXES.some(pfx => t.startsWith(pfx))) continue;
                const ne = se.nodesExpanded;
                if (ne == null || ne < 100) continue; // excludes stale/buggy near-zero provenance
                if (ne > nodeBudget) continue;
                const sig = hintSig(s);
                if (!sig || !starvedSigs.has(sigKey(sig))) continue;
                if (!recoverableLevels.has(lv.id)) recoverableLevels.set(lv.id, new Set());
                recoverableLevels.get(lv.id).add(sig[0]);
            }
        }
    }

    const famCounts = {};
    for (const fams of recoverableLevels.values()) for (const f of fams) famCounts[f] = (famCounts[f] || 0) + 1;
    const dfsOrBeam = [...recoverableLevels.values()].filter(f => f.has('dfs') || f.has('beam')).length;
    const repairOnly = [...recoverableLevels.values()].filter(f => f.size === 1 && f.has('repair')).length;

    return {
        levels: levels.length, totalAttempts, starvedAttempts,
        starvedAttemptRate: totalAttempts ? starvedAttempts / totalAttempts : 0,
        levelsWithStarved, levelsWithStarvedRate: levels.length ? levelsWithStarved / levels.length : 0,
        starvedByFamily,
        levelsRecoverable: recoverableLevels.size,
        recoverableByFamily: famCounts,
        recoverableDfsOrBeam: dfsOrBeam, // the hard, deterministic-match signal
        recoverableRepairOnly: repairOnly, // the soft, seed-dependent-match signal
        recoverableIds: [...recoverableLevels.keys()],
    };
}

const results = {};
for (const c of CORPORA) {
    const baselinePath = path.resolve(ROOT, c.baseline);
    if (!existsSync(baselinePath)) { console.log(`${c.name}: no baseline at ${c.baseline}, skipping`); continue; }
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
    const unsolved = baseline.levels.filter(l => l.ok === false);
    const solved = baseline.levels.filter(l => l.ok === true);

    console.log(`\n=== ${c.name} (node budget ${c.nodeBudget.toLocaleString()}) ===`);
    const un = analyzePopulation(unsolved, c.hintsDir, c.nodeBudget);
    console.log(`  unsolved: ${un.levels} levels, ${un.totalAttempts} attempts, ${un.starvedAttempts} starved (${(100 * un.starvedAttemptRate).toFixed(1)}%)`);
    console.log(`  unsolved: ${un.levelsWithStarved} levels (${(100 * un.levelsWithStarvedRate).toFixed(1)}%) have >=1 starved attempt`);
    console.log(`  unsolved: starved attempts by family: ${JSON.stringify(un.starvedByFamily)}`);
    console.log(`  unsolved: HISTORICALLY MATCHED budget-fitting levels: ${un.levelsRecoverable} (by family: ${JSON.stringify(un.recoverableByFamily)})`);
    console.log(`  unsolved: of those, dfs/beam (hard, deterministic match): ${un.recoverableDfsOrBeam}; repair-only (soft, seed-dependent match): ${un.recoverableRepairOnly}`);

    const sol = analyzePopulation(solved, c.hintsDir, c.nodeBudget);
    console.log(`  solved (control): ${sol.levels} levels, ${sol.levelsWithStarved} (${(100 * sol.levelsWithStarvedRate).toFixed(1)}%) have >=1 starved attempt, ${sol.levelsRecoverable} historically matched`);

    results[c.name] = { unsolved: un, solvedControl: sol };
}

if (OUT_FILE) {
    const abs = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(results, null, 1));
    console.log(`\nWrote ${OUT_FILE}`);
}
