#!/usr/bin/env node
/**
 * Mass-weighted failure map for a level-blind capability sweep run with `--lifecycle-telemetry`.
 *
 * Answers the allocation question that no existing tool can: for the levels the solver does NOT
 * solve, which techniques actually received work, which were eligible but never got a single node,
 * which searched their space out, and where the corpus's total node/work spend goes. Every field
 * read here comes from `techniqueLifecycle` (modules/solver/orchestration.ts's `finish()`), the
 * explicit lifecycle record validated by ETT-014-016 — NOT from the per-attempt heuristics that
 * scripts/stress/cluster-unsolved-failures.mjs infers signatures from. The two are complementary
 * and answer different questions; this one is about eligibility/reach/starvation/exhaustion, which
 * attempt rows alone cannot express. In particular this tool does not reproduce that script's
 * `beam-collapse` bucket, which its own docstring documents as not a search-quality signal.
 *
 * Buckets are mutually exclusive and ordered, so every row lands in exactly one and the counts sum
 * to the population. `starved` deliberately outranks `capped`: a level whose runnable technique
 * never got a node has not been measured at all, and reading it as a search-quality failure is the
 * exact misreading that ETT-016's zero-work dispatch finding warns about.
 *
 * Solved rows are summarized too, for the separate budget-elasticity question: `solveCost`'s
 * quantiles and `marginalSolves` say how many solves land in the upper reaches of the node ceiling,
 * i.e. whether raising or lowering the budget would move the capability figure. That is an estimate
 * from one run's cost distribution, NOT a substitute for a matched two-budget A/B: the solver's own
 * internal reserves are fractions of `nodeBudget`, so a run at a lower ceiling is not a prefix of
 * this one.
 *
 * Usage:
 *   node scripts/stress/lifecycle-failure-map.mjs --in=<a.json[,b.json]> [--in-dir=<dir>]
 *       [--out=reports/stress/lifecycle-failure-map.json] [--summary-out=<file.md>]
 *
 * Accepts either shard-shaped (`{summary, levels}`) or combined benchmark-shaped (`{..., levels}`)
 * capability artifacts, and refuses any row missing `techniqueLifecycle` rather than silently
 * reporting a partial population.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/** Technique keys, in the ladder order `finish()` emits them. */
export const TECHNIQUES = ['repair-probe', 'main-ladder', 'repair-fallback', 'attraction-diversity', 'admissible-order'];

/**
 * The lowest badness any technique reported on this level, with the technique that reached it.
 * `bestBadness` is the live best-so-far; `finalBadness` is where an attempt ended. Both can be
 * null on attempts that never scored, which is why this returns null rather than Infinity.
 */
export function bestProgressOf(lifecycle) {
    let best = null;
    let technique = null;
    for (const name of Object.keys(lifecycle ?? {})) {
        for (const point of lifecycle[name]?.bestProgress ?? []) {
            for (const value of [point.bestBadness, point.finalBadness]) {
                if (value == null || !Number.isFinite(Number(value))) continue;
                if (best === null || Number(value) < best) { best = Number(value); technique = name; }
            }
        }
    }
    return { bestBadness: best, bestBadnessTechnique: technique };
}

/**
 * One row's terminal classification. Ordered and mutually exclusive — see the file header for why
 * `starved` outranks `capped`.
 */
export function classifyRow(row) {
    const lifecycle = row.techniqueLifecycle;
    if (!lifecycle) throw new Error(`level ${row.id ?? row.level}: missing techniqueLifecycle (run the sweep with --lifecycle-telemetry)`);
    const progress = bestProgressOf(lifecycle);
    const starved = TECHNIQUES.filter(name => lifecycle[name]
        && (lifecycle[name].starvedByNodeBudget === true || lifecycle[name].starvedByWorkBudget === true));
    const reached = TECHNIQUES.filter(name => lifecycle[name]?.reached === true);
    const base = {
        id: row.id ?? String(row.level),
        level: row.level ?? null,
        nodes: Number(row.nodesExpanded ?? 0),
        work: Number(row.workSpent ?? 0),
        status: row.status ?? null,
        starvedTechniques: starved,
        reachedTechniques: reached,
        ...progress,
    };

    if (row.hadAttemptError === true || row.status === 'attempt-error') return { ...base, bucket: 'attempt-error' };
    // Indeterminate, never a negative: a truncated row did not finish its budget.
    if (row.deadlineTruncated === true || row.status === 'deadline-truncated') return { ...base, bucket: 'deadline-truncated' };
    if (row.ok === true) {
        const winner = TECHNIQUES.find(name => lifecycle[name]?.reached === true
            && (lifecycle[name].bestProgress ?? []).length >= 0 && name === lastReachedBeforeSolve(lifecycle));
        return { ...base, bucket: 'solved', winningTechnique: winner ?? null };
    }
    if (starved.length) return { ...base, bucket: 'starved' };
    if (reached.length && reached.every(name => lifecycle[name].exhaustedSearchSpace === true)) {
        return { ...base, bucket: 'exhausted' };
    }
    if (reached.length) return { ...base, bucket: 'capped' };
    return { ...base, bucket: 'unclassified' };
}

