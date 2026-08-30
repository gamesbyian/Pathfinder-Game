#!/usr/bin/env node
/** Builds+validates a round of explicit-prefix CP-SAT cases from a repair-elite-path-dump.mjs
 * output, given a JSON probe list [{eliteId, depth}]. Validates every prefix replays legally
 * against the native solver before writing (same check cpsat-explicit-prefix-reference.mjs itself
 * performs, done here so we don't burn CI time on an illegal prefix). Used to build the
 * coarse-to-fine/binary-search rounds for item C (repair-retreat exact minimum rollback). */
import { readFileSync, writeFileSync } from 'node:fs';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [key, ...rest] = x.split('='); return [key, rest.join('=')];
}));
const dumpFile = args.get('--dump') ?? '/tmp/elite-paths.json';
const probesFile = args.get('--probes');
const outFile = args.get('--out');
const corpus = args.get('--corpus') ?? 'data/stress/stress-levels-random.json';
const roundTag = args.get('--round') ?? 'roundX';

const dump = JSON.parse(readFileSync(dumpFile, 'utf8'));
const probes = JSON.parse(readFileSync(probesFile, 'utf8'));

const eliteById = new Map();
for (const lvl of dump.levels) for (const e of lvl.elites) eliteById.set(e.id, { ...e, levelId: lvl.levelId, reqLen: lvl.reqLen });

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const Solver = createSolver();
const levelCache = new Map();
const prepCache = new Map();
const loadRaw = (corpusFile, levelId) => {
    const doc = JSON.parse(readFileSync(corpusFile, 'utf8'));
    const levels = Array.isArray(doc) ? doc : doc.levels;
    const raw = levels.find(l => String(l.id) === String(levelId));
    if (!raw) throw new Error(`${levelId} not found in ${corpusFile}`);
    return raw;
};
const prepareReplay = (levelId) => {
    if (!levelCache.has(levelId)) levelCache.set(levelId, Solver.prepareLevelForSolver(loadRaw(corpus, levelId), { source: 'raw' }));
    const level = levelCache.get(levelId);
    if (!prepCache.has(levelId)) { const prep = api.prepLevel(level); prep._cfg = null; prepCache.set(levelId, prep); }
    return { level, prep: prepCache.get(levelId) };
};
const replayPrefix = (levelId, keys) => {
    const { level, prep } = prepareReplay(levelId);
    if (!prep.gateFlags[keys[0]]) return { ok: false, reason: 'prefix-does-not-start-at-gate' };
    const state = api.createState(keys[0], level, prep);
    for (let i = 1; i < keys.length; i++) {
        const from = state.path.at(-1), next = keys[i];
        if (!api.getNeighbors(from, state, level, prep).includes(next)) return { ok: false, reason: 'illegal-native-step', invalidAt: i, from, next };
        const portal = level.portalMap.get(from);
        api.applyMove(next, state, level, prep, !!(portal && portal.dest === next));
    }
    return { ok: true };
};

const cases = [];
for (const probe of probes) {
    const elite = eliteById.get(probe.eliteId);
    if (!elite) throw new Error(`unknown eliteId ${probe.eliteId}`);
    if (probe.depth < 0 || probe.depth > elite.eliteLength) throw new Error(`${probe.eliteId} depth ${probe.depth} out of range [0,${elite.eliteLength}]`);
    const prefix = elite.path.slice(0, probe.depth + 1);
    const legality = replayPrefix(elite.levelId, prefix);
    if (!legality.ok) throw new Error(`INVALID PREFIX for ${probe.eliteId} depth=${probe.depth}: ${JSON.stringify(legality)}`);
    const id = `${elite.levelId}:${roundTag}:${probe.eliteId.split(':').at(-1)}:depth${probe.depth}`;
    cases.push({ id, levelId: elite.levelId, prefix, _eliteId: probe.eliteId, _depth: probe.depth, _eliteLength: elite.eliteLength, _reqLen: elite.reqLen });
    console.error(`OK ${id} (${prefix.length} cells, depth=${probe.depth}/${elite.eliteLength})`);
}

const document = { corpus, cases: cases.map(({ id, levelId, prefix }) => ({ id, levelId, prefix })) };
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
// Keep the metadata-annotated version alongside for local bookkeeping.
writeFileSync(outFile.replace(/\.json$/, '.meta.json'), JSON.stringify(cases, null, 2));
console.log(`Wrote ${outFile} (${cases.length} cases, all locally replay-legal)`);
