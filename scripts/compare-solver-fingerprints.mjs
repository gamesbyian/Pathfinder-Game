#!/usr/bin/env node
/**
 * Compare solver-fingerprint JSON files and report determinism differences.
 *
 * Usage:
 *   node scripts/compare-solver-fingerprints.mjs base.json other.json [more.json ...]
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const files = process.argv.slice(2);
if (files.length < 2) {
    console.error('usage: node scripts/compare-solver-fingerprints.mjs base.json other.json [more.json ...]');
    process.exit(2);
}

const load = file => ({ file, data: JSON.parse(readFileSync(file, 'utf8')) });
const [base, ...others] = files.map(load);
const byLevel = run => new Map((run.data.results || []).map(r => [r.level, r]));
const baseLevels = byLevel(base);

const comparableFields = [
    'ok',
    'status',
    'refereeValid',
    'solutionHash',
    'solutionLength',
    'winningStrategy',
    'winnerIndex',
    'attemptCount',
    'attemptHash',
    'nodesExpanded',
];

function diffRun(run) {
    const current = byLevel(run);
    const diffs = [];
    for (const [level, baseRecord] of baseLevels) {
        const now = current.get(level);
        if (!now) {
            diffs.push({ severity: 'critical', level, field: 'presence', base: 'present', now: 'missing' });
            continue;
        }
        for (const field of comparableFields) {
            if (baseRecord[field] !== now[field]) {
                const severity = ['ok', 'status', 'refereeValid', 'solutionHash'].includes(field)
                    ? 'critical'
                    : ['winningStrategy', 'winnerIndex', 'attemptCount', 'attemptHash'].includes(field)
                        ? 'strong'
                        : 'medium';
                diffs.push({ severity, level, field, base: baseRecord[field], now: now[field] });
            }
        }
    }
    for (const [level] of current) {
        if (!baseLevels.has(level)) diffs.push({ severity: 'critical', level, field: 'presence', base: 'missing', now: 'present' });
    }
    return diffs.sort((a, b) => a.level - b.level || a.field.localeCompare(b.field));
}

const summarize = diffs => {
    const counts = { critical: 0, strong: 0, medium: 0 };
    for (const d of diffs) counts[d.severity]++;
    return counts;
};

console.log(`Base: ${base.file}`);
console.log(`  ${base.data.summary?.solved}/${base.data.summary?.total} solved, ${(base.data.summary?.totalMs / 1000).toFixed(3)}s, nodes=${base.data.summary?.totalNodesExpanded}`);

let exitCode = 0;
for (const run of others) {
    const diffs = diffRun(run);
    const counts = summarize(diffs);
    console.log(`\nCompare: ${run.file}`);
    console.log(`  ${run.data.summary?.solved}/${run.data.summary?.total} solved, ${(run.data.summary?.totalMs / 1000).toFixed(3)}s, nodes=${run.data.summary?.totalNodesExpanded}`);
    console.log(`  diffs: critical=${counts.critical}, strong=${counts.strong}, medium=${counts.medium}`);
    if (diffs.length) {
        const bySeverity = {
            critical: diffs.filter(d => d.severity === 'critical'),
            strong: diffs.filter(d => d.severity === 'strong'),
            medium: diffs.filter(d => d.severity === 'medium'),
        };
        for (const severity of ['critical', 'strong', 'medium']) {
            if (!bySeverity[severity].length) continue;
            console.log(`  ${severity}:`);
            for (const d of bySeverity[severity]) {
                console.log(`    L${d.level} ${d.field}: ${JSON.stringify(d.base)} -> ${JSON.stringify(d.now)}`);
            }
        }
    }
    if (counts.critical || counts.strong || counts.medium) exitCode = 1;
}

const baseName = path.basename(base.file);
if (!baseName) process.exit(exitCode);
process.exit(exitCode);
