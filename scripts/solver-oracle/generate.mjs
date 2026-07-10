/**
 * Small, dedicated random-level generator for the oracle fuzz harness (fuzz.mjs) — deliberately
 * separate from data/stress/stress-levels-random.json's generator (which is much larger, targets
 * specific density profiles, and includes landmarks the oracle doesn't support). Solvability is
 * NOT a goal here (see fuzz.mjs's file doc for why) — only schema validity matters, checked by
 * the caller via modules/domain/level-schema.ts's validateRawLevel.
 *
 * Deterministic given a seed (mulberry32, matching this codebase's existing seeded-PRNG
 * convention — repair-search.ts's shuffleAttemptConfigs/mulberry32) so a failing case can always
 * be replayed via --seed.
 */

export function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function generateRandomLevel(rng) {
    const w = 4 + Math.floor(rng() * 4); // 4-7
    const h = 4 + Math.floor(rng() * 4);
    const cells = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells.push({ x, y });
    for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    let idx = 0;
    const take = (n) => cells.slice(idx, (idx += n));
    const wire = (c) => ({ x: c.x + 1, y: c.y + 1 }); // 0-indexed -> 1-indexed wire format

    const [gateCell] = take(1);
    const [goalCell] = take(1);

    let budget = Math.min(cells.length - idx, Math.floor(cells.length * 0.4));
    const blocks = [], mustPass = [], mustCross = [], geese = [], falseGoals = [], filters = [], flippingFilters = [];
    const portals = [];

    const portalPairCount = rng() < 0.4 ? 1 + Math.floor(rng() * 2) : 0;
    for (let i = 0; i < portalPairCount && budget >= 2; i++) {
        const [a, b] = take(2);
        portals.push({ x1: a.x + 1, y1: a.y + 1, x2: b.x + 1, y2: b.y + 1 });
        budget -= 2;
    }
    const addSingles = (arr, prob, maxCount, builder) => {
        while (budget > 0 && arr.length < maxCount && idx < cells.length && rng() < prob) {
            const [c] = take(1);
            arr.push(builder(c));
            budget--;
        }
    };
    addSingles(blocks, 0.5, 6, wire);
    addSingles(mustPass, 0.4, 3, wire);
    addSingles(mustCross, 0.3, 2, wire);
    addSingles(geese, 0.3, 3, wire);
    addSingles(falseGoals, 0.3, 2, wire);
    addSingles(filters, 0.3, 2, (c) => ({ ...wire(c), axis: rng() < 0.5 ? 1 : 2 }));
    addSingles(flippingFilters, 0.3, 2, (c) => ({ ...wire(c), axis: rng() < 0.5 ? 1 : 2 }));

    // Not aiming for solvable (see file doc) — a generous range is enough for the walk to have
    // somewhere to go without every level trivially dead-ending at step 0.
    const reqLen = 1 + Math.floor(rng() * (w * h));
    const reqInt = Math.floor(rng() * 3);

    return {
        grid: { w, h },
        gates: [wire(gateCell)],
        goal: wire(goalCell),
        blocks, mustPass, mustCross, geese, falseGoals, filters, flippingFilters, portals,
        reqLen, reqInt,
    };
}
