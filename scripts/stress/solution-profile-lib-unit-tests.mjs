/**
 * Unit coverage for scripts/stress/solution-profile-lib.mjs — the pure solution-space fingerprint
 * primitives (see docs/solution-profile.md). Picked up automatically by vitest's
 * `scripts/**\/*-unit-tests.mjs` include glob (vitest.config.mjs); no separate npm script needed.
 */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { PACK } from '../../modules/domain/cell-key.ts';
import {
    classifyProvenanceSource, sourcesForHint, bucketHintsBySource, extractObjectives, turnEvents,
    objectiveSatisfactionDepths, normalizedFootprint, portalUsageStats, mustCrossOrderStats,
    turnLocationStats, prefixDiversityStats, pairwiseDistinctivenessStats, discoverySaturationCurve,
    buildBucketProfile, buildLevelSolutionProfile, buildSinglePathProfile, profileDistance,
    profileDistanceTerms, nearestProfiles, summarizeCorpusProfiles, PROVENANCE_SOURCES,
    computeHintSignature,
} from './solution-profile-lib.mjs';

const p = (x, y) => PACK(x, y);
const entry = (overrides = {}) => ({
    solver: { id: 'pathfinder-solver', technique: 'dfs', profile: null, template: null, attemptIndex: null, ...overrides.solver },
    search: { nodesExpanded: null, elapsedMs: null, budgetMs: null, termination: 'solved', randomSeed: null, ...overrides.search },
    context: { usedExistingHints: false, hintGuided: false, levelRevision: null, ...overrides.context },
    foundAt: overrides.foundAt || '2026-01-01T00:00:00Z',
});

// ── classifyProvenanceSource / bucketing ──────────────────────────────────────

test('classifyProvenanceSource: witness beats every other signal', () => {
    const e = entry({ solver: { id: 'stress-generator-witness', technique: 'stress-generator-witness' }, search: { termination: 'exhaustive' } });
    assert.equal(classifyProvenanceSource(e), 'witness');
});

test('classifyProvenanceSource: a human-player id -> human-solved, even with solver-looking fields set', () => {
    // A human solve should never get misread as an algorithmic technique just because some other
    // field happens to look that way (e.g. a stray randomSeed from a copy-pasted template).
    const e = entry({ solver: { id: 'human-player' }, search: { randomSeed: 7 } });
    assert.equal(classifyProvenanceSource(e), 'human-solved');
});

test('classifyProvenanceSource: exhaustive termination -> complete-enumeration', () => {
    assert.equal(classifyProvenanceSource(entry({ search: { termination: 'exhaustive' } })), 'complete-enumeration');
});

test('classifyProvenanceSource: hintGuided -> prefix-anchored-completion', () => {
    assert.equal(classifyProvenanceSource(entry({ context: { hintGuided: true } })), 'prefix-anchored-completion');
});

test('classifyProvenanceSource: a random seed without hintGuided -> randomized-enumeration', () => {
    assert.equal(classifyProvenanceSource(entry({ search: { randomSeed: 42 } })), 'randomized-enumeration');
});

test('classifyProvenanceSource: plain solver id, no seed -> production-solver', () => {
    assert.equal(classifyProvenanceSource(entry()), 'production-solver');
});

test('classifyProvenanceSource: unknown solver id -> other; null entry -> other', () => {
    assert.equal(classifyProvenanceSource(entry({ solver: { id: 'some-future-technique' } })), 'other');
    assert.equal(classifyProvenanceSource(null), 'other');
});

// The Priority 0 regression this bucket exists for (docs/solver-optimization-current-queue.md):
// an isolated single-technique run (e.g. technique-census tooling) still carries
// solver.id === SOLVER_ID, so without this check it would be misread as ordinary production-
// solver capability evidence — the same contamination behind e.g. R02900.
test('classifyProvenanceSource: isolatedTechnique overrides production-solver', () => {
    assert.equal(classifyProvenanceSource(entry({ context: { isolatedTechnique: true } })), 'isolated-technique');
    assert.equal(PROVENANCE_SOURCES.includes('isolated-technique'), true);
});

test('sourcesForHint: a hint rediscovered by two techniques belongs to both buckets', () => {
    const hint = { path: [1, 2, 3], provenance: [entry({ search: { randomSeed: 7 } }), entry({ context: { hintGuided: true } })] };
    const sources = sourcesForHint(hint);
    assert.ok(sources.has('randomized-enumeration'));
    assert.ok(sources.has('prefix-anchored-completion'));
    assert.equal(sources.size, 2);
});

