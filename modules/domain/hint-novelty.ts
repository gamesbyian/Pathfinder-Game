import { UNPACK } from './cell-key.js';

export interface CoordLike { x: number; y: number }
export interface PortalLike { x1: number; y1: number; x2: number; y2: number }
export interface GridLike { w: number; h: number }
export interface HintNoveltyLevel {
    grid: GridLike;
    gates?: CoordLike[];
    goal?: CoordLike;
    falseGoals?: CoordLike[];
    blocks?: CoordLike[];
    mustPass?: CoordLike[];
    mustCross?: CoordLike[];
    filters?: CoordLike[];
    flippingFilters?: CoordLike[];
    geese?: CoordLike[];
    landmarks?: CoordLike[];
    portals?: PortalLike[];
    hints?: number[][];
}

export interface HeatmapNoveltyStats {
    touchedCells: number;
    untouchedNonObjectCells: number;
    coldThreshold: number;
    coldTouchedCells: number;
    entropy: number;
    topCellDominance: number;
}

export interface CandidateHeatmapNovelty {
    newCells: number;
    coldCells: number;
    cellNovelty: number;
    newEdges: number;
    edgeNovelty: number;
    score: number;
}

export interface CandidateNoveltyEvaluation {
    duplicate: boolean;
    coverageNovel: boolean;
    nearestEdgeDistance: number;
    heatmap: CandidateHeatmapNovelty;
}

export type CandidateAcceptanceReason =
    | 'at-cap'
    | 'duplicate'
    | 'coverage-novel'
    | 'distinct-heatmap-novel'
    | 'heatmap-novel'
    | 'too-similar'
    | 'low-heatmap-novelty';

export interface CandidateAcceptanceOptions {
    maxHintsPerLevel?: number;
    diversityFloor?: number;
    heatmapScoreFloor?: number;
}

export interface CandidateAcceptanceDecision {
    accept: boolean;
    reason: CandidateAcceptanceReason;
    evaluation: CandidateNoveltyEvaluation;
}

export const DEFAULT_MAX_HINTS_PER_LEVEL = 1000;
export const DEFAULT_DIVERSITY_FLOOR = 0.65;
export const DEFAULT_HEATMAP_SCORE_FLOOR = 1;

export function pathSignature(path: number[]): string {
    return path.join(',');
}

export function isDrawnStep(a: number, b: number): boolean {
    const pa = UNPACK(a);
    const pb = UNPACK(b);
    return Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y) === 1;
}

export function drawnEdgeKey(a: number, b: number): string | null {
    if (!isDrawnStep(a, b)) return null;
    return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export function drawnEdgeSet(path: number[]): Set<string> {
    const edges = new Set<string>();
    for (let i = 1; i < path.length; i++) {
        const edge = drawnEdgeKey(path[i - 1], path[i]);
        if (edge) edges.add(edge);
    }
    return edges;
}

export function portalSignature(path: number[]): string {
    const jumps: string[] = [];
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1];
        const b = path[i];
        if (!isDrawnStep(a, b)) jumps.push(`${a}>${b}`);
    }
    return jumps.sort().join(',');
}

export function coverageCellKey(path: number[]): string {
    return `${path[0] ?? ''}|${portalSignature(path)}`;
}

export function coverageCellsForHints(hints: number[][]): Set<string> {
    return new Set(hints.map(coverageCellKey));
}

export function pathVisitCells(path: number[], grid: GridLike): Set<string> {
    const cells = new Set<string>();
    for (const key of path) {
        const { x, y } = UNPACK(key);
        if (x < 0 || x >= grid.w || y < 0 || y >= grid.h) continue;
        cells.add(`${x},${y}`);
    }
    return cells;
}

export function collectObjectCells(level: HintNoveltyLevel): Set<string> {
    const cells = new Set<string>();
    const add = (x: number, y: number) => cells.add(`${x - 1},${y - 1}`);
    for (const gate of level.gates || []) add(gate.x, gate.y);
    if (level.goal) add(level.goal.x, level.goal.y);
    for (const item of level.falseGoals || []) add(item.x, item.y);
    for (const item of level.blocks || []) add(item.x, item.y);
    for (const item of level.mustPass || []) add(item.x, item.y);
    for (const item of level.mustCross || []) add(item.x, item.y);
    for (const item of level.filters || []) add(item.x, item.y);
    for (const item of level.flippingFilters || []) add(item.x, item.y);
    for (const item of level.geese || []) add(item.x, item.y);
    for (const item of level.landmarks || []) add(item.x, item.y);
    for (const portal of level.portals || []) {
        add(portal.x1, portal.y1);
        add(portal.x2, portal.y2);
    }
    return cells;
}

export function buildHintVisitCounts(level: HintNoveltyLevel): Map<string, number> {
    const counts = new Map<string, number>();
    for (const hint of level.hints || []) {
        for (const cell of pathVisitCells(hint, level.grid)) counts.set(cell, (counts.get(cell) || 0) + 1);
    }
    return counts;
}

export function buildHintEdgeCounts(hints: number[][]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const hint of hints) {
        for (const edge of drawnEdgeSet(hint)) counts.set(edge, (counts.get(edge) || 0) + 1);
    }
    return counts;
}

export function entropy(values: number[]): number {
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total === 0) return 0;
    let out = 0;
    for (const value of values) {
        if (value === 0) continue;
        const p = value / total;
        out -= p * Math.log2(p);
    }
    return out;
}

export function percentile(sortedValues: number[], q: number): number {
    if (!sortedValues.length) return 0;
    const idx = Math.min(sortedValues.length - 1, Math.max(0, Math.floor((sortedValues.length - 1) * q)));
    return sortedValues[idx];
}

