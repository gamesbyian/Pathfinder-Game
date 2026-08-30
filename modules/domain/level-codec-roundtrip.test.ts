/**
 * Codec round-trip and clone-semantics tests (hardening plan §1): parseRawLevel ↔
 * denormalizeLevel must preserve every object type; the clone family must produce
 * independent, correctly-scoped copies; parseRawLevelDetailed must reject bad wire data.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'vitest';
import { PACK } from './cell-key.js';
import {
    parseRawLevel, parseRawLevelDetailed, denormalizeLevel, buildWireLevelData,
    canonicalCloneLevel, deepCloneLevel, cloneLevelWithReq, assertLevelShape,
    normalizeMetadata,
} from './level-codec.js';
import { getLevelFingerprintSource } from './level-fingerprint.js';

const K = (x: number, y: number) => PACK(x - 1, y - 1);

// A wire-format level exercising every object type.
const FULL_RAW = {
    grid: { w: 12, h: 12 }, // square — see modules/domain/level-schema.ts's validateRawLevel
    gates: [{ x: 1, y: 1 }, { x: 1, y: 10 }],
    goal: { x: 12, y: 10 },
    reqLen: 24,
    reqInt: 1,
    designerName: 'Tester',
    description: 'kitchen sink',
    difficulty: 3,
    blocks: [{ x: 4, y: 2 }],
    geese: [{ x: 6, y: 6 }],
    falseGoals: [{ x: 12, y: 1 }],
    mustPass: [{ x: 2, y: 5 }],
    mustCross: [{ x: 6, y: 3 }],
    filters: [{ x: 3, y: 3, axis: 1 }],
    flippingFilters: [{ x: 5, y: 5, axis: 2 }],
    portals: [{ x1: 8, y1: 8, x2: 10, y2: 2 }],
    landmarks: [
        { x: 3, y: 8, objectType: 'park', role: 'surround' },
        { x: 5, y: 8, objectType: 'library', role: 'mustTurn', turn: 'either' },
        { x: 7, y: 8, objectType: 'library', role: 'mustTurnCcw' },
        { x: 9, y: 8, objectType: 'fountain', role: 'adjacentTurn', turn: 'cw' },
        { x: 11, y: 8, objectType: 'statue', role: 'decorative' },
    ],
    hints: [[K(1, 1), K(2, 1)]],
};

test('parseRawLevel normalizes every object type into keyed structures', () => {
    const l = parseRawLevel(FULL_RAW)!;
    assert.ok(l);
    assert.equal(l.goalKey, K(12, 10));
    assert.deepEqual(l.gateKeys, [K(1, 1), K(1, 10)]);
    assert.ok(l.blockSet.has(K(4, 2)));
    assert.ok(l.gooseSet.has(K(6, 6)));
    assert.ok(l.falseGoalKeys.has(K(12, 1)));
    // Must-turn landmark cells are also must-pass cells (the path must visit them to turn).
    assert.deepEqual(l.mustPassKeys, [K(2, 5), K(5, 8), K(7, 8)]);
    assert.deepEqual(l.mustCrossKeys, [K(6, 3)]);
    assert.equal(l.filterMap.get(K(3, 3)), 1);
    assert.equal(l.flippingFilterMap.get(K(5, 5)), 2);
    assert.equal(l.portalMap.get(K(8, 8))!.dest, K(10, 2));
    assert.equal(l.portalMap.get(K(10, 2))!.dest, K(8, 8));
    assert.equal(l.hasParityBreaker, false, '(7,7)→(9,1) 0-based parities match');
    // Landmarks: impassable roles land in blockSet; turn roles in their key structures.
    assert.ok(l.blockSet.has(K(3, 8)), 'surround is impassable');
    assert.ok(l.blockSet.has(K(9, 8)), 'adjacentTurn is impassable');
    assert.ok(l.blockSet.has(K(11, 8)), 'decorative is impassable');
    assert.deepEqual(l.surroundKeys, [K(3, 8)]);
    assert.equal(l.mustPassTurnDirs.get(K(5, 8)), 'either');
    assert.equal(l.mustPassTurnDirs.get(K(7, 8)), 'ccw');
    assert.deepEqual(l.adjacentTurnKeys, [K(9, 8)]);
    assert.deepEqual(l.adjacentTurnDirs, ['cw']);
    assert.equal(l.landmarkMeta.size, 5);
    assert.equal(parseRawLevel(null as any), null);
    assert.equal(parseRawLevel({ grid: { w: 3, h: 3 } }), null, 'goal/gates required');
});

test('denormalizeLevel round-trips the parsed level back to wire format', () => {
    const l = parseRawLevel(FULL_RAW, 41)!;
    const wire = denormalizeLevel(l);
    assert.deepEqual(wire.grid, FULL_RAW.grid);
    assert.deepEqual(wire.gates, FULL_RAW.gates);
    assert.deepEqual(wire.goal, FULL_RAW.goal);
    assert.equal(wire.reqLen, FULL_RAW.reqLen);
    assert.equal(wire.reqInt, FULL_RAW.reqInt);
    // blockSet includes the impassable landmark cells, so they surface in wire.blocks too
    // (idempotent: re-parsing dedupes them back into the same blockSet).
    assert.deepEqual(wire.blocks, [{ x: 4, y: 2 }, { x: 3, y: 8 }, { x: 9, y: 8 }, { x: 11, y: 8 }]);
    assert.deepEqual(wire.geese, FULL_RAW.geese);
    assert.deepEqual(wire.falseGoals, FULL_RAW.falseGoals);
    assert.deepEqual(wire.mustPass, [{ x: 2, y: 5 }, { x: 5, y: 8 }, { x: 7, y: 8 }], 'includes must-turn cells');
    assert.deepEqual(wire.mustCross, FULL_RAW.mustCross);
    assert.deepEqual(wire.filters, FULL_RAW.filters);
    assert.deepEqual(wire.flippingFilters, FULL_RAW.flippingFilters);
    assert.deepEqual(wire.portals, FULL_RAW.portals);
    assert.deepEqual(wire.hints, FULL_RAW.hints);
    assert.equal(wire.designerName, 'Tester');
    assert.equal(wire.difficulty, 3);
    assert.equal(wire.levelId, 42, '0-based id → 1-based levelNumber');
    // Landmarks come back with roles and turn dirs (sorted by y then x).
    assert.deepEqual(wire.landmarks, [
        { x: 3, y: 8, objectType: 'park', role: 'surround' },
        { x: 5, y: 8, objectType: 'library', role: 'mustTurn', turn: 'either' },
        { x: 7, y: 8, objectType: 'library', role: 'mustTurn', turn: 'ccw' },
        { x: 9, y: 8, objectType: 'fountain', role: 'adjacentTurn', turn: 'cw' },
        { x: 11, y: 8, objectType: 'statue', role: 'decorative' },
    ]);
    // Re-parsing the denormalized wire produces the same normalized structures.
    const reparsed = parseRawLevel(wire)!;
    assert.deepEqual(reparsed.gateKeys, l.gateKeys);
    assert.deepEqual([...reparsed.blockSet].sort(), [...l.blockSet].sort());
    assert.deepEqual(reparsed.adjacentTurnDirs, l.adjacentTurnDirs);
    assert.equal(denormalizeLevel(null), null);
});

test('canonicalCloneLevel: hints only when asked; collections are independent copies', () => {
    const l = parseRawLevel(FULL_RAW)!;
    const bare = canonicalCloneLevel(l);
    assert.equal((bare as any).hints, undefined, 'hints excluded by default');
    const withHints = canonicalCloneLevel(l, { includeHints: true });
    assert.deepEqual(withHints.hints, FULL_RAW.hints);
    assert.notEqual(withHints.hints, l.hints, 'hint arrays are copied');

    const clone = deepCloneLevel(l);
    clone.blockSet.add(K(1, 5));
    clone.filterMap.set(K(2, 2), 2);
    clone.mustPassKeys.push(K(9, 9));
    clone.landmarkMeta.get(K(3, 8))!.role = 'decorative';
    assert.equal(l.blockSet.has(K(1, 5)), false);
    assert.equal(l.filterMap.has(K(2, 2)), false);
    assert.equal(l.mustPassKeys.length, 3);
    assert.equal(l.landmarkMeta.get(K(3, 8))!.role, 'surround', 'landmarkMeta values deep-copied');
});

test('cloneLevelWithReq overrides only the challenge metrics', () => {
    const l = parseRawLevel(FULL_RAW)!;
    const c = cloneLevelWithReq(l, 30, 2);
    assert.equal(c.reqLen, 30);
    assert.equal(c.reqInt, 2);
    assert.equal(l.reqLen, 24, 'source untouched');
    assert.deepEqual(c.gateKeys, l.gateKeys);
});

test('challenge metrics survive raw parse, canonical clone, and wire serialization boundaries', () => {
    const parsed = parseRawLevel(FULL_RAW)! as any;
    const clone = canonicalCloneLevel(parsed) as any;
    const wire = buildWireLevelData(clone);

    assert.equal(parsed.reqLen, FULL_RAW.reqLen, 'raw parser carries the length metric into runtime data');
    assert.equal(parsed.reqInt, FULL_RAW.reqInt, 'raw parser carries the intersection metric into runtime data');
    assert.equal(clone.reqLen, parsed.reqLen, 'canonical clone preserves the runtime length metric');
    assert.equal(clone.reqInt, parsed.reqInt, 'canonical clone preserves the runtime intersection metric');
    assert.equal(wire.reqLen, FULL_RAW.reqLen, 'wire writer restores the serialized length metric');
    assert.equal(wire.reqInt, FULL_RAW.reqInt, 'wire writer restores the serialized intersection metric');
    assert.deepEqual(
        Object.keys(wire).filter((key) => key.startsWith('req')).sort(),
        ['reqInt', 'reqLen'],
        'wire output has exactly the two established challenge-metric keys',
    );
});

test('fingerprint semantics are identical across raw, runtime clone, and wire boundaries', () => {
    const parsed = parseRawLevel(FULL_RAW)!;
    const clone = canonicalCloneLevel(parsed, { includeHints: true });
    const wire = buildWireLevelData(clone);
    const expected = getLevelFingerprintSource(FULL_RAW);

    assert.equal(getLevelFingerprintSource(buildWireLevelData(parsed)), expected);
    assert.equal(getLevelFingerprintSource(buildWireLevelData(clone)), expected);
    assert.equal(getLevelFingerprintSource(wire), expected);
});

test('available maintained corpus samples preserve challenge metrics through codec boundaries', () => {
    const fixtures = [
        ['published', '../../data/levels.json'],
        ['corpus1', '../../data/stress/stress-levels.json'],
        ['corpus2', '../../data/stress/stress-levels-random.json'],
    ] as const;

    let exercised = 0;
    for (const [name, relativePath] of fixtures) {
        const url = new URL(relativePath, import.meta.url);
        // Some CI jobs intentionally sparse-check out only canonical runtime data, excluding
        // the stress corpora. Exercise every maintained corpus present in the checkout rather
        // than making this codec unit test depend on a job-specific data materialization policy.
        if (!existsSync(url)) continue;
        const document = JSON.parse(readFileSync(url, 'utf8'));
        const raw = Array.isArray(document) ? document[0] : document.levels[0];
        const parsed = parseRawLevel(raw);
        assert.ok(parsed, `${name} representative parses`);
        const wire = buildWireLevelData(canonicalCloneLevel(parsed));
        assert.equal(wire.reqLen, raw.reqLen, `${name} length metric`);
        assert.equal(wire.reqInt, raw.reqInt, `${name} intersection metric`);
        assert.equal(getLevelFingerprintSource(wire), getLevelFingerprintSource(raw), `${name} fingerprint`);
        exercised++;
    }
    assert.ok(exercised > 0, 'at least one maintained corpus sample is available in this checkout');
});

test('assertLevelShape throws on structurally unusable levels', () => {
    assert.throws(() => assertLevelShape(null), /null/);
    assert.throws(() => assertLevelShape({ gateKeys: [K(1, 1)], grid: { w: 3, h: 3 } }), /missing goal/);
    assert.throws(() => assertLevelShape({ goalKey: K(2, 2), gateKeys: [], grid: { w: 3, h: 3 } }), /missing gates/);
    assert.throws(() => assertLevelShape({ goalKey: K(2, 2), gateKeys: [K(1, 1)] }), /Grid dimensions/);
    assert.doesNotThrow(() => assertLevelShape(parseRawLevel(FULL_RAW)));
});

test('parseRawLevelDetailed surfaces wire-format validation errors', () => {
    const good = parseRawLevelDetailed(FULL_RAW, 3);
    assert.equal(good.ok, true);
    assert.equal(good.level!.id, 3);
    assert.deepEqual(good.errors, []);

    const bad = parseRawLevelDetailed({ grid: { w: 0, h: -1 } });
    assert.equal(bad.ok, false);
    assert.equal(bad.level, null);
    assert.ok(bad.errors.length > 0);
});

test('normalizeMetadata sanitizes designer fields', () => {
    assert.deepEqual(normalizeMetadata({ designerName: ' A ', description: 'd', difficulty: 4 }),
        { designerName: ' A ', description: 'd', difficulty: 4, provenance: null, persistentId: null });
    assert.equal(normalizeMetadata({ id: 'P00042' }).persistentId, 'P00042');
    assert.equal(normalizeMetadata({ id: 42 as any }).persistentId, null, 'non-string id is ignored, not coerced');
    const empty = normalizeMetadata(undefined);
    assert.equal(empty.designerName, '');
    assert.equal(empty.description, '');
    assert.equal(empty.difficulty, null);
    assert.equal(empty.provenance, null);
    assert.equal(empty.persistentId, null);
});

test('a level\'s persistent id round-trips through parse -> denormalize -> parse', () => {
    const withId = { ...FULL_RAW, id: 'P00042' };
    const l = parseRawLevel(withId)!;
    assert.equal(l.persistentId, 'P00042');
    const wire = denormalizeLevel(l);
    assert.equal(wire.id, 'P00042');
    assert.equal(parseRawLevel(wire)!.persistentId, 'P00042');

    // Absent on a level with no id (an editor draft) -- explicit null, not omitted.
    const l2 = parseRawLevel(FULL_RAW)!;
    assert.equal(l2.persistentId, null);
    assert.equal(denormalizeLevel(l2).id, null);
});

test('buildWireLevelData emits canonical landmark wire data and option overrides', () => {
    const l = parseRawLevel(FULL_RAW, 41)!;
    const wire = buildWireLevelData(l, { reqLen: 30, reqInt: 2, hints: [[K(1, 1), K(1, 2)]] });
    assert.equal(wire.levelId, undefined, 'levelId omitted by default');
    assert.equal(wire.reqLen, 30);
    assert.equal(wire.reqInt, 2);
    assert.deepEqual(wire.hints, [[K(1, 1), K(1, 2)]]);
    assert.deepEqual(wire.landmarks, [
        { x: 3, y: 8, objectType: 'park', role: 'surround' },
        { x: 5, y: 8, objectType: 'library', role: 'mustTurn', turn: 'either' },
        { x: 7, y: 8, objectType: 'library', role: 'mustTurn', turn: 'ccw' },
        { x: 9, y: 8, objectType: 'fountain', role: 'adjacentTurn', turn: 'cw' },
        { x: 11, y: 8, objectType: 'statue', role: 'decorative' },
    ]);
    for (const [key, value] of Object.entries(wire)) assert.notEqual(value, undefined, `${key} is defined`);

    const withId = buildWireLevelData(l, { includeLevelId: true });
    assert.equal(withId.levelId, 42);
});

test('buildWireLevelData round-trip preserves landmark mechanics', () => {
    const l = parseRawLevel(FULL_RAW)!;
    const wire = buildWireLevelData(l);
    assert.deepEqual(wire.blocks, [{ x: 4, y: 2 }, { x: 3, y: 8 }, { x: 9, y: 8 }, { x: 11, y: 8 }]);
    assert.deepEqual(wire.mustPass, [{ x: 2, y: 5 }, { x: 5, y: 8 }, { x: 7, y: 8 }]);

    const reparsed = parseRawLevel(wire)!;
    assert.deepEqual(reparsed.surroundKeys, [K(3, 8)]);
    assert.equal(reparsed.mustPassTurnDirs.get(K(5, 8)), 'either');
    assert.equal(reparsed.mustPassTurnDirs.get(K(7, 8)), 'ccw');
    assert.deepEqual(reparsed.adjacentTurnKeys, [K(9, 8)]);
    assert.deepEqual(reparsed.adjacentTurnDirs, ['cw']);
    assert.deepEqual(reparsed.landmarkMeta.get(K(3, 8)), { objectType: 'park', role: 'surround' });
    assert.deepEqual(reparsed.landmarkMeta.get(K(5, 8)), { objectType: 'library', role: 'mustTurn' });
});