test('sourcesForHint: empty provenance falls into "other" rather than being dropped', () => {
    assert.deepEqual([...sourcesForHint({ path: [1], provenance: [] })], ['other']);
});

test('bucketHintsBySource: covers every declared source key, even when empty', () => {
    const buckets = bucketHintsBySource([{ path: [1, 2], provenance: [entry()] }]);
    assert.deepEqual([...buckets.keys()], PROVENANCE_SOURCES);
    assert.equal(buckets.get('production-solver').length, 1);
    assert.equal(buckets.get('witness').length, 0);
});

// ── extractObjectives ──────────────────────────────────────────────────────────

test('extractObjectives: mustPass/mustCross/landmark roles resolve to the right type + turnDir', () => {
    const level = {
        mustPass: [{ x: 1, y: 1 }],
        mustCross: [{ x: 2, y: 2 }],
        landmarks: [
            { x: 3, y: 3, role: 'mustTurnCw' },
            { x: 4, y: 4, role: 'adjacentTurnCcw' },
            { x: 5, y: 5, role: 'surround' },
            { x: 6, y: 6, role: 'decorative' },
        ],
    };
    const objectives = extractObjectives(level);
    assert.deepEqual(objectives.map(o => o.type), ['mustPass', 'mustCross', 'mustTurn', 'adjacentTurn', 'surround']);
    assert.equal(objectives.find(o => o.type === 'mustTurn').turnDir, 'cw');
    assert.equal(objectives.find(o => o.type === 'adjacentTurn').turnDir, 'ccw');
    // 1-indexed wire coords -> 0-indexed packed keys.
    assert.equal(objectives[0].key, p(0, 0));
});

test('extractObjectives: a mustPass/mustTurn landmark\'s wire-format mustPass echo is not double-counted', () => {
    // Mirrors buildWireLevelData's real output: a mustTurn-role landmark's cell is redeclared in
    // `mustPass` too. That must yield exactly one objective for the cell (the landmark's), not
    // an extra plain 'mustPass' entry for the same key.
    const level = {
        mustPass: [{ x: 1, y: 1 }, { x: 3, y: 3 }],
        landmarks: [{ x: 3, y: 3, role: 'mustTurn', turn: 'either' }],
    };
    const objectives = extractObjectives(level);
    assert.deepEqual(objectives.map(o => o.type), ['mustPass', 'mustTurn']);
    assert.equal(objectives.filter(o => o.key === p(2, 2)).length, 1);
});

// ── turnEvents / objectiveSatisfactionDepths ───────────────────────────────────

test('turnEvents: a straight line has no turns; an L-shape turns once', () => {
    const straight = [p(0, 0), p(1, 0), p(2, 0)];
    assert.equal(turnEvents(straight).length, 0);
    const lShape = [p(0, 0), p(1, 0), p(1, 1)];
    const events = turnEvents(lShape);
    assert.equal(events.length, 1);
    assert.equal(events[0].key, p(1, 0));
    assert.ok(events[0].dir === 'cw' || events[0].dir === 'ccw');
});

test('turnEvents: a triple straddling a portal jump is not a turn', () => {
    // p(0,0)->p(5,5) is not a drawn (adjacent) step, so this triple must not register a turn
    // even though the raw coordinates would look like a corner.
    const path = [p(0, 0), p(5, 5), p(5, 6)];
    assert.equal(turnEvents(path).length, 0);
});

test('objectiveSatisfactionDepths: mustPass depth is the fractional index of first visit', () => {
    const path = [p(0, 0), p(1, 0), p(2, 0), p(3, 0)];
    const objectives = [{ type: 'mustPass', key: p(2, 0) }];
    const [r] = objectiveSatisfactionDepths(path, objectives, { w: 4, h: 1 });
    assert.equal(r.depth, 2 / 3);
});

test('objectiveSatisfactionDepths: mustCross depth is the SECOND (completing) visit', () => {
    // Revisits p(1,0) at index 3.
    const path = [p(0, 0), p(1, 0), p(1, 1), p(1, 0)];
    const objectives = [{ type: 'mustCross', key: p(1, 0) }];
    const [r] = objectiveSatisfactionDepths(path, objectives, { w: 2, h: 2 });
    assert.equal(r.depth, 3 / 3);
});

