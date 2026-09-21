#!/usr/bin/env node
/**
 * Initial-state presolve opportunity census.
 *
 * Production-inert. Measures two already-established exact consequences at the level/gate boundary:
 *
 * P1: all-gates ordinary parity infeasibility on levels with no twist portal pair.
 * P3: BC1 bridge-excursion conflicts at the initial gate state, after ordinary connectivity passes.
 *
 * This script does not alter solve decisions and does not infer that either check is economical.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';

import { createSolver, SOLVER_TESTING_API } from '../modules/solver.js';
import { describeStaticParityStructure } from '../modules/solver/parity-structure.js';
import { findBridgeExcursionConflicts } from './stress/cut-bridge-excursion-lib.mjs';

function parseArgs(argv) {
    const out = new Map();
    for (const arg of argv) {
        if (!arg.startsWith('--')) continue;
        const eq = arg.indexOf('=');
        out.set(eq >= 0 ? arg.slice(0, eq) : arg, eq >= 0 ? arg.slice(eq + 1) : true);
    }
    return out;
}

function loadLevels(filePath) {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : parsed.levels;
}

function summarizeTimes(values) {
    if (!values.length) return { n: 0, totalMs: 0, medianMs: 0, p90Ms: 0, maxMs: 0 };
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const p90 = sorted[Math.floor((sorted.length - 1) * 0.9)];
    return {
        n: values.length,
        totalMs: +values.reduce((a, b) => a + b, 0).toFixed(3),
        medianMs: +median.toFixed(4),
        p90Ms: +p90.toFixed(4),
        maxMs: +sorted.at(-1).toFixed(4),
    };
}

export function analyzeInitialPresolveOpportunities(rawLevels, {
    start = 1,
    count = Infinity,
    stride = 1,
} = {}) {
    if (!Array.isArray(rawLevels)) throw new Error('rawLevels must be an array');
    const Solver = createSolver();
    const rows = [];
    const prepTimes = [];
    const parityTimes = [];
    const bc1Times = [];

    for (let position = start; position <= rawLevels.length && rows.length < count; position += stride) {
        const rawSource = rawLevels[position - 1];
        const { stressMeta: _stressMeta, ...raw } = rawSource;

        let level;
        try {
            level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber: position });
        } catch (error) {
            rows.push({ position, id: rawSource?.id ?? null, error: `normalize: ${error?.message ?? error}` });
            continue;
        }

        let started = performance.now();
        const prep = SOLVER_TESTING_API.prepLevel(level);
        prepTimes.push(performance.now() - started);
        prep._cfg = null;
        prep._metrics = { nodesExpanded: 0 };

        started = performance.now();
        const parity = describeStaticParityStructure(level);
        const noTwist = parity.twistPortalPairs.length === 0;
        const parityFeasibleGateKeys = noTwist
            ? parity.gateRequiredTwistParity.filter(row => row.requiredTwistParity === 0).map(row => row.gateKey)
            : level.gateKeys;
        const allGatesParityInfeasible = noTwist && level.gateKeys.length > 0 && parityFeasibleGateKeys.length === 0;
        parityTimes.push(performance.now() - started);

        let connectivityPassingGates = 0;
        let bc1ConflictGates = 0;
        let bc1ConflictCount = 0;
        let bridgeCount = 0;
        const gateRows = [];

        for (const gateKey of level.gateKeys) {
            const state = SOLVER_TESTING_API.createState(gateKey, level, prep);
            started = performance.now();
            const snapshot = SOLVER_TESTING_API.connectivityResearchSnapshot(gateKey, state, level, prep);
            let theorem = {
                eligible: false,
                reason: 'ordinary-connectivity-fails',
                bridges: [],
                conflicts: [],
            };
            if (snapshot.connected) {
                connectivityPassingGates++;
                theorem = findBridgeExcursionConflicts({
                    nodes: snapshot.nodes,
                    edges: snapshot.edges,
                    current: snapshot.current,
                    goal: snapshot.goal,
                    pendingMandatory: snapshot.pendingMandatory,
                });
            }
            bc1Times.push(performance.now() - started);

            if (theorem.conflicts.length > 0) {
                bc1ConflictGates++;
                bc1ConflictCount += theorem.conflicts.length;
            }
            bridgeCount += theorem.bridges.length;

            gateRows.push({
                gateKey,
                ordinaryConnectivityPass: snapshot.connected,
                reachedNodes: snapshot.nodes.length,
                transitionResources: snapshot.edges.length,
                pendingMandatory: snapshot.pendingMandatory.length,
                bridgeCount: theorem.bridges.length,
                conflictCount: theorem.conflicts.length,
                conflicts: theorem.conflicts,
            });
        }

        rows.push({
            position,
            id: rawSource?.id ?? null,
            gateCount: level.gateKeys.length,
            twistPortalPairs: parity.twistPortalPairs.length,
            noTwist,
            parityFeasibleGateCount: parityFeasibleGateKeys.length,
            allGatesParityInfeasible,
            connectivityPassingGates,
            bc1ConflictGates,
            bc1ConflictCount,
            bridgeCount,
            bc1AnyConflict: bc1ConflictGates > 0,
            bc1AllConnectivityPassingGatesConflict:
                connectivityPassingGates > 0 && bc1ConflictGates === connectivityPassingGates,
            gates: gateRows,
        });
    }

    const valid = rows.filter(row => !row.error);
    const parityRows = valid.filter(row => row.allGatesParityInfeasible);
    const bc1Rows = valid.filter(row => row.bc1AnyConflict);
    const bc1AllRows = valid.filter(row => row.bc1AllConnectivityPassingGatesConflict);

    return {
        schemaVersion: 1,
        kind: 'pathfinder-initial-presolve-opportunity-census',
        evidenceRole: 'development-opportunity-census',
        inferenceScope: 'initial-state exact parity and BC1 opportunity only; no production treatment',
        selection: { start, count: Number.isFinite(count) ? count : null, stride },
        summary: {
            rows: rows.length,
            validRows: valid.length,
            errors: rows.length - valid.length,
            noTwistRows: valid.filter(row => row.noTwist).length,
            allGatesParityInfeasibleRows: parityRows.length,
            bc1AnyConflictRows: bc1Rows.length,
            bc1AllConnectivityPassingGatesConflictRows: bc1AllRows.length,
            connectivityPassingGates: valid.reduce((sum, row) => sum + row.connectivityPassingGates, 0),
            bc1ConflictGates: valid.reduce((sum, row) => sum + row.bc1ConflictGates, 0),
            timings: {
                prep: summarizeTimes(prepTimes),
                parity: summarizeTimes(parityTimes),
                bc1IncludingConnectivitySnapshot: summarizeTimes(bc1Times),
            },
        },
        rows,
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const root = new URL('..', import.meta.url).pathname;
    const corpusPath = path.resolve(root, String(args.get('--corpus') || 'data/stress/stress-levels-random.json'));
    const outPath = path.resolve(String(args.get('--out') || path.join(root, 'tmp', 'initial-presolve-census.json')));
    const rawLevels = loadLevels(corpusPath);
    const report = analyzeInitialPresolveOpportunities(rawLevels, {
        start: Math.max(1, Number(args.get('--start') || 1)),
        count: args.has('--count') ? Math.max(1, Number(args.get('--count'))) : Infinity,
        stride: Math.max(1, Number(args.get('--stride') || 1)),
    });
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ corpus: corpusPath, out: outPath, ...report.summary }, null, 2));
}

if (process.argv[1] && path.basename(process.argv[1]).includes('initial-presolve-opportunity-census')) {
    await main();
}
