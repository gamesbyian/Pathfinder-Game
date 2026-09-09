#!/usr/bin/env node
/**
 * Execution-family canary verifier (docs/solver-research-operating-model.md's "before expensive
 * decision-bearing runs" checklist, gate #4: "run the smallest representative cell/level for each
 * materially different execution family under the exact cap/flags/selector mode. Verify work/
 * node/deadline stop semantics and expected output fields before scaling."). Nothing mechanically
 * enforced this anywhere before 2026-09-09 -- every large solver batch workflow fanned out to its
 * full shard matrix directly from a resolved config that had never actually been run once.
 *
 * This consumes the output of running the SAME sweep entrypoint script a caller's real shards will
 * run, restricted (by the caller, e.g. via --levels=<one position>) to one or a few representative
 * levels under the IDENTICAL resolved corpus/budget/flag/scheduler-mode config the full run will
 * use. It is deliberately narrow: a STRUCTURAL sanity check (did the config crash, error, produce
 * zero attempts, spuriously hit a deadline meant to be non-binding, or omit an expected field), not
 * a STATISTICAL one. It does NOT check target-stage participation rate -- a single canary level can
 * legitimately not reach every ladder stage even under a correctly-wired config; that population-
 * level check already exists and stays validate-solver-sweep-integrity.mjs's job on the full run
 * (its --min-participating-levels/--min-participation-rate). Conflating the two would either make
 * this canary too weak (accepting any stage-reach state) or too strong (false-failing a canary
 * whose one level just doesn't happen to need a given late-ladder retry).
 *
 * Usage:
 *   node scripts/verify-canary-cell.mjs --result=<canary-sweep-output.json> \
 *     [--expect-no-deadline-truncation=true]
 *   node scripts/verify-canary-cell.mjs --result=<canary-technique-census-output.json> \
 *     --mode=technique-census
 *
 * --mode=sweep (default) reads {levels:[...]} rows shaped by portfolio-solve-sweep-lib.mjs's
 * buildRow() (level-blind-capability-sweep.mjs, portfolio-solve-sweep.mjs). --mode=technique-census
 * reads {results:[...]} rows shaped by technique-census-cell.mjs's runCell()
 * (static-portfolio-confirmation.yml/technique-census.yml) -- a materially different row shape
 * (attempts only populated on a solve; see verifyTechniqueCensusCells's own comment), hence the
 * separate verifier function even though the intent is identical.
 */
import fs from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

function parseArgs(argv) {
    return new Map(argv.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
        const [k, ...v] = a.slice(2).split('=');
        return [k, v.join('=')];
    }));
}

export function verifyCanaryCells(levels) {
    if (!Array.isArray(levels) || levels.length === 0) {
        return { ok: false, failures: ['canary report has no levels -- nothing was verified'] };
    }
    const failures = [];
    for (const row of levels) {
        const label = row?.id ?? (row?.level != null ? `L${row.level}` : '(unidentified row)');
        if (typeof row?.ok !== 'boolean') failures.push(`${label}: missing/non-boolean "ok" field`);
        if (typeof row?.status !== 'string' || !row.status) failures.push(`${label}: missing/empty "status" field`);
        if (row?.status === 'error' || row?.hadAttemptError) {
            failures.push(`${label}: solve raised an error (status=${row?.status}${row?.error ? `, error=${JSON.stringify(row.error)}` : ''}) -- the resolved config cannot run at all`);
        }
        if (!Array.isArray(row?.attempts) || row.attempts.length === 0) {
            failures.push(`${label}: zero attempts ran -- the resolved ablation/flag combination may eliminate every attempt config before any solve is even tried`);
        }
        if (row?.nodesExpanded != null && typeof row.nodesExpanded !== 'number') failures.push(`${label}: "nodesExpanded" present but not a number`);
        if (row?.workSpent != null && typeof row.workSpent !== 'number') failures.push(`${label}: "workSpent" present but not a number`);
    }
    return { ok: failures.length === 0, failures };
}

