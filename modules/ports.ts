// Typed contracts for the injected dependency bags (the composition-root "ports").
//
// Controllers/factories receive these subsystems through `ControllerDeps` (see state.ts). Giving
// the domain-object-bearing bags real interfaces here — rather than laundering them through
// `any` — means level objects, raw level data, and solver results stay typed end-to-end at every
// call site. Signatures keep `any` for genuinely dynamic params; the *return* types carry the
// domain types (EngineLevel, …) so callers get checked access to the objects that flow out.

import type { EngineLevel } from './domain/level-schema.js';
import type { PackedKey } from './domain/cell-key.js';
import type { Attempt } from './solver/orchestration.js';
import type { FalseGoalTriggerSearchOptions } from './solver/false-goal-trigger-search.js';

export interface LevelBounds { minX: number; minY: number; maxX: number; maxY: number; }

/**
 * `reportError` — the single error-reporting seam (hardening plan §4; built by
 * `createErrorReporter` in error-reporting.ts). Failure paths call this instead of ad-hoc
 * `console.*` so production errors have one intentional place to surface; the composition
 * root can point it at a real sink later without touching call sites.
 */
export type ReportError = (context: string, err: unknown, meta?: Record<string, unknown>) => void;

/** Result of validating a candidate path against the domain rules. */
export type PathValidation = { ok: true; path: number[] } | { ok: false; reason: string };

/** Public solver result boundary. Attempt records use orchestration's canonical Attempt contract. */
export interface SolveResult {
    ok: boolean;
    status: string;
    solution: number[] | null;
    solutions: number[][];
    attempts: Attempt[];
    totalMs: number;
    nodesExpanded: number;
    nodeBudgetReached?: boolean;
    workSpent?: number;
    workBudget?: number;
    deadlineTruncated?: boolean;
    solvedByPrime?: boolean;
    stageLifecycle?: Record<string, unknown>;
    schedulerMode?: 'production' | 'legacy-latency-portfolio-experiment';
    legacyLatencyPortfolioExperiment?: {
        solvedBeforeFallback: boolean;
        fallbackAttemptCount: number;
        repeatedAttemptElapsedMs: number;
        repeatedPrefixNodeUpperBound: number;
        runtimeBreakdown?: {
            prepMs: number;
            portfolioAttemptSearchMs: number;
            schedulerOverheadMs: number;
            fallbackSearchMs: number;
            totalMs: number;
        };
    };
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
    applyCoordMapToLevel(l: any, coordMap: any, newW: number, newH: number, axisMap: any, reflect?: boolean): void;
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
}

/** `data` — the level/theme data store built by `createData`. */
export interface DataService {
    ingest(opts?: { levels?: any[]; themes?: any }): boolean;
    appendLevels(rawLevels: any[]): void;
    getLevels(): any[];
    getLevel(index: number): any;
    /**
     * The FULL hint set for a level, lazily fetched from the split `data/hints/<id>.json`
     * artifact and cached (hardening plan §2). Takes the raw level object itself (e.g. from
     * getLevel/getLevels), not a position or id — see the implementation's doc comment
     * (modules/data.ts) for why: a level's own `id` (when it has one) drives the fetch, and a
     * level with no `id` yet always carries inline hints instead, so there's never a call site
     * that has an id/position but not the level object. Levels appended at runtime (published
     * imports) resolve to their inline hints without a fetch. Callers must treat the returned
     * arrays as read-only. Each hint is the canonical `{path, provenance}` shape
     * (domain/hint-types.ts) — callers that only need the path geometry should unwrap via
     * `hintPaths()`.
     */
    getHints(level: any): Promise<import('./domain/hint-types.js').Hint[]>;
    /** Repoints future getHints() fetches at a different corpus's hints (or none, for a corpus
     *  with no saved hints) and clears the hint cache. See modules/dev-corpus.ts. The source
     *  function is called with the level's own persistent `id`, never a position. */
    setHintsSource(hintsSource: ((id: string) => Promise<any[]>) | null): void;
    /** Repoints getHints()'s Firestore supplemental-hints merge (or none) and clears the hint
     *  cache — only ever set for the published corpus. See
     *  modules/persistence/local-level-hints-repository.ts and CLAUDE.md's Provenance section. */
    setFirestoreHintsSource(firestoreHintsSource: ((fingerprint: string) => Promise<import('./domain/hint-types.js').Hint[]>) | null): void;
    getThemes(): Record<string, any>;
    getTheme(id: string): any;
    getValidation(): Readonly<{ ok: boolean; errors: readonly string[]; warnings: readonly string[] }>;
    isLoaded(): boolean;
}

/** `solverApi` — the hint-solver facade built by `createSolver`. */
export interface SolverApi {
    prepareLevelForSolver(rawLevel: any, opts?: any): any;
    solveLevel(level: any, opts?: any): Promise<SolveResult>;
    findTriggerableFalseGoalCells(level: any, opts?: FalseGoalTriggerSearchOptions): Promise<any>;
    classifyFalseGoalTriggerability(level: any, result: any): any;
    getFalseGoalTriggerSearchBudgetMs(level: any): number;
    validateCandidatePath(level: any, pathCoordsOrKeys: any[]): PathValidation;
    /** Create a resumable variety-search session over a normalized level (Editor/Review Solve). */
    createVarietySearch(level: any, existingHints: number[][], config: any): { run(runOpts: any): Promise<any> };
}
