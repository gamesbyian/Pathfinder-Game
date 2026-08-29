// Stress-corpus feature extraction, novelty distance, structural complexity, and the
// small ridge-regression model used to predict solver challenge from audit history.
//
// Pure JS on wire-format (1-indexed) levels and 1-indexed witness pairs — no imports
// from modules/, so these helpers run under plain node (compare/analyze CLIs) as well
// as inside the bundled generator.

// ─── Level feature vectors ───────────────────────────────────────────────────

/** Numeric + categorical features of a raw wire-format level. `witnessPairs` optional. */
export function levelFeatures(raw, witnessPairs = null) {
    const w = raw.grid.w, h = raw.grid.h, area = w * h;
    const count = (a) => Array.isArray(a) ? a.length : 0;
    const landmarks = Array.isArray(raw.landmarks) ? raw.landmarks : [];
    const lmByRole = (re) => landmarks.filter(lm => re.test(lm.role || '')).length;
    const impassableLm = lmByRole(/^(surround|adjacentTurn|decorative)/);
    // Required path coverage ratio mirrors solver/routing-regime.ts getRequiredPathCoverageRatio: grid minus
    // blocks/geese/false-goals/gates (impassable landmarks count as blocks).
    const nonGateWinningPathCellCount = Math.max(1, area - count(raw.blocks) - impassableLm - count(raw.geese)
        - count(raw.falseGoals) - count(raw.gates));
    const requiredPathCoverageRatio = raw.reqLen / nonGateWinningPathCellCount;
    const f = {
        w, h, area,
        aspect: Math.max(w, h) / Math.min(w, h),
        reqLen: raw.reqLen,
        reqInt: raw.reqInt,
        requiredPathCoverageRatio,
        gates: count(raw.gates),
        blocks: count(raw.blocks) + impassableLm,
        mustPass: count(raw.mustPass) + lmByRole(/^mustPass$/),
        mustCross: count(raw.mustCross),
        portalPairs: count(raw.portals),
        flippers: count(raw.flippingFilters),
        staticFilters: count(raw.filters),
        geese: count(raw.geese),
        falseGoals: count(raw.falseGoals),
        surround: lmByRole(/^surround$/),
        mustTurn: lmByRole(/^mustTurn/),
        adjTurn: lmByRole(/^adjacentTurn/),
        routingRegime: classifyRoutingRegimeFromRaw(raw, requiredPathCoverageRatio),
        gateLayout: raw.gates.map(g => [g.x, g.y]),
        goal: [raw.goal.x, raw.goal.y],
        blockOccupancy: occupancyGrid((raw.blocks || [])
            .concat(landmarks.filter(lm => /^(surround|adjacentTurn|decorative)/.test(lm.role || '')))
            .map(b => [b.x, b.y]), w, h),
        portalTopology: portalTopology(raw, w, h),
        flipperOccupancy: occupancyGrid((raw.flippingFilters || []).map(ff => [ff.x, ff.y]), w, h),
        witness: witnessPairs ? witnessDescriptors(witnessPairs, w, h) : null,
    };
    return f;
}

/** Mirrors solver/routing-regime.ts classifyRoutingRegime so predictions can reason about policy routing. */
export function classifyRoutingRegimeFromRaw(raw, requiredPathCoverageRatio) {
    const portalTerminals = (raw.portals?.length || 0) * 2;
    if (raw.reqInt <= 1 && requiredPathCoverageRatio < 0.35) return 'sparse-low-intersection';
    if ((raw.reqInt >= 5 && requiredPathCoverageRatio >= 0.45) || (raw.reqInt >= 4 && requiredPathCoverageRatio >= 0.55) || raw.reqInt >= 10)
        return 'intersection-heavy';
    if ((raw.mustCross?.length || 0) >= 2 && raw.reqInt >= 2) return 'must-cross-heavy';
    if (portalTerminals >= 4) return 'multi-portal';
    return 'general';
}

const OCC = 6; // downsample resolution for occupancy grids

/** Normalized OCC×OCC occupancy bitset (as a Set of cell indexes) for coordinate lists. */
function occupancyGrid(pairs, w, h) {
    const s = new Set();
    for (const [x, y] of pairs) {
        const gx = Math.min(OCC - 1, Math.floor(((x - 1) / Math.max(1, w)) * OCC));
        const gy = Math.min(OCC - 1, Math.floor(((y - 1) / Math.max(1, h)) * OCC));
        s.add(gy * OCC + gx);
    }
    return s;
}

