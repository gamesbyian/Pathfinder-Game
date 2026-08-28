#!/usr/bin/env node
/**
 * Deterministically sample levels where an opt-in solver flag adds one exact attempt config.
 *
 * This is an offline, mechanics-only selector for development/confirmation planning. It does not
 * run the solver and does not inspect outcomes, hints, stress metadata, or historical evidence.
 *
 * Example:
 *   node scripts/run-bundled.mjs scripts/stress/select-attempt-exposure-sample.mjs -- \
 *     --corpus=data/stress/stress-levels-random.json \
 *     --enable-flag=STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_BEAM_EXPOSURE \
 *     --technique=beam:intersectionHarvest@beam2000 \
 *     --exclude-ids=R01124,R02500,R02718,R02440 \
 *     --count=120 --seed=20260828 \
 *     --out=tmp/highint-standard-ih-sample.json
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.js';
import { defaultConfig } from '../../modules/solver/ablation-config.js';

const argv = process.argv.slice(2);
const args = new Map(argv.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const [key, ...rest] = a.split('=');
    return [key, rest.join('=')];
}));

const CORPUS = args.get('--corpus') || 'data/stress/stress-levels-random.json';
const FLAG = args.get('--enable-flag');
const TECHNIQUE = args.get('--technique');
const COUNT = Math.max(0, Number(args.get('--count') || 120));
const SEED = Number(args.get('--seed') || 20260828);
const OUT = args.get('--out') || 'tmp/attempt-exposure-sample.json';
const EXCLUDED = new Set((args.get('--exclude-ids') || '').split(',').map(x => x.trim()).filter(Boolean));

if (!FLAG || !TECHNIQUE) {
    throw new Error('--enable-flag=<STRATEGY_...> and --technique=<attemptConfigKey> are required');
}
if (!Number.isInteger(COUNT) || COUNT < 0) throw new Error('--count must be a non-negative integer');
if (!Number.isFinite(SEED)) throw new Error('--seed must be finite');

const parsed = JSON.parse(readFileSync(path.resolve(CORPUS), 'utf8'));
const rows = Array.isArray(parsed) ? parsed : parsed.levels;
if (!Array.isArray(rows)) throw new Error(`${CORPUS}: expected an array or {levels:[...]}`);

const Solver = createSolver();
const { getAttemptConfigs, attemptConfigKey } = SOLVER_TESTING_API;
const treatmentConfig = { ...defaultConfig(), [FLAG]: true };

function mechanicsOnly(raw) {
    // Keep this selector structurally aligned with level-blind-capability-sweep.mjs's boundary.
    const fields = [
        'grid', 'gates', 'goal', 'reqLen', 'reqInt', 'blocks', 'geese', 'falseGoals',
        'mustPass', 'mustCross', 'landmarks', 'filters', 'flippingFilters', 'portals',
    ];
    const clean = {};
    for (const key of fields) if (raw?.[key] !== undefined) clean[key] = JSON.parse(JSON.stringify(raw[key]));
    return clean;
}

const eligible = [];
for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    if (EXCLUDED.has(raw?.id)) continue;
    const level = Solver.prepareLevelForSolver(mechanicsOnly(raw), { source: 'raw' });
    const controlKeys = getAttemptConfigs(level, null).map(attemptConfigKey);
    const treatmentKeys = getAttemptConfigs(level, treatmentConfig).map(attemptConfigKey);
    const controlCount = controlKeys.filter(key => key === TECHNIQUE).length;
    const treatmentCount = treatmentKeys.filter(key => key === TECHNIQUE).length;
    if (controlCount === 0 && treatmentCount > 0) {
        eligible.push({ pos: i + 1, id: raw?.id ?? null, treatmentCount });
    }
}

function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function seededShuffle(values, rng) {
    const out = [...values];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

const sample = seededShuffle(eligible, mulberry32(SEED))
    .slice(0, Math.min(COUNT, eligible.length))
    .sort((a, b) => a.pos - b.pos);
const positionsText = sample.map(x => x.pos).join('\n');
const sampleSha256 = createHash('sha256').update(positionsText).digest('hex');

const result = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'mechanics-only sample planning',
    corpus: CORPUS,
    enableFlag: FLAG,
    technique: TECHNIQUE,
    seed: SEED,
    requestedCount: COUNT,
    eligibleCount: eligible.length,
    sampleCount: sample.length,
    sampleSha256,
    excludedIds: [...EXCLUDED].sort(),
    selection: 'deterministic random sample of levels where enabling the flag adds the exact attempt config and production control lacks it',
    sample,
};

mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
writeFileSync(path.resolve(OUT), JSON.stringify(result, null, 2));
console.log(`eligible=${eligible.length} sample=${sample.length} sha256=${sampleSha256}`);
console.log(`positions=${sample.map(x => x.pos).join(',')}`);
console.log(`wrote ${OUT}`);