/**
 * The last technique that received work — on a solved row this is the one that produced the win,
 * because `solveLevel` returns immediately on success.
 */
function lastReachedBeforeSolve(lifecycle) {
    let last = null;
    for (const name of TECHNIQUES) if (lifecycle[name]?.reached === true) last = name;
    return last;
}

function quantiles(sorted, points = [0.1, 0.25, 0.5, 0.75, 0.9, 0.95]) {
    if (!sorted.length) return {};
    return Object.fromEntries(points.map(p => [`p${Math.round(p * 100)}`, sorted[Math.floor(p * (sorted.length - 1))]]));
}

/** Aggregate map over already-classified rows. */
export function buildMap(rows, { nodeBudget = null } = {}) {
    const classified = rows.map(classifyRow);
    const unsolved = classified.filter(r => r.bucket !== 'solved');
    const solved = classified.filter(r => r.bucket === 'solved');

    const buckets = {};
    for (const row of classified) {
        const bucket = buckets[row.bucket] ??= { levels: 0, nodes: 0, work: 0, ids: [], bestBadness: [] };
        bucket.levels += 1;
        bucket.nodes += row.nodes;
        bucket.work += row.work;
        bucket.ids.push(row.id);
        if (row.bestBadness !== null) bucket.bestBadness.push(row.bestBadness);
    }
    for (const bucket of Object.values(buckets)) {
        bucket.bestBadness.sort((a, b) => a - b);
        bucket.bestBadnessQuantiles = quantiles(bucket.bestBadness);
        delete bucket.bestBadness;
        bucket.ids.sort();
    }

    // Per-technique lifecycle census over the UNSOLVED population: the levels whose allocation is
    // actually in question. Solved levels stop the ladder early by design, so their unreached
    // techniques carry no information about starvation.
    const techniques = {};
    for (const name of TECHNIQUES) {
        techniques[name] = {
            instantiated: 0, reached: 0, starvedByNodeBudget: 0, starvedByWorkBudget: 0,
            skippedByRoutingOrConfiguration: 0, exhaustedSearchSpace: 0, attempts: 0, nodes: 0, work: 0,
        };
    }
    for (const row of rows) {
        if (row.ok === true) continue;
        for (const name of TECHNIQUES) {
            const lifecycle = row.techniqueLifecycle?.[name];
            if (!lifecycle) continue;
            const bucket = techniques[name];
            if (lifecycle.instantiated) bucket.instantiated += 1;
            if (lifecycle.reached) bucket.reached += 1;
            if (lifecycle.starvedByNodeBudget) bucket.starvedByNodeBudget += 1;
            if (lifecycle.starvedByWorkBudget) bucket.starvedByWorkBudget += 1;
            if (lifecycle.skippedByRoutingOrConfiguration) bucket.skippedByRoutingOrConfiguration += 1;
            if (lifecycle.exhaustedSearchSpace) bucket.exhaustedSearchSpace += 1;
            bucket.attempts += Number(lifecycle.attempts ?? 0);
            bucket.nodes += Number(lifecycle.actualNodes ?? 0);
            bucket.work += Number(lifecycle.actualWork ?? 0);
        }
    }
    const unsolvedNodes = unsolved.reduce((sum, r) => sum + r.nodes, 0);
    const unsolvedWork = unsolved.reduce((sum, r) => sum + r.work, 0);
    for (const bucket of Object.values(techniques)) {
        bucket.nodeShare = unsolvedNodes ? bucket.nodes / unsolvedNodes : 0;
        bucket.workShare = unsolvedWork ? bucket.work / unsolvedWork : 0;
    }

    // Which combinations of techniques go unfed, ranked by how many levels each affects.
    const starvationPatterns = {};
    for (const row of classified) {
        if (row.bucket !== 'starved') continue;
        const key = row.starvedTechniques.join('+');
        starvationPatterns[key] = (starvationPatterns[key] ?? 0) + 1;
    }

    const solveNodes = solved.map(r => r.nodes).sort((a, b) => a - b);
    const marginalSolves = {};
    if (nodeBudget) {
        for (const fraction of [0.5, 0.75, 0.9]) {
            marginalSolves[`above${Math.round(fraction * 100)}pctOfBudget`] = solveNodes.filter(n => n > nodeBudget * fraction).length;
        }
    }

    return {
        population: { levels: classified.length, solved: solved.length, unsolved: unsolved.length },
        buckets, techniques, starvationPatterns,
        solveCost: {
            nodeBudget,
            quantiles: quantiles(solveNodes),
            max: solveNodes.length ? solveNodes[solveNodes.length - 1] : null,
            marginalSolves,
        },
        winningTechnique: solved.reduce((counts, row) => {
            const key = row.winningTechnique ?? 'unknown';
            counts[key] = (counts[key] ?? 0) + 1;
            return counts;
        }, {}),
        levels: classified,
    };
}