test('objectiveSatisfactionDepths: mustTurn only satisfied when the path actually turns there', () => {
    const objectives = [{ type: 'mustTurn', key: p(1, 0), turnDir: 'either' }];
    const straightThrough = [p(0, 0), p(1, 0), p(2, 0)];
    assert.equal(objectiveSatisfactionDepths(straightThrough, objectives, { w: 3, h: 1 })[0].depth, null);
    const turnsThere = [p(0, 0), p(1, 0), p(1, 1)];
    assert.notEqual(objectiveSatisfactionDepths(turnsThere, objectives, { w: 2, h: 2 })[0].depth, null);
});

test('objectiveSatisfactionDepths: surround depth is the LAST of its 8-neighbors first visited', () => {
    // Surround landmark at (1,1); path visits (0,1) at idx1 and (2,1) at idx3 — depth should
    // reflect the later of the two (idx3), not the earlier.
    const path = [p(0, 0), p(0, 1), p(1, 2), p(2, 1)];
    const objectives = [{ type: 'surround', key: p(1, 1) }];
    const [r] = objectiveSatisfactionDepths(path, objectives, { w: 3, h: 3 });
    assert.equal(r.depth, 3 / 3);
});

// ── normalizedFootprint ────────────────────────────────────────────────────────

test('normalizedFootprint: buckets stay within the OCC×OCC grid regardless of level size', () => {
    const keys = [p(0, 0), p(14, 9), p(7, 4)];
    const fp = normalizedFootprint(keys, { w: 15, h: 10 });
    assert.ok(fp.every(b => b >= 0 && b < 36));
    assert.equal(new Set(fp).size, fp.length); // deduped
});

// ── aggregate stats over small synthetic buckets ────────────────────────────────

test('portalUsageStats: counts directed jumps and leaves signature blank for non-portal paths', () => {
    const noPortal = [p(0, 0), p(1, 0)];
    const withPortal = [p(0, 0), p(9, 9), p(9, 8)]; // p(0,0)->p(9,9) is a non-adjacent "jump"
    const stats = portalUsageStats([noPortal, withPortal]);
    assert.equal(stats.pathsTotal, 2);
    assert.equal(stats.pathsUsingPortals, 1);
    assert.equal(stats.distinctSignatures, 1);
    assert.equal(stats.directedJumpFrequency[0].jump, `${p(0, 0)}>${p(9, 9)}`);
});

test('mustCrossOrderStats: null below 2 must-cross keys; rigid=true when every path agrees', () => {
    assert.equal(mustCrossOrderStats([[p(0, 0)]], [p(0, 0)]), null);
    const mcKeys = [p(1, 0), p(3, 0)];
    const pathA = [p(0, 0), p(1, 0), p(2, 0), p(3, 0), p(4, 0)];
    const pathB = [p(0, 0), p(1, 0), p(2, 0), p(3, 0), p(4, 0), p(4, 0)]; // same order, extra revisit
    const stats = mustCrossOrderStats([pathA, pathB], mcKeys);
    assert.equal(stats.rigid, true);
    assert.equal(stats.distinctFirstEntryOrders, 1);
});

test('turnLocationStats: cwFraction reflects the actual cw/ccw split', () => {
    const allCw = [p(0, 0), p(1, 0), p(1, 1)]; // one turn
    const stats = turnLocationStats([allCw, allCw]);
    assert.ok(stats.cwFraction === 0 || stats.cwFraction === 1); // both paths turn the same way
    assert.equal(stats.distinctTurnCells, 1);
});

test('prefixDiversityStats: identical paths share their full prefix (frac = 1)', () => {
    const path = [p(0, 0), p(1, 0), p(2, 0)];
    const stats = prefixDiversityStats([path, path.slice()]);
    assert.equal(stats.meanSharedPrefixFrac, 1);
});

test('prefixDiversityStats: fewer than 2 paths degenerates to zero, not a crash', () => {
    assert.equal(prefixDiversityStats([[p(0, 0)]]).meanSharedPrefixFrac, 0);
});

test('pairwiseDistinctivenessStats: a single path has zero comparable pairs', () => {
    const stats = pairwiseDistinctivenessStats([[p(0, 0), p(1, 0)]], [], false);
    assert.equal(stats.pairsCompared, 0);
    assert.equal(stats.meanDistance, 0);
});

