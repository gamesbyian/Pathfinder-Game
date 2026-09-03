#!/usr/bin/env node
/**
 * Combine static-portfolio-plan shard results (scripts/technique-census.mjs run against a
 * scripts/build-static-portfolio-plan.mjs plan) into one aggregate report: per-arm coverage/work,
 * and an explicit pairwise comparison against a named control arm.
 *
 * Deliberately NOT a reuse of combine-technique-census-shards.mjs: that combiner is tightly coupled
 * to technique-census's own T1-T4 tier semantics, baseline-solved bookkeeping, and hint capture,
 * none of which apply to a fixed-arm coverage/work comparison. technique-census.mjs's shard EXECUTION
 * stage is already fully generic (it just runs whatever cells the plan lists) and is reused as-is;
 * only the plan-building and combine stages needed a dedicated, purpose-built counterpart.
 *
 * Usage:
 *   node scripts/combine-static-portfolio-shards.mjs \
 *     --staging-dir=artifact-staging --control-arm=full-menu \
 *     --plan=path/to/plan.json --out=path/to/combined.json --summary-out=path/to/combined-summary.md
 *
 * --staging-dir: a directory (searched recursively) containing shard output files, each shaped like
 * technique-census.mjs's own --out writer: { shard, shards, results: [...] }.
 * --plan (optional): if given, the combiner verifies every plan cellId appears in exactly one shard
 * result and fails loudly on any missing/duplicated cell instead of silently reporting a partial
 * population as if it were complete.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

function findShardFiles(dir) {
    const out = [];
    const entries = readdirSync(dir);
    for (const name of entries) {
        const full = path.join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) out.push(...findShardFiles(full));
        else if (name.endsWith('.json')) out.push(full);
    }
    return out;
}

/**
 * @param {Array<{ results: object[] }>} shardOutputs
 * @param {string} controlArm
 * @param {{ cells: object[] } | null} [plan]
 */
export function combine(shardOutputs, controlArm, plan = null) {
    const results = shardOutputs.flatMap((s) => s.results ?? []);
    if (results.length === 0) throw new Error('combine: no results found across any shard output');

    if (plan) {
        const expected = new Set(plan.cells.map((c) => c.cellId));
        const seen = new Map();
        for (const r of results) seen.set(r.cellId, (seen.get(r.cellId) ?? 0) + 1);
        const missing = [...expected].filter((id) => !seen.has(id));
        const duplicated = [...seen.entries()].filter(([, count]) => count > 1).map(([id]) => id);
        const unexpected = [...seen.keys()].filter((id) => !expected.has(id));
        if (missing.length || duplicated.length || unexpected.length) {
            throw new Error(`combine: incomplete/inconsistent coverage against the plan — `
                + `${missing.length} missing, ${duplicated.length} duplicated, ${unexpected.length} unexpected cellIds. `
                + `First few missing: ${missing.slice(0, 5).join(', ')}`);
        }
    }

    const byArm = new Map();
    for (const r of results) {
        const arm = r.variantLabel;
        if (!byArm.has(arm)) byArm.set(arm, []);
        byArm.get(arm).push(r);
    }

    const arms = [...byArm.keys()].sort();
    const armSummaries = arms.map((arm) => {
        const rows = byArm.get(arm);
        const solvedLevels = rows.filter((r) => r.ok).map((r) => r.levelId).sort();
        const work = rows.reduce((sum, r) => sum + (r.workSpent ?? 0), 0);
        const statusCounts = {};
        for (const r of rows) statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
        // solvedWorkStats (2026-09-03, additive): min/median/mean/max workSpent among only the
        // SOLVED cells, not the arm's aggregate `work` above (which is dominated by censored/
        // unsolved cells at whatever cap the run used and cannot answer "what does this technique
        // actually cost when it succeeds"). Motivated directly by admissible-order-profile-cost-
        // probe-001 (2026-09-03): the raw per-cell shard artifacts needed to compute this after the
        // fact are blocked by this environment's own egress policy (blob-storage host denied by
        // organization policy, the same block every prior report in this research line already
        // documents), but the combine job's own console log/summary-out file IS always reachable —
        // so this statistic belongs in that summary, not only in the blocked raw JSON, or every
        // future cost-characterization probe has to re-derive it by hand from aggregate counts.
        // `null` when zero cells solved (nothing to summarize, not a zero/NaN placeholder).
        const solvedWork = rows.filter((r) => r.ok).map((r) => r.workSpent ?? 0).sort((x, y) => x - y);
        const solvedWorkStats = solvedWork.length === 0 ? null : {
            count: solvedWork.length,
            min: solvedWork[0],
            median: solvedWork.length % 2 === 1
                ? solvedWork[(solvedWork.length - 1) / 2]
                : (solvedWork[solvedWork.length / 2 - 1] + solvedWork[solvedWork.length / 2]) / 2,
            mean: solvedWork.reduce((sum, w) => sum + w, 0) / solvedWork.length,
            max: solvedWork[solvedWork.length - 1],
        };
        return { arm, cells: rows.length, solved: solvedLevels.length, solvedLevels, work, statusCounts, solvedWorkStats };
    });

    const controlSummary = armSummaries.find((a) => a.arm === controlArm);
    if (!controlSummary) throw new Error(`combine: control arm "${controlArm}" not present among arms [${arms.join(', ')}]`);
    const controlSolved = new Set(controlSummary.solvedLevels);

    const comparisons = armSummaries.filter((a) => a.arm !== controlArm).map((a) => {
        const treatmentSolved = new Set(a.solvedLevels);
        const gained = a.solvedLevels.filter((id) => !controlSolved.has(id));
        const lost = controlSummary.solvedLevels.filter((id) => !treatmentSolved.has(id));
        return {
            arm: a.arm, controlArm,
            gained, lost,
            workDelta: a.work - controlSummary.work,
            workDeltaFraction: controlSummary.work ? (a.work - controlSummary.work) / controlSummary.work : null,
        };
    });

    return { schemaVersion: 1, controlArm, totalCells: results.length, armSummaries, comparisons };
}

