#!/usr/bin/env node
/**
 * Search-cost drift detector, mined from hint provenance. Read-only, no solving.
 *
 * WHAT IT ANSWERS, AND WHY NOTHING ELSE DOES
 *
 *   `solver:regression --check` verifies only the SOLVED/FAILED SET. CLAUDE.md's standing warning is
 *   that a change can pass it cleanly while making the corpus meaningfully slower — the
 *   repair-probe seed-width episode is the worked example (160/160 clean, ~14% slower corpus).
 *   The prescribed guard is a full-corpus before/after `nodesExpanded` sweep, which costs hours and
 *   therefore only ever runs when someone remembers to run it. It also only covers the published
 *   corpus; corpus-1 and corpus-2 have no cost gate at all.
 *
 *   Hint provenance already records, per discovery event, the exact solver commit, the attempt
 *   config, the budget, and the nodes expanded. So whenever the SAME config found the SAME solution
 *   under the SAME budget at two different commits, we have a free, retroactive before/after cost
 *   measurement that nobody had to schedule. This tool extracts those.
 *
 *   Two outcomes per group:
 *     STABLE  — identical nodesExpanded across commits. Positive evidence those refactors left the
 *               search byte-identical on that level. (Measured 2026-07-29: 800 such groups.)
 *     DRIFTED — nodesExpanded changed. A code change moved the search trajectory while keeping the
 *               outcome: precisely the class `--check` is blind to. (Measured 2026-07-29: 149.)
 *
 * WHAT A DRIFT RESULT IS AND IS NOT
 *
 *   It is NOT automatically a regression. Cost legitimately changes when a heuristic is retuned, and
 *   a drift that made the search CHEAPER is a win. What a drift row gives you is attribution: this
 *   level, this config, these two commits, this magnitude and direction — a starting point for
 *   "was that intended?", not a verdict. Nor is absence of drift proof a commit was inert: it only
 *   covers levels that happen to carry a rediscovered hint under the same config and budget.
 *
 *   Provenance is append-only and each entry is one discovery EVENT, so a group's two entries are
 *   two real runs, not a duplicated record. Entries that differ only by a sub-second `foundAt` (one
 *   run appending twice) are excluded — see scripts/dedupe-hint-provenance.mjs, which removed the
 *   24 such historical entries; this tool re-excludes them defensively rather than trusting that.
 *
 * WHY THE GROUPING IS SO STRICT
 *
 *   Everything a caller controls must match before a node-count difference means anything:
 *   technique, profile, template, beamWidth, AND budgetMs (a time-bounded search explores further
 *   with a bigger clock, so a budget difference explains a cost difference by itself). Hint-guided
 *   and witness entries are excluded outright: a `prefix-anchored` completion can report
 *   nodesExpanded of 2 because the anchor did the work, which produced spurious 485,000x "drift"
 *   ratios in the analysis that motivated this tool.
 *
 * Usage:
 *   node scripts/stress/hint-cost-drift.mjs                       # all three corpora
 *   node scripts/stress/hint-cost-drift.mjs --corpus=corpus2      # published | corpus1 | corpus2
 *   node scripts/stress/hint-cost-drift.mjs --min-ratio=1.5       # only drifts of >=1.5x
 *   node scripts/stress/hint-cost-drift.mjs --by-commit           # attribute drift to commit pairs
 *   node scripts/stress/hint-cost-drift.mjs --out=reports/stress/hint-cost-drift.json
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { LADDER_TECHNIQUES, techniqueFamily, configKeyOf } from './hint-cost-drift-lib.mjs';

/** Cost of one provenance entry, preferring the machine-independent unit.
 *
 *  `search.workSpent` (modules/solver/work-meter.ts: applyMove + 12*isConnected) is the right basis
 *  for this tool: it does not depend on host speed or load, and it means the same amount of real
 *  work in dfs, beam and repair — which count 11-17x different work per "node", so a
 *  `nodesExpanded` comparison across techniques was never apples-to-apples. Entries recorded before
 *  workSpent existed fall back to nodesExpanded; those comparisons carry the old caveat (much of
 *  their variation is machine noise, since only ~16% of same-config repeat runs reproduced their
 *  node count) and are marked by `unit` in the output. */
const costOf = (e) => (typeof e.search?.workSpent === 'number' && e.search.workSpent > 0)
    ? e.search.workSpent
    : (typeof e.search?.nodesExpanded === 'number' ? e.search.nodesExpanded : 0);
const costUnit = (e) => (typeof e.search?.workSpent === 'number' && e.search.workSpent > 0) ? 'work' : 'nodes';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));

const CORPORA = {
    published: 'data/hints',
    corpus1: 'data/stress/hints',
    corpus2: 'data/stress/hints-random',
};

const which = args.get('--corpus');
if (which && !(which in CORPORA)) {
    console.error(`--corpus must be one of: ${Object.keys(CORPORA).join(', ')}`);
    process.exit(2);
}
const minRatio = Number(args.get('--min-ratio') || 1);
const byCommit = process.argv.includes('--by-commit');
const outFile = args.get('--out');

