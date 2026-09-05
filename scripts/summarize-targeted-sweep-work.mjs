#!/usr/bin/env node
/**
 * Prints an aggregate/per-level workSpent and per-stage reach/participation/solve breakdown for a
 * combine-solver-sweep-reports.mjs-shaped {levels:[...]} report, straight to stdout (the job log).
 *
 * Why this exists: this environment's egress policy blocks the Azure blob-storage host GitHub Actions
 * artifact downloads redirect to, so a workflow's uploaded targeted-sweep-combined.json artifact is
 * not retrievable from here (see reports/2026-09-05-admissible-order-non-default-retry-repricing-
 * confirmation-006.md's "What this does not establish"). Printing the numbers a scheduler-repricing
 * A/B needs (aggregate/per-level workSpent, which additive-tier stages were reached/attempted/won)
 * directly into the job log sidesteps that entirely — the log is fetched over the GitHub API, not a
 * blob-storage redirect.
 *
 * Usage: node scripts/summarize-targeted-sweep-work.mjs --in=<combined.json> [--stage=<stageId>]
 * --stage (repeatable via comma-separated list) additionally prints a per-level line for each named
 * stage's reach/attempts/nodesExpanded/solved on every level, on top of the population-wide per-stage
 * table this always prints.
 */
import { readFileSync } from 'node:fs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const inFile = args.get('--in');
if (!inFile) {
    console.error('Usage: node scripts/summarize-targeted-sweep-work.mjs --in=<combined.json> [--stage=<stageId>[,<stageId>...]]');
    process.exit(2);
}
const highlightStages = (args.get('--stage') || '').split(',').map(s => s.trim()).filter(Boolean);

const data = JSON.parse(readFileSync(inFile, 'utf8'));
const levels = data.levels;
if (!Array.isArray(levels)) throw new Error(`${inFile}: expected {levels:[...]}`);

const withWork = levels.filter(l => Number.isFinite(l.workSpent));
const solved = levels.filter(l => l.ok);
const unsolved = levels.filter(l => !l.ok);
const sum = arr => arr.reduce((a, l) => a + l.workSpent, 0);

console.log('=== Aggregate workSpent ===');
console.log(`Levels: ${levels.length} total, ${solved.length} solved, ${unsolved.length} unsolved, ${withWork.length}/${levels.length} report a non-null workSpent`);
console.log(`Aggregate workSpent (all levels with a value): ${sum(withWork).toLocaleString()}`);
console.log(`Aggregate workSpent (solved subset): ${sum(withWork.filter(l => l.ok)).toLocaleString()}`);
console.log(`Aggregate workSpent (unsolved subset): ${sum(withWork.filter(l => !l.ok)).toLocaleString()}`);
console.log(`Aggregate nodesExpanded (all levels): ${levels.reduce((a, l) => a + (l.nodesExpanded || 0), 0).toLocaleString()}`);

const statusCounts = new Map();
for (const l of unsolved) statusCounts.set(l.status, (statusCounts.get(l.status) || 0) + 1);
console.log(`Unsolved status breakdown: ${[...statusCounts.entries()].map(([s, n]) => `${s}=${n}`).join(', ') || '(none unsolved)'}`);

const errored = levels.filter(l => l.hadAttemptError || l.error);
const truncated = levels.filter(l => l.deadlineTruncated);
console.log(`Levels with an attempt error: ${errored.length}${errored.length ? ' (' + errored.map(l => l.id).join(', ') + ')' : ''}`);
console.log(`Levels with deadlineTruncated=true: ${truncated.length}${truncated.length ? ' (' + truncated.map(l => l.id).join(', ') + ')' : ''}`);

// Per-stage reach/participation/solve table, derived from every attempt's stageId across the
// population (attempts[].stageId; see modules/solver/orchestration.ts's withSolverStage()/buildRow()).
const stageStats = new Map();
for (const level of levels) {
    const seenThisLevel = new Set();
    for (const attempt of level.attempts || []) {
        const stageId = attempt.stageId;
        if (!stageId) continue;
        if (!stageStats.has(stageId)) stageStats.set(stageId, { reach: 0, attempts: 0, solves: 0, nodesExpanded: 0, solvedIds: [] });
        const s = stageStats.get(stageId);
        if (!seenThisLevel.has(stageId)) { s.reach += 1; seenThisLevel.add(stageId); }
        s.attempts += 1;
        s.nodesExpanded += attempt.nodesExpanded || 0;
        if (attempt.ok) { s.solves += 1; s.solvedIds.push(level.id); }
    }
}
console.log('\n=== Per-stage reach/participation/solve (population-wide) ===');
console.log('stage | reach (levels with >=1 attempt) | attempts | solves | aggregate nodesExpanded');
for (const [stageId, s] of [...stageStats.entries()].sort((a, b) => b[1].attempts - a[1].attempts)) {
    console.log(`${stageId} | ${s.reach}/${levels.length} | ${s.attempts} | ${s.solves}${s.solvedIds.length ? ' (' + s.solvedIds.join(', ') + ')' : ''} | ${s.nodesExpanded.toLocaleString()}`);
}

for (const stageId of highlightStages) {
    console.log(`\n=== Per-level detail for stage "${stageId}" ===`);
    console.log('id | ok | status | workSpent | reached | stageAttempts | stageNodesExpanded | stageSolved');
    for (const level of levels) {
        const stageAttempts = (level.attempts || []).filter(a => a.stageId === stageId);
        const reached = stageAttempts.length > 0;
        const stageNodes = stageAttempts.reduce((a, at) => a + (at.nodesExpanded || 0), 0);
        const stageSolved = stageAttempts.some(a => a.ok);
        console.log(`${level.id} | ${level.ok} | ${level.status} | ${level.workSpent ?? '(null)'} | ${reached} | ${stageAttempts.length} | ${stageNodes} | ${stageSolved}`);
    }
}