/** Sorted normalized portal endpoint geometry — captures pair placement + span. */
function portalTopology(raw, w, h) {
    return (raw.portals || []).map(p => {
        const span = (Math.abs(p.x1 - p.x2) + Math.abs(p.y1 - p.y2)) / (w + h);
        return { span, cells: occupancyGrid([[p.x1, p.y1], [p.x2, p.y2]], w, h) };
    }).sort((a, b) => a.span - b.span);
}

// ─── Witness geometry descriptors ────────────────────────────────────────────

/** Geometry profile of a solution path given as 1-indexed [[x,y],…]. */
export function witnessDescriptors(pairs, w, h) {
    const n = pairs.length;
    const seen = new Map();
    let perimeterVisits = 0, centerVisits = 0, turns = 0, jumps = 0;
    const quadrants = [0, 0, 0, 0];
    const crossPositions = [];
    const runs = [];
    let runLen = 0, lastDx = 0, lastDy = 0;
    for (let i = 0; i < n; i++) {
        const [x, y] = pairs[i];
        const k = `${x},${y}`;
        const c = (seen.get(k) || 0) + 1;
        seen.set(k, c);
        if (c > 1 && i > 0) crossPositions.push(i / n);
        const edgeDist = Math.min(x - 1, y - 1, w - x, h - y);
        if (edgeDist === 0) perimeterVisits++;
        if (edgeDist >= 2) centerVisits++;
        quadrants[(y - 1 < h / 2 ? 0 : 2) + (x - 1 < w / 2 ? 0 : 1)]++;
        if (i > 0) {
            const dx = pairs[i][0] - pairs[i - 1][0], dy = pairs[i][1] - pairs[i - 1][1];
            const isJump = Math.abs(dx) + Math.abs(dy) !== 1;
            if (isJump) { jumps++; runs.push(runLen); runLen = 0; lastDx = 0; lastDy = 0; continue; }
            if (i > 1 && (dx !== lastDx || dy !== lastDy) && (lastDx !== 0 || lastDy !== 0)) {
                turns++;
                runs.push(runLen);
                runLen = 1;
            } else runLen++;
            lastDx = dx; lastDy = dy;
        }
    }
    runs.push(runLen);
    const start = pairs[0], end = pairs[n - 1];
    const meanRun = runs.length ? runs.reduce((a, b) => a + b, 0) / runs.length : 0;
    return {
        coverage: seen.size / (w * h),
        perimeterFrac: perimeterVisits / n,
        centerFrac: centerVisits / n,
        turnRate: turns / Math.max(1, n - 1),
        meanRun,
        jumps,
        quadrants: quadrants.map(q => q / n),
        crossTiming: crossPositions.length
            ? crossPositions.reduce((a, b) => a + b, 0) / crossPositions.length
            : 0,
        crossCount: crossPositions.length,
        closureRatio: (Math.abs(start[0] - end[0]) + Math.abs(start[1] - end[1])) / Math.max(1, n - 1),
        occupancy: occupancyGrid(pairs, w, h),
    };
}

// ─── Distance / novelty ──────────────────────────────────────────────────────

const jaccardDist = (a, b) => {
    if (a.size === 0 && b.size === 0) return 0;
    let inter = 0;
    for (const v of a) if (b.has(v)) inter++;
    return 1 - inter / (a.size + b.size - inter);
};

const relDiff = (a, b) => Math.abs(a - b) / Math.max(1, Math.abs(a), Math.abs(b));
const cap = (v) => Math.min(1, v);

/**
 * Distance in [0,1] between two levelFeatures() results. Blends scalar features,
 * mechanic distributions, layout occupancy, portal topology and witness geometry
 * (the witness component is skipped when either side lacks one).
 */
