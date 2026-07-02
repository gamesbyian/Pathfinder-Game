// Typed contracts for the injected dependency bags (the composition-root "ports").
//
// Controllers/factories receive these subsystems through `ControllerDeps` (see state.ts). Giving
// the domain-object-bearing bags real interfaces here — rather than laundering them through
// `any` — means level objects, raw level data, and solver results stay typed end-to-end at every
// call site. Signatures keep `any` for genuinely dynamic params; the *return* types carry the
// domain types (EngineLevel, …) so callers get checked access to the objects that flow out.

import type { EngineLevel } from './domain/level-schema.js';
import type { PackedKey } from './domain/cell-key.js';

export interface LevelBounds { minX: number; minY: number; maxX: number; maxY: number; }

/** Result of validating a candidate path against the domain rules. */
export type PathValidation = { ok: true; path: number[] } | { ok: false; reason: string };

/** A solver run result (mirrors solver/orchestration.ts SolveResult). */
export interface SolveResult {
    ok: boolean;
    status: string;
    solution: number[] | null;
    solutions: number[][];
    attempts: unknown[];
    totalMs: number;
    nodesExpanded: number;
}

/**
 * `levelUtils` — the level codec/geometry/query bag built by `createLevelUtils`. The clone,
 * normalize, and parse methods return `EngineLevel`, so level objects are typed at every consumer.
 */
export interface LevelUtils {
    PACK(x: number, y: number): PackedKey;
    UNPACK(k: PackedKey): { x: number; y: number };
    inBounds(x: number, y: number, w: number, h: number): boolean;
    expCoords(keys: Iterable<number>): { x: number; y: number }[];
    transformPoint(x: number, y: number, variant: any, w: number, h: number): { tx: number; ty: number };
    inverseTransformPoint(tx: number, ty: number, variant: any, w: number, h: number): { x: number; y: number };
    transformAxis(axis: any, variant: any): any;
    getGridCoord(e: { clientX: number; clientY: number }): { x: number; y: number };
    canonicalCloneLevel(src: any, options?: { includeHints?: boolean }): EngineLevel;
    deepCloneLevel(src: any): EngineLevel;
    cloneLevelWithReq(src: any, reqLen: any, reqInt: any): EngineLevel;
    normalizeLevel(idx: number): EngineLevel | null;
    denormalizeLevel(level: any): any;
    shiftLevelCoords(l: any, dx: number, dy: number): void;
    applyCoordMapToLevel(l: any, coordMap: any, newW: number, newH: number, axisMap: any): void;
    getLevelBounds(l: any): LevelBounds | null;
    assertLevelShape(level: any): void;
    processRawLevel(raw: any, id?: number | null): EngineLevel | null;
    getRawLevels(): any[];
    resolvePortal(level: any, key: number, lastWasPortalJump?: boolean): any;
    getPortalDisplayColor(level: any, key: number): any;
    isValidMove(...args: any[]): any;
    normalizeMetadata(raw?: any): { designerName: string; description: string; difficulty: number | null };
    hasParitySwitchingPortal(level: any): boolean;
    getParityInvalidKeys(level: any): any;
    canonicalLevelFingerprintPayload(level: any): any;
    getLevelFingerprintSource(level: any): any;
    getLevelFingerprint(level: any): any;
    isSameLevelStructure(a: any, b: any): boolean;
}

/** `data` — the level/theme data store built by `createData`. */
export interface DataService {
    ingest(opts?: { levels?: any[]; themes?: any }): boolean;
    appendLevels(rawLevels: any[]): void;
    getLevels(): any[];
    getLevel(index: number): any;
    getThemes(): Record<string, any>;
    getTheme(id: string): any;
    getValidation(): Readonly<{ ok: boolean; errors: readonly string[]; warnings: readonly string[] }>;
    isLoaded(): boolean;
}

/** `solverApi` — the hint-solver facade built by `createSolver`. */
export interface SolverApi {
    prepareLevelForSolver(rawLevel: any, opts?: any): any;
    universalSolveLevel(level: any, opts?: any): Promise<SolveResult>;
    solveLevel(level: any, opts?: any): Promise<SolveResult>;
    solve(level: any, opts?: any): Promise<SolveResult>;
    findTrapSpots(level: any, opts?: any): Promise<any>;
    classifyFalseGoals(level: any, result: any): any;
    getTrapSpotBudgetMs(level: any): number;
    validateCandidatePath(level: any, pathCoordsOrKeys: any[]): PathValidation;
}