function toMarkdown(result) {
    const lines = [];
    lines.push(`Control arm: \`${result.controlArm}\`. Total cells: ${result.totalCells}.`);
    lines.push('');
    lines.push('| arm | cells | solved | work |');
    lines.push('|---|---:|---:|---:|');
    for (const a of result.armSummaries) {
        lines.push(`| \`${a.arm}\` | ${a.cells} | ${a.solved} | ${a.work.toLocaleString('en-US')} |`);
    }
    lines.push('');
    // Only worth a second table when at least one arm solved something and workSpent is even
    // recorded (workBudget-mode cells only — see technique-census-cell.mjs; node-budget-only cells
    // never carry workSpent, so solvedWorkStats is null for every arm in that mode).
    if (result.armSummaries.some((a) => a.solvedWorkStats)) {
        lines.push('workSpent among solved cells only (not the aggregate `work` column above, which is dominated by censored/unsolved cells):');
        lines.push('');
        lines.push('| arm | solved | min | median | mean | max |');
        lines.push('|---|---:|---:|---:|---:|---:|');
        for (const a of result.armSummaries) {
            const s = a.solvedWorkStats;
            lines.push(s
                ? `| \`${a.arm}\` | ${s.count} | ${s.min.toLocaleString('en-US')} | ${s.median.toLocaleString('en-US')} | ${Math.round(s.mean).toLocaleString('en-US')} | ${s.max.toLocaleString('en-US')} |`
                : `| \`${a.arm}\` | 0 | n/a | n/a | n/a | n/a |`);
        }
        lines.push('');
    }
    for (const c of result.comparisons) {
        lines.push(`### \`${c.arm}\` vs. \`${c.controlArm}\``);
        lines.push('');
        lines.push(`Gained (${c.gained.length}): ${c.gained.join(', ') || 'none'}`);
        lines.push('');
        lines.push(`Lost (${c.lost.length}): ${c.lost.join(', ') || 'none'}`);
        lines.push('');
        lines.push(`Work delta: ${c.workDelta.toLocaleString('en-US')} (${c.workDeltaFraction === null ? 'n/a' : (c.workDeltaFraction * 100).toFixed(2) + '%'})`);
        lines.push('');
    }
    return lines.join('\n');
}

// ─── CLI ──────────────────────────────────────────────────────────────────────
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
    const args = process.argv.slice(2);
    const argMap = new Map(args.filter((a) => a.startsWith('--') && a.includes('=')).map((a) => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
    const root = new URL('..', import.meta.url).pathname;
    const stagingDir = argMap.get('--staging-dir');
    const controlArm = argMap.get('--control-arm');
    const planPath = argMap.get('--plan');
    const outFile = argMap.get('--out');
    const summaryOutFile = argMap.get('--summary-out') || (outFile ? outFile.replace(/\.json$/u, '-summary.md') : null);
    if (!stagingDir || !controlArm || !outFile) {
        console.error('Usage: --staging-dir=<dir> --control-arm=<name> --out=<path> [--plan=<path>] [--summary-out=<path>]');
        process.exit(1);
    }
    const shardFiles = findShardFiles(path.resolve(root, stagingDir));
    if (shardFiles.length === 0) { console.error(`combine: no .json files found under ${stagingDir}`); process.exit(1); }
    const shardOutputs = shardFiles.map((f) => JSON.parse(readFileSync(f, 'utf8')));
    const plan = planPath ? JSON.parse(readFileSync(path.resolve(root, planPath), 'utf8')) : null;
    const result = combine(shardOutputs, controlArm, plan);

    mkdirSync(path.dirname(path.resolve(root, outFile)), { recursive: true });
    writeFileSync(path.resolve(root, outFile), JSON.stringify(result, null, 2) + '\n');
    if (summaryOutFile) writeFileSync(path.resolve(root, summaryOutFile), toMarkdown(result));
    console.log(`Combined ${shardFiles.length} shard file(s), ${result.totalCells} cells, ${result.armSummaries.length} arms. Wrote ${outFile}${summaryOutFile ? ` and ${summaryOutFile}` : ''}.`);
}