export function levelDistance(fa, fb) {
    let d = 0, wsum = 0;
    const add = (weight, value) => { d += weight * cap(value); wsum += weight; };

    add(1.0, relDiff(fa.area, fb.area));
    add(0.6, relDiff(fa.aspect, fb.aspect));
    add(1.2, relDiff(fa.reqLen, fb.reqLen));
    add(1.2, relDiff(fa.reqInt, fb.reqInt));
    add(1.0, Math.abs(fa.requiredPathCoverageRatio - fb.requiredPathCoverageRatio));
    add(0.8, fa.routingRegime === fb.routingRegime ? 0 : 1);
    add(0.5, relDiff(fa.gates, fb.gates));
    for (const key of ['mustPass', 'mustCross', 'portalPairs', 'flippers', 'surround', 'mustTurn', 'adjTurn', 'geese', 'falseGoals'])
        add(0.35, relDiff(fa[key], fb[key]));
    add(0.9, jaccardDist(fa.blockOccupancy, fb.blockOccupancy));
    add(0.5, jaccardDist(fa.flipperOccupancy, fb.flipperOccupancy));
    add(0.5, portalTopoDist(fa.portalTopology, fb.portalTopology));
    add(0.6, gateLayoutDist(fa, fb));

    if (fa.witness && fb.witness) {
        const wa = fa.witness, wb = fb.witness;
        add(1.4, jaccardDist(wa.occupancy, wb.occupancy));
        add(0.6, Math.abs(wa.coverage - wb.coverage));
        add(0.5, Math.abs(wa.perimeterFrac - wb.perimeterFrac));
        add(0.5, Math.abs(wa.centerFrac - wb.centerFrac));
        add(0.5, Math.abs(wa.turnRate - wb.turnRate));
        add(0.4, relDiff(wa.meanRun, wb.meanRun));
        add(0.4, Math.abs(wa.crossTiming - wb.crossTiming));
        add(0.4, relDiff(wa.jumps, wb.jumps));
        add(0.4, Math.abs(wa.closureRatio - wb.closureRatio));
        add(0.4, wa.quadrants.reduce((s, q, i) => s + Math.abs(q - wb.quadrants[i]), 0) / 2);
    }
    return d / wsum;
}

function portalTopoDist(ta, tb) {
    if (ta.length === 0 && tb.length === 0) return 0;
    if (ta.length === 0 || tb.length === 0) return 1;
    const n = Math.max(ta.length, tb.length);
    let d = Math.abs(ta.length - tb.length) / n;
    for (let i = 0; i < Math.min(ta.length, tb.length); i++)
        d += (Math.abs(ta[i].span - tb[i].span) + jaccardDist(ta[i].cells, tb[i].cells)) / (2 * n);
    return cap(d);
}

function gateLayoutDist(fa, fb) {
    const norm = (pts, f) => new Set(pts.map(([x, y]) =>
        `${Math.round(((x - 1) / Math.max(1, f.w)) * 4)},${Math.round(((y - 1) / Math.max(1, f.h)) * 4)}`));
    const ga = norm(fa.gateLayout.concat([fa.goal]), fa);
    const gb = norm(fb.gateLayout.concat([fb.goal]), fb);
    return jaccardDist(ga, gb);
}

/** Min distance of `candidate` to a pool of levelFeatures; returns score + nearest info. */
export function noveltyAgainstPool(candidate, pool) {
    let min = Infinity, nearest = null;
    for (const entry of pool) {
        const d = levelDistance(candidate, entry.features);
        if (d < min) { min = d; nearest = entry.id; }
    }
    return { noveltyScore: pool.length === 0 ? 1 : Math.min(1, min), nearestId: nearest };
}

// ─── Structural complexity ───────────────────────────────────────────────────

/**
 * Structural complexity in [0,1]: richness of the puzzle itself, independent of how
 * hard the solver will find it. Mechanic mass + diversity + spatial interaction +
 * witness geometry richness + scale.
 */
export function structuralComplexity(raw, witnessPairs) {
    const f = levelFeatures(raw, witnessPairs);
    const mechanicMass = f.mustPass + f.mustCross + 2 * f.portalPairs + 2 * f.flippers
        + 2 * f.surround + f.mustTurn + f.adjTurn + Math.max(0, f.gates - 1);
    const kinds = ['mustPass', 'mustCross', 'portalPairs', 'flippers', 'surround', 'mustTurn', 'adjTurn']
        .filter(k => f[k] > 0).length + (f.gates > 1 ? 1 : 0) + (f.blocks > 0 ? 1 : 0);
    const interaction = mechanicInteraction(raw);
    const wd = f.witness;
    const witnessRichness = wd
        ? cap(wd.turnRate * 1.6) * 0.4 + cap(wd.crossCount / 8) * 0.3 + cap(wd.jumps / 3) * 0.3
        : 0;
    return Number((
        0.30 * cap(mechanicMass / 14) +
        0.20 * cap(kinds / 7) +
        0.20 * interaction +
        0.20 * witnessRichness +
        0.10 * cap(f.area / 225)
    ).toFixed(3));
}

