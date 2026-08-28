// Shared pure path-distinctiveness primitives for display curation and hint discovery.
import { UNPACK } from './cell-key.js';

/** At/above this required path coverage ratio, edge overlap is nearly saturated, so crossing placement also matters. */
export const NEAR_HAMILTONIAN_COVERAGE_THRESHOLD = 0.82;
/** Minimum distinctiveness assigned to any non-zero must-cross order difference. */
export const MUSTCROSS_ORDER_MIN = 0.66;

/** `mcFirst`/`mcFull`: must-cross squares ordered by first entry / completed crossing. */
export interface PathFeatures { edge: Set<string>; cross: Set<string>; len: number; mcFirst: number[]; mcFull: number[]; }

/** Exact path identity. */
export function pathSignature(path: number[]): string { return path.join(','); }

/** Drawn orthogonal step; portal jumps are not drawn. */
export function isDrawnStep(a: number, b: number): boolean {
    const pa = UNPACK(a), pb = UNPACK(b);
    return Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y) === 1;
}

/** Canonical undirected drawn-edge key, else null. */
export function drawnEdgeKey(a: number, b: number): string | null {
    if (!isDrawnStep(a, b)) return null;
    return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/** Drawn path segments; portal jumps excluded. */
export function edgeSet(path: number[]): Set<string> {
    const s = new Set<string>();
    for (let i = 1; i < path.length; i++) {
        const e = drawnEdgeKey(path[i - 1], path[i]);
        if (e) s.add(e);
    }
    return s;
}

/** Cells visited at least twice. */
export function crossingSet(path: number[]): Set<string> {
    const counts = new Map<number, number>();
    for (const k of path) counts.set(k, (counts.get(k) ?? 0) + 1);
    const s = new Set<string>();
    for (const [k, c] of counts) if (c >= 2) s.add(`${k}`);
    return s;
}

/** Sorted directed non-adjacent jumps; captures portal choice/direction independent of traversal order. */
export function portalSignature(path: number[]): string {
    const jumps: string[] = [];
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i];
        if (!isDrawnStep(a, b)) jumps.push(`${a}>${b}`);
    }
    return jumps.sort().join(',');
}

/** Must-cross squares ordered by first entry and by completed crossing (second visit). */
export function mustCrossOrders(path: number[], mcKeys: number[]): { first: number[]; full: number[] } {
    const firstAt = new Map<number, number>(), fullAt = new Map<number, number>(), seen = new Map<number, number>();
    const mc = new Set(mcKeys);
    path.forEach((k, idx) => {
        if (!mc.has(k)) return;
        const c = (seen.get(k) ?? 0) + 1; seen.set(k, c);
        if (c === 1) firstAt.set(k, idx);
        else if (c === 2) fullAt.set(k, idx);
    });
    const order = (at: Map<number, number>) => [...at.keys()].sort((a, b) => at.get(a)! - at.get(b)!);
    return { first: order(firstAt), full: order(fullAt) };
}

/** Normalized Kendall-tau distance; differing membership is maximally different. */
export function orderMismatch(a: number[], b: number[]): number {
    if (a.length !== b.length) return 1;
    const posB = new Map<number, number>(); b.forEach((k, i) => posB.set(k, i));
    let discordant = 0, total = 0;
    for (let i = 0; i < a.length; i++) {
        if (!posB.has(a[i])) return 1;
        for (let j = i + 1; j < a.length; j++) { total++; if (posB.get(a[i])! > posB.get(a[j])!) discordant++; }
    }
    return total === 0 ? 0 : discordant / total;
}

/** Must-cross order distinctiveness across first-entry and full-crossing order. */
export function orderDistance(a: PathFeatures, b: PathFeatures): number {
    const raw = Math.max(orderMismatch(a.mcFirst, b.mcFirst), orderMismatch(a.mcFull, b.mcFull));
    return raw === 0 ? 0 : MUSTCROSS_ORDER_MIN + (1 - MUSTCROSS_ORDER_MIN) * raw;
}

export function jaccardDistance(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 0;
    let inter = 0;
    const [small, big] = a.size < b.size ? [a, b] : [b, a];
    for (const e of small) if (big.has(e)) inter++;
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : 1 - inter / union;
}

/** Build distinctiveness features; empty `mcKeys` disables the order axis. */
export function buildPathFeatures(path: number[], mcKeys: number[] = []): PathFeatures {
    const mco = mcKeys.length ? mustCrossOrders(path, mcKeys) : { first: [], full: [] };
    return { edge: edgeSet(path), cross: crossingSet(path), len: path.length, mcFirst: mco.first, mcFull: mco.full };
}

/** Structural-family key: portal usage, crossing placement, and must-cross orders; ignores local edge detours. */
export function structuralSolutionFamilySignature(path: number[], mcKeys: number[] = []): string {
    const features = buildPathFeatures(path, mcKeys);
    return JSON.stringify({
        portal: portalSignature(path),
        crossings: [...features.cross].sort(),
        mustCrossFirst: features.mcFirst,
        mustCrossFull: features.mcFull,
    });
}

/** Max applicable variety-axis distance: edges always, crossings when requested, must-cross order when present. */
export function featureDistance(a: PathFeatures, b: PathFeatures, useCrossings: boolean): number {
    let d = jaccardDistance(a.edge, b.edge);
    if (useCrossings) d = Math.max(d, jaccardDistance(a.cross, b.cross));
    if (a.mcFirst.length || a.mcFull.length) d = Math.max(d, orderDistance(a, b));
    return d;
}
