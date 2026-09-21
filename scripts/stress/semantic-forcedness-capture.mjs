#!/usr/bin/env node
/**
 * Production-inert semantic-forcedness capture.
 *
 * Captures beam parent expansions where ordinary hard pruning leaves 2..N surviving children,
 * then emits every surviving child path as a generic explicit-prefix case for the existing
 * cpsat-explicit-prefix-reference workflow. It does NOT run CP-SAT and does not alter search.
 *
 * Opportunity question:
 *   when production sees several syntactically viable children, is exactly one actually completable?
 *
 * Population selection belongs outside this script. Use --levels or --levels-file with a frozen,
 * outcome-independent parent population.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.js';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
    const hit = argv.find(value => value.startsWith(`--${name}=`));
    return hit === undefined ? fallback : hit.slice(name.length + 3);
};

function readLevelIds() {
    const explicit = String(arg('levels', '')).split(',').map(value => value.trim()).filter(Boolean);
    const file = arg('levels-file', null);
    if (!file) return explicit;
    const doc = JSON.parse(readFileSync(path.resolve(file), 'utf8'));
    const source = Array.isArray(doc) ? doc : (doc.levelIds ?? doc.ids ?? doc.levels);
    if (!Array.isArray(source)) throw new Error('--levels-file must be an array or contain levelIds/ids/levels');
    const fromFile = source.map(row => String(typeof row === 'object' ? row.id : row)).filter(Boolean);
    return [...explicit, ...fromFile];
}

function loadCorpora(files) {
    const byId = new Map();
    for (const file of files) {
        const doc = JSON.parse(readFileSync(path.resolve(file), 'utf8'));
        const rows = Array.isArray(doc) ? doc : doc.levels;
        if (!Array.isArray(rows)) throw new Error(`corpus ${file} must be an array or {levels:[...]}`);
        for (const row of rows) {
            const id = String(row?.id ?? '');
            if (id && !byId.has(id)) byId.set(id, { row, corpus: file });
        }
    }
    return byId;
}

const pathId = pathValue => JSON.stringify(pathValue);

function createCollector({ minChildren, maxChildren }) {
    const groups = new Map();
    let generatedRecords = 0;
    return {
        observe(record) {
            if (record.stage !== 'generated') return;
            const parentRows = record.details?.parentExpansions;
            if (!Array.isArray(parentRows) || !Array.isArray(record.paths)) return;
            generatedRecords++;

            const childrenByParent = new Map();
            for (const child of record.paths) {
                if (!Array.isArray(child) || child.length < 2) continue;
                const parent = child.slice(0, -1);
                const id = pathId(parent);
                const bucket = childrenByParent.get(id) ?? [];
                bucket.push(child);
                childrenByParent.set(id, bucket);
            }

            for (const row of parentRows) {
                if (!Array.isArray(row.path)) continue;
                const id = pathId(row.path);
                const children = childrenByParent.get(id) ?? [];
                if (children.length < minChildren || children.length > maxChildren) continue;
                groups.set(id, {
                    parentPath: row.path,
                    depth: row.path.length - 1,
                    parentExpansionWork: Number(row.workSpent) || 0,
                    generatedCandidates: Number(row.generatedCandidates) || children.length,
                    children,
                });
            }
        },
        snapshot() {
            return { generatedRecords, groups: [...groups.values()] };
        },
    };
}

function selectGroups(groups, maxStates) {
    // Capture order is production generation order. Taking the first bounded eligible states is
    // deterministic and independent of exact child labels, which do not exist at capture time.
    return groups.slice(0, maxStates);
}

async function captureGate({ level, gateKey, profile, width, workBudget, budgetMs, minChildren, maxChildren, maxStates }) {
    const prep = SOLVER_TESTING_API.prepLevel(level);
    prep._cfg = null;
    prep._metrics = { nodesExpanded: 0 };
    const startWork = prep._workMeter.units;
    prep._workCap = startWork + workBudget;

    const collector = createCollector({ minChildren, maxChildren });
    prep._beamResearchObserver = {
        includeParentExpansionWork: true,
        observe(record) { collector.observe(record); },
    };

    const out = {};
    const startedAt = Date.now();
    const result = await SOLVER_TESTING_API.beamSearchFromGate(
        gateKey,
        level,
        prep,
        profile,
        budgetMs,
        startedAt,
        null,
        width,
        null,
        false,
        out,
        Infinity,
        undefined,
        undefined,
        true,
    );
    prep._beamResearchObserver = null;

    const snapshot = collector.snapshot();
    const selected = selectGroups(snapshot.groups, maxStates);
    const workSpent = prep._workMeter.units - startWork;
    return {
        gateKey,
        status: result ? 'solved'
            : out.pausedContinuation ? 'work-budget-phase-boundary'
            : out.timedOut ? 'timed-out'
            : 'exhausted',
        workSpent,
        workBudget,
        elapsedMs: Date.now() - startedAt,
        nodesExpanded: prep._metrics.nodesExpanded,
        generatedRecords: snapshot.generatedRecords,
        eligibleStateCount: snapshot.groups.length,
        selected,
    };
}

async function main() {
    installBrowserStubs();
    const Solver = createSolver();

    const corpusFiles = String(arg('corpora', arg('corpus', 'data/stress/stress-levels-random.json')))
        .split(',').map(value => value.trim()).filter(Boolean);
    const levelIds = readLevelIds();
    const profileName = String(arg('profile', 'objectiveFirst'));
    const width = Number(arg('width', 5000));
    const workBudget = Number(arg('work-budget', 5_000_000));
    const budgetMs = Number(arg('budget-ms', 600_000));
    const minChildren = Number(arg('min-children', 2));
    const maxChildren = Number(arg('max-children', 4));
    const maxStatesPerGate = Number(arg('max-states-per-gate', 5));
    const outFile = arg('out', null);
    const casesFile = arg('cases-out', null);

    if (!outFile || !casesFile) throw new Error('--out and --cases-out are required');
    if (!levelIds.length) throw new Error('--levels or --levels-file must select at least one level');
    if (new Set(levelIds).size !== levelIds.length) throw new Error('selected level ids contain duplicates');
    for (const [name, value] of [['width', width], ['work-budget', workBudget], ['min-children', minChildren],
        ['max-children', maxChildren], ['max-states-per-gate', maxStatesPerGate]]) {
        if (!Number.isSafeInteger(value) || value < 1) throw new Error(`--${name} must be a positive integer`);
    }
    if (minChildren < 2 || maxChildren < minChildren) throw new Error('child bounds must satisfy 2 <= min <= max');
    if (!Number.isFinite(budgetMs) || budgetMs <= 0) throw new Error('--budget-ms must be positive');

    const profile = SOLVER_TESTING_API.SCORING_PROFILES[profileName];
    if (!profile) throw new Error(`unknown scoring profile: ${profileName}`);

    const byId = loadCorpora(corpusFiles);
    const missing = levelIds.filter(id => !byId.has(id));
    if (missing.length) throw new Error(`selected levels missing from corpora: ${missing.join(', ')}`);

    const parents = [];
    const cases = [];
    let selectedStates = 0;
    for (let i = 0; i < levelIds.length; i++) {
        const levelId = levelIds[i];
        const source = byId.get(levelId);
        const { id: _id, stressMeta: _stressMeta, ...rawLevel } = source.row;
        const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
        const gates = [];

        for (const gateKey of level.gateKeys) {
            const gate = await captureGate({
                level, gateKey, profile, width, workBudget, budgetMs,
                minChildren, maxChildren, maxStates: maxStatesPerGate,
            });
            gates.push(gate);
            for (let stateIndex = 0; stateIndex < gate.selected.length; stateIndex++) {
                const group = gate.selected[stateIndex];
                selectedStates++;
                const stateId = `${levelId}:g${gateKey}:s${stateIndex}:d${group.depth}`;
                group.stateId = stateId;
                group.childCaseIds = [];
                for (let childIndex = 0; childIndex < group.children.length; childIndex++) {
                    const id = `${stateId}:c${childIndex}`;
                    group.childCaseIds.push(id);
                    cases.push({
                        id,
                        levelId,
                        corpus: source.corpus,
                        prefix: group.children[childIndex],
                        source: {
                            kind: 'semantic-forcedness-child',
                            stateId,
                            childIndex,
                            parentExpansionWork: group.parentExpansionWork,
                            survivingChildCount: group.children.length,
                        },
                    });
                }
            }
        }
        parents.push({ levelId, gates });
        console.log(`[${i + 1}/${levelIds.length}] ${levelId}: selectedStates=${gates.reduce((n, g) => n + g.selected.length, 0)}`);
    }

    const capture = {
        schemaVersion: 1,
        kind: 'pathfinder-semantic-forcedness-capture',
        evidenceRole: 'development',
        premiseUse: 'oracle-ceiling-opportunity-sizing-only',
        protocol: {
            corpusFiles, levelIds, profile: profileName, width, workBudget, budgetMs,
            minChildren, maxChildren, maxStatesPerGate,
            selection: 'first eligible multi-successor parent states in production generation order; exact labels unavailable at capture',
        },
        summary: {
            parents: levelIds.length,
            selectedStates,
            childCases: cases.length,
        },
        parents,
    };
    const casesDocument = {
        schemaVersion: 1,
        kind: 'pathfinder-semantic-forcedness-explicit-prefix-cases',
        evidenceRole: 'development',
        corpus: corpusFiles.length === 1 ? corpusFiles[0] : null,
        cases,
    };

    for (const [file, doc] of [[outFile, capture], [casesFile, casesDocument]]) {
        mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
        writeFileSync(path.resolve(file), `${JSON.stringify(doc, null, 2)}\n`);
    }
    console.log(JSON.stringify({ out: outFile, casesOut: casesFile, ...capture.summary }, null, 2));
}

if (process.argv[1]
    && ['semantic-forcedness-capture.mjs', 'semantic-forcedness-capture.bundle.mjs'].includes(path.basename(process.argv[1]))
    && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main();
}
