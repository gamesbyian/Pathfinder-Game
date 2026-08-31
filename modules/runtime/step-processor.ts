// Pure step computation: no DOM, no sound bus, no timers, no ENGINE-level state access.
//
// Mutates `nav` and `hazards` in-place (path push, undo stack, goose reveal).
// Returns { outcome, events, mutations } where:
//   outcome  — 'backtrack' | 'valid' | 'portal' | 'goose' | 'detonate' | null
//   events   — gameplay-event / side-effect descriptors using GameEventType / EffectType constants
//   mutations.ripples — { x, y, color }[] the engine must append (with startTime) to ENGINE.ripples
//
// Callers restore `outcome === 'backtrack'` to 'valid' if they need the old interface.

import { GameEventType } from './actions.js';
import { EffectType }  from './effects.js';
import type { MoveOptions, MoveState, NormalizedLevel, PathMetricsState, PortalExit } from '../domain/types.js';
import type { HazardState, NavSnapshot, NavigationState } from '../state-slices.js';

type EffectTypeValue = (typeof EffectType)[keyof typeof EffectType];

type StepGameEvent =
    | { type: typeof GameEventType.WIN }
    | { type: typeof GameEventType.LOGIC_STATE_CHANGE; value: string };

/** A typed descriptor emitted by computeStep, either a gameplay event or an effect. */
export type StepEvent =
    | StepGameEvent
    | ({ type: EffectTypeValue } & Record<string, any>);
interface Ripple { x: number; y: number; color: string; }
interface ComputeStepResult { outcome: string | null; events: StepEvent[]; mutations: { ripples: Ripple[] }; }

/**
 * Injected dependencies for `computeStep` (kept as an explicit port so the step logic stays pure).
 *
 * The data flowing across this seam carries real domain types — the live `nav`/`hazards` slices,
 * `NormalizedLevel`, and the move/metric projections — so a renamed field or a wrong-typed argument
 * fails `check:types` here at the integration point, not silently at runtime. The wrapper that builds
 * this object (engine/step-dispatcher) bridges any impl-side impedance (see its `wouldCreate…` wrap).
 */
interface ComputeStepDeps {
    isValidMove: (target: number, state: MoveState, level: NormalizedLevel, options: MoveOptions) => boolean;
    /** `state` is the live nav slice (optionally patched with `revealedGeese`); the impl widens it to TapRouteState. */
    wouldCreateBlockedTIntersection: (state: NavigationState & { revealedGeese?: Set<number> }, key: number, level: NormalizedLevel) => boolean;
    resolvePortal: (level: NormalizedLevel, key: number) => PortalExit | null;
    areWinMetricsSatisfied: (state: PathMetricsState, level: NormalizedLevel) => boolean;
    getPortalDisplayColor: (level: NormalizedLevel, key: number, themeColor: string) => string;
    UNPACK: (key: number) => { x: number; y: number };
    pushStepOnNav: (nav: NavigationState, key: number, isJump: boolean, level: NormalizedLevel) => void;
    truncateNavTo: (nav: NavigationState, targetLength: number) => void;
    createNavSnapshot: () => NavSnapshot;
    checkWinCondition: (nav: NavigationState, level: NormalizedLevel, mode: number, logicState: string) => boolean;
    MoveContext: typeof import('../domain/move-context.js')['MoveContext'];
    HAZARD_TRIGGERED: string;
    PORTAL_PAUSE: string;
    EDITOR: number;
    REVIEW: number;
    portalThemeColor: string;
}

/**
 * @param nav  the live engine nav slice (mutated in place)
 * @param hazards  the live engine hazards slice (mutated in place)
 */