export function jaccardDistance(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 0;
    let inter = 0;
    const [small, big] = a.size < b.size ? [a, b] : [b, a];
    for (const value of small) if (big.has(value)) inter++;
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : 1 - inter / union;
}

export function nearestDrawnEdgeDistance(candidate: number[], existingHints: number[][]): number {
    if (!existingHints.length) return 1;
    const candidateEdges = drawnEdgeSet(candidate);
    let nearest = 1;
    for (const hint of existingHints) nearest = Math.min(nearest, jaccardDistance(candidateEdges, drawnEdgeSet(hint)));
    return nearest;
}

export function heatmapNoveltyStats(level: HintNoveltyLevel): HeatmapNoveltyStats {
    const counts = buildHintVisitCounts(level);
    const objectCells = collectObjectCells(level);
    let untouchedNonObjectCells = 0;
    for (let y = 0; y < level.grid.h; y++) {
        for (let x = 0; x < level.grid.w; x++) {
            const key = `${x},${y}`;
            if (!objectCells.has(key) && !counts.has(key)) untouchedNonObjectCells++;
        }
    }

    const nonzero = [...counts.values()].sort((a, b) => a - b);
    const coldThreshold = percentile(nonzero, 0.25);
    const coldTouchedCells = coldThreshold === 0 ? 0 : nonzero.filter(value => value <= coldThreshold).length;
    const totalVisits = nonzero.reduce((sum, value) => sum + value, 0);
    const hottest = nonzero.length ? nonzero[nonzero.length - 1] : 0;

    return {
        touchedCells: counts.size,
        untouchedNonObjectCells,
        coldThreshold,
        coldTouchedCells,
        entropy: Number(entropy(nonzero).toFixed(3)),
        topCellDominance: totalVisits === 0 ? 0 : Number((hottest / totalVisits).toFixed(4)),
    };
}

export function scoreCandidateHeatmapNovelty(level: HintNoveltyLevel, candidate: number[]): CandidateHeatmapNovelty {
    const hints = level.hints || [];
    const cellCounts = buildHintVisitCounts(level);
    const edgeCounts = buildHintEdgeCounts(hints);
    const nonzeroCellCounts = [...cellCounts.values()].sort((a, b) => a - b);
    const coldThreshold = percentile(nonzeroCellCounts, 0.25);
    const candidateCells = pathVisitCells(candidate, level.grid);
    const candidateEdges = drawnEdgeSet(candidate);
    let newCells = 0;
    let coldCells = 0;
    let cellNovelty = 0;
    let newEdges = 0;
    let edgeNovelty = 0;

    for (const cell of candidateCells) {
        const count = cellCounts.get(cell) || 0;
        if (count === 0) newCells++;
        else if (coldThreshold > 0 && count <= coldThreshold) coldCells++;
        cellNovelty += 1 / (1 + count);
    }
    for (const edge of candidateEdges) {
        const count = edgeCounts.get(edge) || 0;
        if (count === 0) newEdges++;
        edgeNovelty += 1 / (1 + count);
    }

    return {
        newCells,
        coldCells,
        cellNovelty: Number(cellNovelty.toFixed(4)),
        newEdges,
        edgeNovelty: Number(edgeNovelty.toFixed(4)),
        score: Number((2 * newCells + coldCells + cellNovelty + edgeNovelty).toFixed(4)),
    };
}

export function evaluateCandidateNovelty(level: HintNoveltyLevel, candidate: number[]): CandidateNoveltyEvaluation {
    const hints = level.hints || [];
    const signatures = new Set(hints.map(pathSignature));
    const existingCoverageCells = coverageCellsForHints(hints);
    return {
        duplicate: signatures.has(pathSignature(candidate)),
        coverageNovel: !existingCoverageCells.has(coverageCellKey(candidate)),
        nearestEdgeDistance: Number(nearestDrawnEdgeDistance(candidate, hints).toFixed(4)),
        heatmap: scoreCandidateHeatmapNovelty(level, candidate),
    };
}

export function decideCandidateAcceptance(
    level: HintNoveltyLevel,
    candidate: number[],
    opts: CandidateAcceptanceOptions = {},
): CandidateAcceptanceDecision {
    const maxHintsPerLevel = opts.maxHintsPerLevel ?? DEFAULT_MAX_HINTS_PER_LEVEL;
    const diversityFloor = opts.diversityFloor ?? DEFAULT_DIVERSITY_FLOOR;
    const heatmapScoreFloor = opts.heatmapScoreFloor ?? DEFAULT_HEATMAP_SCORE_FLOOR;
    const evaluation = evaluateCandidateNovelty(level, candidate);
    const hintCount = level.hints?.length ?? 0;

    if (hintCount >= maxHintsPerLevel) return { accept: false, reason: 'at-cap', evaluation };
    if (evaluation.duplicate) return { accept: false, reason: 'duplicate', evaluation };
    if (evaluation.coverageNovel) return { accept: true, reason: 'coverage-novel', evaluation };
    if (evaluation.heatmap.score < heatmapScoreFloor) return { accept: false, reason: 'low-heatmap-novelty', evaluation };
    if (evaluation.nearestEdgeDistance >= diversityFloor) return { accept: true, reason: 'distinct-heatmap-novel', evaluation };
    if (evaluation.heatmap.newCells > 0 || evaluation.heatmap.newEdges > 0) return { accept: true, reason: 'heatmap-novel', evaluation };
    return { accept: false, reason: 'too-similar', evaluation };
}