/** Fraction of mechanic pairs within Chebyshev distance 2 of another mechanic (0..1). */
function mechanicInteraction(raw) {
    const cells = [];
    for (const m of raw.mustPass || []) cells.push([m.x, m.y]);
    for (const m of raw.mustCross || []) cells.push([m.x, m.y]);
    for (const ff of raw.flippingFilters || []) cells.push([ff.x, ff.y]);
    for (const p of raw.portals || []) { cells.push([p.x1, p.y1]); cells.push([p.x2, p.y2]); }
    for (const lm of raw.landmarks || []) cells.push([lm.x, lm.y]);
    if (cells.length < 2) return 0;
    let near = 0;
    for (let i = 0; i < cells.length; i++) {
        for (let j = i + 1; j < cells.length; j++) {
            if (Math.max(Math.abs(cells[i][0] - cells[j][0]), Math.abs(cells[i][1] - cells[j][1])) <= 2) {
                near++;
                break;
            }
        }
    }
    return near / (cells.length - 1);
}

// ─── Challenge model (ridge regression on audit history) ────────────────────

export const MODEL_FEATURE_NAMES = [
    'area', 'aspect', 'reqLen', 'reqInt', 'requiredPathCoverageRatio', 'gates', 'blocks',
    'mustPass', 'mustCross', 'portalPairs', 'flippers', 'geese',
];

export function modelVector(f) {
    return MODEL_FEATURE_NAMES.map(name => f[name]);
}

/** Ridge regression via normal equations (features are standardized internally). */
export function fitRidge(rows, targets, lambda = 1.0) {
    const n = rows.length, d = rows[0].length;
    const mean = new Array(d).fill(0), std = new Array(d).fill(0);
    for (const r of rows) for (let j = 0; j < d; j++) mean[j] += r[j] / n;
    for (const r of rows) for (let j = 0; j < d; j++) std[j] += (r[j] - mean[j]) ** 2 / n;
    for (let j = 0; j < d; j++) std[j] = Math.sqrt(std[j]) || 1;
    const X = rows.map(r => [1, ...r.map((v, j) => (v - mean[j]) / std[j])]);
    const dim = d + 1;
    const A = Array.from({ length: dim }, () => new Array(dim).fill(0));
    const b = new Array(dim).fill(0);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < dim; j++) {
            b[j] += X[i][j] * targets[i];
            for (let k = 0; k < dim; k++) A[j][k] += X[i][j] * X[i][k];
        }
    }
    for (let j = 1; j < dim; j++) A[j][j] += lambda;
    const coef = solveLinear(A, b);
    return { coef, mean, std, featureNames: MODEL_FEATURE_NAMES };
}

export function predictRidge(model, row) {
    let y = model.coef[0];
    for (let j = 0; j < row.length; j++)
        y += model.coef[j + 1] * ((row[j] - model.mean[j]) / model.std[j]);
    return y;
}

function solveLinear(A, b) {
    const n = b.length;
    const M = A.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < n; col++) {
        let piv = col;
        for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
        [M[col], M[piv]] = [M[piv], M[col]];
        const p = M[col][col] || 1e-12;
        for (let r = 0; r < n; r++) {
            if (r === col) continue;
            const factor = M[r][col] / p;
            for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
        }
    }
    return M.map((row, i) => row[n] / (row[i] || 1e-12));
}

// ─── Shared pool loading (published corpus + hints) ──────────────────────────

/** Pearson correlation (used by analyze for prediction accuracy). */
export function pearson(xs, ys) {
    const n = xs.length;
    if (n < 3) return 0;
    const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
        sxy += (xs[i] - mx) * (ys[i] - my);
        sxx += (xs[i] - mx) ** 2;
        syy += (ys[i] - my) ** 2;
    }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}

/** Spearman rank correlation. */
export function spearman(xs, ys) {
    const rank = (arr) => {
        const idx = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
        const ranks = new Array(arr.length);
        idx.forEach(([, i], r) => { ranks[i] = r; });
        return ranks;
    };
    return pearson(rank(xs), rank(ys));
}

/** Packed hint key (0-indexed) → 1-indexed [x,y]. Hints in data/hints are packed-key arrays. */
export function packedToPair(k) {
    return [(k & 0xFFFF) + 1, ((k >>> 16) & 0xFFFF) + 1];
}