test('discoverySaturationCurve: walks in foundAt order and reports cumulative growth', () => {
    const grid = { w: 3, h: 1 };
    const later = { path: [p(1, 0), p(2, 0)], provenance: [entry({ foundAt: '2026-02-01T00:00:00Z' })] };
    const earlier = { path: [p(0, 0), p(1, 0)], provenance: [entry({ foundAt: '2026-01-01T00:00:00Z' })] };
    const result = discoverySaturationCurve([later, earlier], [], grid);
    assert.equal(result.curve[0].n, 1);
    // Ordered by foundAt, so the EARLIER hint (found in January) must be processed first.
    assert.deepEqual(result.curve[0], { n: 1, newEdges: 1, newCells: 2, newPortalSignatures: 0, newMustCrossOrders: 0, cumulativeEdges: 1, cumulativeCells: 2 });
});

// ── per-level profile assembly + insufficientData gating ──────────────────────

test('buildLevelSolutionProfile: a level with no hints reports insufficientData, not a crash', () => {
    const result = buildLevelSolutionProfile({ grid: { w: 3, h: 3 }, hintRecords: [] }, 7);
    assert.equal(result.insufficientData, true);
    assert.equal(result.hintCount, 0);
});

test('buildLevelSolutionProfile: per-source buckets below minHintsPerSource are flagged, not silently empty', () => {
    const level = {
        grid: { w: 3, h: 1 }, mustPass: [], mustCross: [], landmarks: [],
        hintRecords: [{ path: [p(0, 0), p(1, 0), p(2, 0)], provenance: [entry()] }],
    };
    const result = buildLevelSolutionProfile(level, 1, { minHintsPerSource: 3 });
    assert.equal(result.bySource['production-solver'].insufficientData, true);
    assert.equal(result.bySource['production-solver'].pathCount, 1);
    assert.equal(result.combined.pathCount, 1); // combined bucket has no per-source floor
});

test('buildLevelSolutionProfile: a source bucket identical to combined is marked sameAsCombined, not recomputed', () => {
    // Every hint here has NO provenance -> every hint classifies as 'other', so 'other' ends up
    // being the exact same hint set as 'combined' (this is the real-world published-corpus case:
    // legacy hints predate provenance tracking).
    const level = {
        grid: { w: 3, h: 1 }, mustPass: [], mustCross: [], landmarks: [],
        hintRecords: [
            { path: [p(0, 0), p(1, 0), p(2, 0)], provenance: [] },
            { path: [p(2, 0), p(1, 0), p(0, 0)], provenance: [] },
            { path: [p(0, 0), p(1, 0), p(2, 0), p(1, 0), p(0, 0)], provenance: [] },
        ],
    };
    const result = buildLevelSolutionProfile(level, 1, { minHintsPerSource: 3 });
    assert.equal(result.bySource.other.sameAsCombined, true);
    assert.equal(result.bySource.other.pathCount, 3);
    assert.equal(result.bySource['production-solver'].insufficientData, true);
});

test('buildSinglePathProfile: degenerates cleanly for a lone witness path', () => {
    const level = { grid: { w: 3, h: 1 }, mustPass: [], mustCross: [], landmarks: [] };
    const profile = buildSinglePathProfile([p(0, 0), p(1, 0), p(2, 0)], level);
    assert.equal(profile.pathCount, 1);
    assert.equal(profile.pairwiseDistinctiveness.pairsCompared, 0);
});

// ── cross-level distance ────────────────────────────────────────────────────────

test('profileDistance: a profile is (near-)identical to itself', () => {
    const level = { grid: { w: 3, h: 1 }, mustPass: [], mustCross: [], landmarks: [] };
    const profile = buildSinglePathProfile([p(0, 0), p(1, 0), p(2, 0)], level);
    assert.ok(profileDistance(profile, profile) < 1e-9);
});

test('profileDistanceTerms: axes absent on both sides (e.g. no must-cross) are null, not maximal distance', () => {
    const level = { grid: { w: 3, h: 1 }, mustPass: [], mustCross: [], landmarks: [] };
    const profile = buildSinglePathProfile([p(0, 0), p(1, 0), p(2, 0)], level);
    const terms = profileDistanceTerms(profile, profile);
    assert.equal(terms.mustCrossRigidity, null);
    assert.equal(terms.objectiveDepth, null);
});

