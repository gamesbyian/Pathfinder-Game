#!/usr/bin/env node
/**
 * Budget-edge stability classification (docs/solver-dev-tooling-plan.md tail item "budget-edge
 * quarantine"): tags each level in a benchmark-shaped result file with a stability class, so a
 * regression report can tell "still solves, comfortably" apart from "still solves, but right on
 * the timeout edge" — the latter deserves a different level of trust than the former even though
 * both currently read as PASS.
 *
 * Classes (single-run classification, by elapsedMs/budgetMs ratio and status):
 *   stable-fast    solved, elapsed < 10% of budget
 *   stable-medium  solved, elapsed 10-50% of budget
 *   stable-slow    solved, elapsed 50-90% of budget
 *   budget-edge    solved but elapsed >= 90% of budget, OR status is timeout/node-budget-reached
 *   known-unsolved not solved, and not merely a budget-edge timeout (e.g. status: failed/error)
 *
 * flaky (only assignable by comparing two independent runs of the SAME level, since a single run
 * can't distinguish "reliably solves in 8s" from "solved this once at 8s but sometimes times out"):
 * pass --compare=<second benchmark-shaped file> and any level whose ok/status differs between the
 * two runs is reclassified 'flaky' regardless of what either individual run's ratio says.
 *
 * Pure JS — runs under plain node:
 *   node scripts/stress/classify-stability.mjs --in=<benchmark-shaped file>
 *       [--budget-ms=20000] [--compare=<second-run-shaped file>] [--out=<file>]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const IN_FILE = args.get('--in');
const COMPARE_FILE = args.get('--compare') || null;
const OUT_FILE = args.get('--out') || null;

if (!IN_FILE) {
    console.error('Usage: classify-stability.mjs --in=<benchmark-shaped file> [--budget-ms=20000] [--compare=<file>] [--out=<file>]');
    process.exit(2);
}

const readJson = (p) => JSON.parse(readFileSync(path.resolve(ROOT, p), 'utf8'));
const data = readJson(IN_FILE);
const budgetMs = Number(args.get('--budget-ms') || data.budgetMs || 20000);

function classifyOne(lv) {
    const ok = !!lv.ok && lv.refereeValid !== false;
    if (!ok) {
        if (lv.status === 'timeout' || lv.status === 'node-budget-reached') return 'budget-edge';
        return 'known-unsolved';
    }
    const ratio = budgetMs > 0 ? (lv.elapsedMs ?? 0) / budgetMs : 0;
    if (ratio >= 0.9) return 'budget-edge';
    if (ratio >= 0.5) return 'stable-slow';
    if (ratio >= 0.1) return 'stable-medium';
    return 'stable-fast';
}

const compareById = COMPARE_FILE ? new Map(readJson(COMPARE_FILE).levels.map(lv => [lv.id, lv])) : null;

const classified = data.levels.map(lv => {
    let stability = classifyOne(lv);
    let flakyReason = null;
    if (compareById) {
        const other = compareById.get(lv.id);
        if (other) {
            const okA = !!lv.ok && lv.refereeValid !== false;
            const okB = !!other.ok && other.refereeValid !== false;
            if (okA !== okB || lv.status !== other.status) {
                flakyReason = `run A: ${lv.status}(ok=${okA}) vs run B: ${other.status}(ok=${okB})`;
                stability = 'flaky';
            }
        }
    }
    return { id: lv.id, stability, elapsedMs: lv.elapsedMs ?? null, budgetMs, status: lv.status, ok: !!lv.ok, ...(flakyReason ? { flakyReason } : {}) };
});

const counts = {};
for (const c of classified) counts[c.stability] = (counts[c.stability] || 0) + 1;

console.log(`Classified ${classified.length} level(s) from ${IN_FILE} (budget ${budgetMs}ms)${COMPARE_FILE ? `, compared against ${COMPARE_FILE}` : ''}.`);
console.log(JSON.stringify(counts, null, 2));

const budgetEdge = classified.filter(c => c.stability === 'budget-edge');
if (budgetEdge.length > 0) {
    console.log('\nBUDGET-EDGE (quarantine — treat a single failure here as "re-check isolated", not a hard regression):');
    for (const c of budgetEdge) console.log(`  ${c.id}: ${c.status}, ${c.elapsedMs}ms / ${budgetMs}ms budget`);
}
const flaky = classified.filter(c => c.stability === 'flaky');
if (flaky.length > 0) {
    console.log('\nFLAKY (result differs between the two compared runs):');
    for (const c of flaky) console.log(`  ${c.id}: ${c.flakyReason}`);
}

if (OUT_FILE) {
    writeFileSync(path.resolve(ROOT, OUT_FILE), JSON.stringify({ source: IN_FILE, compare: COMPARE_FILE, budgetMs, counts, levels: classified }, null, 2) + '\n');
    console.log(`\nWrote ${OUT_FILE}`);
}