export function renderSummary(map, sources) {
    const pct = (n, d) => d ? `${(100 * n / d).toFixed(1)}%` : '—';
    const lines = [];
    lines.push('# Lifecycle failure map', '');
    lines.push(`Sources: ${sources.join(', ')}`, '');
    lines.push(`Population: ${map.population.levels} levels — ${map.population.solved} solved, ${map.population.unsolved} unsolved.`, '');
    lines.push('## Terminal bucket (mutually exclusive)', '');
    lines.push('| bucket | levels | share | nodes | work | best badness p50 |');
    lines.push('|---|---:|---:|---:|---:|---:|');
    for (const [name, bucket] of Object.entries(map.buckets).sort((a, b) => b[1].levels - a[1].levels)) {
        lines.push(`| ${name} | ${bucket.levels} | ${pct(bucket.levels, map.population.levels)} | ${bucket.nodes.toLocaleString()} | ${bucket.work.toLocaleString()} | ${bucket.bestBadnessQuantiles.p50 ?? '—'} |`);
    }
    lines.push('', '## Technique lifecycle on unsolved levels', '');
    lines.push('| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |');
    lines.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
    for (const name of TECHNIQUES) {
        const t = map.techniques[name];
        lines.push(`| ${name} | ${t.instantiated} | ${t.reached} | ${t.starvedByNodeBudget} | ${t.starvedByWorkBudget} | ${t.skippedByRoutingOrConfiguration} | ${t.exhaustedSearchSpace} | ${(100 * t.nodeShare).toFixed(1)}% | ${(100 * t.workShare).toFixed(1)}% |`);
    }
    const patterns = Object.entries(map.starvationPatterns).sort((a, b) => b[1] - a[1]);
    if (patterns.length) {
        lines.push('', '## Starvation patterns (unfed technique sets)', '');
        lines.push('| starved techniques | levels |');
        lines.push('|---|---:|');
        for (const [key, count] of patterns) lines.push(`| ${key} | ${count} |`);
    }
    lines.push('', '## Solve cost (budget elasticity estimate)', '');
    lines.push(`Node budget: ${map.solveCost.nodeBudget ?? 'unknown'}`);
    lines.push(`Quantiles: ${Object.entries(map.solveCost.quantiles).map(([k, v]) => `${k}=${v.toLocaleString()}`).join(' ')}`);
    lines.push(`Max: ${map.solveCost.max?.toLocaleString() ?? '—'}`);
    for (const [key, value] of Object.entries(map.solveCost.marginalSolves)) {
        lines.push(`Solves costing ${key.replace('above', '>').replace('pctOfBudget', '% of budget')}: ${value}`);
    }
    lines.push('', 'Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.', '');
    return lines.join('\n');
}

export function readArtifacts({ inList, inDir, root = process.cwd() }) {
    const paths = inDir
        ? readdirSync(path.resolve(root, inDir)).filter(name => name.endsWith('.json')).map(name => path.join(inDir, name)).sort()
        : String(inList ?? '').split(',').map(s => s.trim()).filter(Boolean);
    if (!paths.length) throw new Error('no input artifacts: pass --in=<file[,file]> or --in-dir=<dir>');
    const rows = [];
    let nodeBudget = null;
    for (const file of paths) {
        const document = JSON.parse(readFileSync(path.resolve(root, file), 'utf8'));
        if (!Array.isArray(document.levels)) throw new Error(`${file}: not a capability sweep artifact (no levels array)`);
        // Shard artifacts nest run context under `summary`; combined ones flatten it.
        const budget = document.summary?.nodeBudget ?? document.nodeBudget ?? null;
        if (budget != null && Number.isFinite(Number(budget))) {
            if (nodeBudget != null && Number(budget) !== nodeBudget) {
                throw new Error(`mismatched nodeBudget across inputs (${nodeBudget} vs ${budget}); a mass-weighted map may not mix budgets`);
            }
            nodeBudget = Number(budget);
        }
        rows.push(...document.levels);
    }
    return { rows, nodeBudget, paths };
}

function main() {
    const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
        const [key, ...value] = a.split('=');
        return [key, value.join('=')];
    }));
    const outFile = args.get('--out') || 'reports/stress/lifecycle-failure-map.json';
    const summaryFile = args.get('--summary-out') || outFile.replace(/\.json$/u, '-summary.md');
    const { rows, nodeBudget, paths } = readArtifacts({ inList: args.get('--in'), inDir: args.get('--in-dir') });
    const map = buildMap(rows, { nodeBudget });
    map.sources = paths;
    mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    writeFileSync(outFile, `${JSON.stringify(map, null, 2)}\n`);
    const summary = renderSummary(map, paths);
    writeFileSync(summaryFile, `${summary}\n`);
    console.log(summary);
    console.log(`\nWrote ${outFile} and ${summaryFile}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