test('nearestProfiles: ranks the closer pool entry first and attaches a per-axis breakdown', () => {
    const level = { grid: { w: 5, h: 1 }, mustPass: [], mustCross: [], landmarks: [] };
    const candidate = buildSinglePathProfile([p(0, 0), p(1, 0), p(2, 0), p(3, 0), p(4, 0)], level);
    const near = buildSinglePathProfile([p(0, 0), p(1, 0), p(2, 0), p(3, 0)], level);
    const far = buildSinglePathProfile([p(0, 0), p(0, 0)], { grid: { w: 1, h: 1 }, mustPass: [], mustCross: [], landmarks: [] });
    const results = nearestProfiles(candidate, [{ id: 'far', profile: far }, { id: 'near', profile: near }], 2);
    assert.equal(results[0].id, 'near');
    assert.ok('cellFootprint' in results[0].terms);
});

// ── corpus summary ──────────────────────────────────────────────────────────────

test('summarizeCorpusProfiles: counts insufficientData levels without including them in averages', () => {
    const level = {
        grid: { w: 3, h: 1 }, mustPass: [], mustCross: [], landmarks: [],
        hintRecords: [{ path: [p(0, 0), p(1, 0), p(2, 0)], provenance: [entry()] }],
    };
    const withHints = buildLevelSolutionProfile(level, 1);
    const empty = buildLevelSolutionProfile({ grid: { w: 3, h: 1 }, hintRecords: [] }, 2);
    const summary = summarizeCorpusProfiles([withHints, empty]);
    assert.equal(summary.levelsTotal, 2);
    assert.equal(summary.levelsWithHints, 1);
    assert.equal(summary.levelsInsufficientData, 1);
});

// Assembles a bucket profile from raw Hint[] directly (buildLevelSolutionProfile's building
// block) — exercised on its own so a future refactor of the per-level wrapper can't silently
// stop calling it correctly without a test noticing.
test('buildBucketProfile: returns null for an empty bucket rather than throwing', () => {
    const level = { grid: { w: 3, h: 1 } };
    assert.equal(buildBucketProfile([], level, [], [], false), null);
});

// ── freshness (solution-profile-compare.mjs's stale-library auto-repair) ────────

test('computeHintSignature: identical hint/provenance counts across levels -> identical hash', () => {
    const levels = [{ hints: [[1, 2]], hintRecords: [{ path: [1, 2], provenance: [entry(), entry()] }] }];
    const a = computeHintSignature(levels);
    const b = computeHintSignature(levels);
    assert.equal(a.hash, b.hash);
    assert.equal(a.totalHints, 1);
    assert.equal(a.totalProvenance, 2);
});

test('computeHintSignature: a new hint changes the hash (detects a staled-out library)', () => {
    const before = [{ hints: [[1, 2]], hintRecords: [{ path: [1, 2], provenance: [entry()] }] }];
    const after = [{ hints: [[1, 2], [3, 4]], hintRecords: [{ path: [1, 2], provenance: [entry()] }, { path: [3, 4], provenance: [entry()] }] }];
    assert.notEqual(computeHintSignature(before).hash, computeHintSignature(after).hash);
});

test('computeHintSignature: a rediscovery (new provenance entry, same hint) also changes the hash', () => {
    const before = [{ hints: [[1, 2]], hintRecords: [{ path: [1, 2], provenance: [entry()] }] }];
    const after = [{ hints: [[1, 2]], hintRecords: [{ path: [1, 2], provenance: [entry(), entry()] }] }];
    assert.notEqual(computeHintSignature(before).hash, computeHintSignature(after).hash);
    assert.equal(computeHintSignature(before).totalHints, computeHintSignature(after).totalHints);
});

test('computeHintSignature: restricting to a level-number subset only signs those levels', () => {
    const levels = [
        { hints: [[1]], hintRecords: [{ path: [1], provenance: [entry()] }] },
        { hints: [[2], [3]], hintRecords: [{ path: [2], provenance: [entry()] }, { path: [3], provenance: [entry()] }] },
    ];
    const wholeCorpus = computeHintSignature(levels);
    const firstLevelOnly = computeHintSignature(levels, [1]);
    assert.notEqual(wholeCorpus.hash, firstLevelOnly.hash);
    assert.equal(firstLevelOnly.totalHints, 1);
});