/** Same structural intent as verifyCanaryCells, for scripts/technique-census-cell.mjs's row shape
 *  (static-portfolio-confirmation.yml's execution model) instead of portfolio-solve-sweep-lib.mjs's
 *  buildRow() shape: `attempts` is only ever populated when a cell actually solves (see that file's
 *  `runCell`'s own `attempts: (ok || cell.collectAttemptTelemetry) ? attempts : undefined`), so an
 *  unsolved canary cell -- the common case for a single hard representative level under one
 *  technique's limited budget -- legitimately has NO attempts array at all. Checking for that would
 *  misfire constantly, unlike verifyCanaryCells's identical-looking check, which is safe there
 *  because portfolio-solve-sweep-lib.mjs always populates attempts regardless of outcome. Uses
 *  `nodesExpanded > 0` instead as this shape's "real search work happened" signal. */
export function verifyTechniqueCensusCells(cells) {
    if (!Array.isArray(cells) || cells.length === 0) {
        return { ok: false, failures: ['canary report has no cells -- nothing was verified'] };
    }
    const failures = [];
    for (const cell of cells) {
        const label = cell?.cellId ?? (cell?.levelId ?? cell?.levelPos != null ? `L${cell.levelId ?? cell.levelPos}` : '(unidentified cell)');
        if (typeof cell?.ok !== 'boolean') failures.push(`${label}: missing/non-boolean "ok" field`);
        if (typeof cell?.status !== 'string' || !cell.status) failures.push(`${label}: missing/empty "status" field`);
        if (cell?.status === 'error') {
            failures.push(`${label}: cell raised an error (status=error${cell?.error ? `, error=${JSON.stringify(cell.error)}` : ''}) -- the resolved plan/technique config cannot run at all`);
        }
        if (typeof cell?.nodesExpanded !== 'number' || cell.nodesExpanded <= 0) {
            failures.push(`${label}: nodesExpanded is ${cell?.nodesExpanded ?? '(missing)'} -- expected real search work (>0 nodes), which a technique-key parse failure or an empty resolved technique list would both silently produce as zero`);
        }
        if (cell?.workSpent != null && typeof cell.workSpent !== 'number') failures.push(`${label}: "workSpent" present but not a number`);
    }
    return { ok: failures.length === 0, failures };
}

export function verifyNoDeadlineTruncation(levels) {
    const truncated = (levels ?? []).filter(row => row?.deadlineTruncated).map(row => row?.id ?? `L${row?.level}`);
    if (truncated.length === 0) return { ok: true, failures: [] };
    return {
        ok: false,
        failures: [`deadlineTruncated=true on: ${truncated.join(', ')} -- the wall-clock deadline fired on a tiny canary population, which should never happen if it is meant to be non-binding relative to the node/work budget. Check budget_ms is not accidentally too small (e.g. seconds instead of ms) before scaling.`],
    };
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const resultFile = args.get('result');
    if (!resultFile) throw new Error('--result=<canary output.json> is required');
    const mode = args.get('mode') || 'sweep';
    const data = JSON.parse(fs.readFileSync(resultFile, 'utf8'));

    if (mode === 'technique-census') {
        const cells = data.results;
        const structural = verifyTechniqueCensusCells(cells);
        if (!structural.ok) {
            console.error('Execution-family canary FAILED -- the resolved plan/technique config is not safe to scale to a full matrix:');
            for (const f of structural.failures) console.error(`  - ${f}`);
            process.exitCode = 2;
            return;
        }
        console.log(`Execution-family canary OK: ${cells.length} representative cell(s) ran under the resolved plan with no errors, real search work, and well-formed output.`);
        return;
    }
    if (mode !== 'sweep') throw new Error(`--mode must be "sweep" (default) or "technique-census", got "${mode}"`);

    const levels = data.levels;
    const structural = verifyCanaryCells(levels);
    const failures = [...structural.failures];
    if (args.get('expect-no-deadline-truncation') === 'true') {
        failures.push(...verifyNoDeadlineTruncation(levels).failures);
    }

    if (failures.length > 0) {
        console.error('Execution-family canary FAILED -- the resolved config is not safe to scale to a full matrix:');
        for (const f of failures) console.error(`  - ${f}`);
        process.exitCode = 2;
        return;
    }
    console.log(`Execution-family canary OK: ${levels.length} representative level(s) solved under the resolved config with no errors, nonzero attempts, and well-formed output.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try { main(); } catch (error) { console.error(`verify-canary-cell: ${error.message}`); process.exit(2); }
}
