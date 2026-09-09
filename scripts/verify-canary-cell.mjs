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
    if (!resultFile) throw new Error('--result=<canary sweep output.json> is required');
    const data = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
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