export function computeStep(nav: NavigationState, hazards: HazardState, mode: number, logicState: string, level: NormalizedLevel, targetKey: number, {
    isValidMove,
    wouldCreateBlockedTIntersection,
    resolvePortal,
    areWinMetricsSatisfied,
    getPortalDisplayColor,
    UNPACK,
    pushStepOnNav,      // (nav, key, isJump, level) — mutates nav in-place
    truncateNavTo,      // (nav, targetLength) — mutates nav in-place (splice + rebuild)
    createNavSnapshot,  // () => snapshot — reads current nav/hazards/logicState
    checkWinCondition,  // (nav, level, mode, logicState) => bool
    MoveContext,
    HAZARD_TRIGGERED,
    PORTAL_PAUSE,
    EDITOR,
    REVIEW,
    portalThemeColor,
}: ComputeStepDeps): ComputeStepResult {
    const events: StepEvent[]  = [];
    const ripples: Ripple[] = [];

    // --- Backtrack: step onto the previous cell ---
    if (nav.path.length > 1 && targetKey === nav.path[nav.path.length - 2]) {
        truncateNavTo(nav, nav.path.length - 2);
        events.push({ type: EffectType.PLAY_SOUND, note: 'E4', duration: '32n' });
        return { outcome: 'backtrack', events, mutations: { ripples } };
    }

    const isPlayMode = mode !== EDITOR && mode !== REVIEW;

    // --- Hazard lock: movement blocked while a hazard is active ---
    if (logicState === HAZARD_TRIGGERED && isPlayMode) {
        return { outcome: null, events: [], mutations: { ripples: [] } };
    }

    // --- Validity check ---
    const stateForValidation = { nav, hazards, mode, logicState };
    if (!isValidMove(targetKey, stateForValidation, level, MoveContext.TAP_ROUTE)) {
        return { outcome: null, events: [], mutations: { ripples: [] } };
    }

    // --- T-intersection block ---
    // Merge revealedGeese into the nav-shaped object so wouldCreateBlockedTIntersection
    // (path-state.js:115) can reach it — it moved to hazards in the state-slices refactor.
    const navForTIntersection = hazards.revealedGeese.size > 0
        ? { ...nav, revealedGeese: hazards.revealedGeese }
        : nav;
    if (wouldCreateBlockedTIntersection(navForTIntersection, targetKey, level)) {
        return { outcome: null, events: [], mutations: { ripples: [] } };
    }

    // --- Goose hazard (play mode only) ---
    if (isPlayMode && level.gooseSet.has(targetKey)) {
        const alreadyRevealed = hazards.revealedGeese.has(targetKey);
        if (alreadyRevealed) return { outcome: null, events: [], mutations: { ripples: [] } };
        nav.undoStack.push(createNavSnapshot());
        if (nav.undoStack.length > 200) nav.undoStack.shift();
        const justCreatedIntersection = nav.path.length > 1 && (nav.visitedCounts.get(targetKey) || 0) > 0;
        if (justCreatedIntersection) truncateNavTo(nav, nav.path.length - 2);
        hazards.revealedGeese.add(targetKey);
        events.push({ type: EffectType.SHOW_GOOSE_JUMP_SCARE });
        events.push({ type: GameEventType.LOGIC_STATE_CHANGE, value: HAZARD_TRIGGERED });
        events.push({ type: EffectType.PLAY_SOUND, note: 'C2', duration: '8n' });
        return { outcome: 'goose', events, mutations: { ripples } };
    }

    // --- Normal step ---
    nav.undoStack.push(createNavSnapshot());
    if (nav.undoStack.length > 200) nav.undoStack.shift();
    pushStepOnNav(nav, targetKey, false, level);

    // False goal check at targetKey
    if (hazards.armedFalseGoals.has(targetKey) && areWinMetricsSatisfied(nav, level)) {
        events.push({ type: EffectType.SHOW_FALSE_GOAL_DETONATION, key: targetKey });
        return { outcome: 'detonate', events, mutations: { ripples } };
    }

    // Portal traversal. The armedFalseGoals check on portal.dest is defense-in-depth, not
    // evidence a portal destination can coincide with a false goal in valid data — one object
    // per cell is an absolute invariant (enforced by validateRawLevel; see CLAUDE.md's "Cell
    // occupancy is an absolute invariant" note), so this should never actually fire on a
    // schema-valid level.
    const portal = resolvePortal(level, targetKey);
    if (portal && portal.dest !== -1) {
        pushStepOnNav(nav, portal.dest, true, level);
        if (hazards.armedFalseGoals.has(portal.dest) && areWinMetricsSatisfied(nav, level)) {
            events.push({ type: EffectType.SHOW_FALSE_GOAL_DETONATION, key: portal.dest });
            return { outcome: 'detonate', events, mutations: { ripples } };
        }
        const color = getPortalDisplayColor(level, targetKey, portalThemeColor);
        const src = UNPACK(targetKey);
        const dst = UNPACK(portal.dest);
        ripples.push({ x: src.x, y: src.y, color });
        ripples.push({ x: dst.x, y: dst.y, color });
        events.push({ type: EffectType.PLAY_SOUND, note: 'A5', duration: '16n' });
        events.push({ type: GameEventType.LOGIC_STATE_CHANGE, value: PORTAL_PAUSE });
        if (checkWinCondition(nav, level, mode, PORTAL_PAUSE)) events.push({ type: GameEventType.WIN });
        return { outcome: 'portal', events, mutations: { ripples } };
    }

    // Plain valid move
    events.push({ type: EffectType.PLAY_SOUND, note: 'G4', duration: '32n' });
    if (checkWinCondition(nav, level, mode, logicState)) events.push({ type: GameEventType.WIN });
    return { outcome: 'valid', events, mutations: { ripples } };
}