// LADDER_TECHNIQUES / techniqueFamily / configKeyOf (including the multiplicative budget-bucketing
// they rely on) now live in hint-cost-drift-lib.mjs, split out so they're unit-testable without
// this file's own top-level corpus scan running as an import side effect. See that module's own
// comments for the bucketing rationale and reports/2026-07-29-hint-cost-drift-triage.md for the
// before/after measurement that motivated it.

function usableEntries(hint) {
    const seen = new Set();
    const out = [];
    for (const e of hint.provenance || []) {
        if (!LADDER_TECHNIQUES.has(techniqueFamily(e.solver?.technique))) continue;
        if (e.context?.hintGuided) continue;
        if (!e.solver?.version) continue;
        if (!(costOf(e) > 0)) continue;
        // Defensive re-exclusion of same-run double-appends (identical but for foundAt).
        const { foundAt: _foundAt, ...rest } = e;
        const k = JSON.stringify(rest);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(e);
    }
    return out;
}

const groups = [];
for (const [corpus, dir] of Object.entries(CORPORA)) {
    if (which && corpus !== which) continue;
    const abs = path.resolve(ROOT, dir);
    if (!existsSync(abs)) continue;
    for (const file of readdirSync(abs)) {
        if (!file.endsWith('.json')) continue;
        let doc;
        try { doc = JSON.parse(readFileSync(path.join(abs, file), 'utf8')); } catch { continue; }
        (doc.hints || []).forEach((hint, hintIndex) => {
            const byConfig = new Map();
            for (const e of usableEntries(hint)) {
                const k = configKeyOf(e);
                if (!byConfig.has(k)) byConfig.set(k, []);
                byConfig.get(k).push(e);
            }
            for (const [key, entries] of byConfig) {
                const versions = [...new Set(entries.map(e => e.solver.version))];
                if (versions.length < 2) continue;          // nothing to compare across
                const nodes = entries.map(costOf);
                const min = Math.min(...nodes), max = Math.max(...nodes);
                groups.push({
                    corpus, level: file.replace(/\.json$/, ''), hintIndex,
                    config: key, versions: versions.length,
                    minNodes: min, maxNodes: max,
                    ratio: min > 0 ? max / min : Infinity,
                    drifted: min !== max,
                    byVersion: entries.map(e => ({ version: e.solver.version.slice(0, 7), nodes: costOf(e), unit: costUnit(e), foundAt: e.foundAt })),
                });
            }
        });
    }
}

const stable = groups.filter(g => !g.drifted);
const drifted = groups.filter(g => g.drifted && g.ratio >= minRatio);

console.log(`Cross-commit cost comparisons available: ${groups.length}`);
console.log(`  STABLE  (identical nodesExpanded across commits): ${stable.length}`);
console.log(`  DRIFTED (search trajectory moved)               : ${groups.filter(g => g.drifted).length}` +
    (minRatio > 1 ? `  (${drifted.length} at >=${minRatio}x)` : ''));

if (drifted.length) {
    console.log(`\nDrifted, largest magnitude first:`);
    console.log(`  ${'corpus'.padEnd(10)}${'level'.padEnd(9)}${'config'.padEnd(40)}${'ratio'.padStart(9)}   nodes`);
    for (const g of [...drifted].sort((a, b) => b.ratio - a.ratio).slice(0, 40)) {
        const cfg = g.config.split('|').slice(0, 2).filter(s => s !== '-').join('/');
        console.log(`  ${g.corpus.padEnd(10)}${g.level.padEnd(9)}${cfg.padEnd(40)}${g.ratio.toFixed(2).padStart(8)}x   ` +
            `${g.minNodes.toLocaleString()} .. ${g.maxNodes.toLocaleString()}`);
    }
    if (drifted.length > 40) console.log(`  ... and ${drifted.length - 40} more (use --out to capture all)`);
}

if (byCommit && drifted.length) {
    // Which commit does a level's cost change coincide with? Provenance records the commit each
    // find ran at, not a diff between them, so this attributes to the OBSERVED PAIR of commits --
    // the real cause may be any change between them. Treat as a lead, not a culprit.
    const pairs = new Map();
    for (const g of drifted) {
        const sorted = [...g.byVersion].sort((a, b) => String(a.foundAt).localeCompare(String(b.foundAt)));
        const from = sorted[0], to = sorted[sorted.length - 1];
        if (from.version === to.version) continue;
        const k = `${from.version} -> ${to.version}`;
        if (!pairs.has(k)) pairs.set(k, { n: 0, cheaper: 0, costlier: 0 });
        const p = pairs.get(k);
        p.n++;
        if (to.nodes < from.nodes) p.cheaper++; else p.costlier++;
    }
    console.log(`\nDrift attributed to observed commit pairs (earliest -> latest find):`);
    [...pairs.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 20).forEach(([k, p]) =>
        console.log(`  ${k.padEnd(24)} ${String(p.n).padStart(4)} level(s)   costlier ${p.costlier}, cheaper ${p.cheaper}`));
}

if (outFile) {
    writeFileSync(path.resolve(ROOT, outFile), JSON.stringify({
        generatedAt: new Date().toISOString(),
        corpora: which ? [which] : Object.keys(CORPORA),
        minRatio,
        comparisons: groups.length,
        stable: stable.length,
        drifted: groups.filter(g => g.drifted).length,
        groups: groups.filter(g => g.drifted),
    }, null, 1));
    console.log(`\nWrote ${outFile}`);
}
