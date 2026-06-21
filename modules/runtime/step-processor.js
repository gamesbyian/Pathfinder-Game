// @ts-check
// Pure step computation: no DOM, no sound bus, no timers, no ENGINE-level state access.
//
// Mutates `nav` and `hazards` in-place (path push, undo stack, goose reveal).
// Returns { outcome, events, mutations } where:
//   outcome  — 'backtrack' | 'valid' | 'portal' | 'goose' | 'detonate' | null
//   events   — side-effect descriptors using ActionType / EffectType constants
//   mutations.ripples — { x, y, color }[] the engine must append (with startTime) to ENGINE.ripples
//
// Callers restore `outcome === 'backtrack'` to 'valid' if they need the old interface.

import { ActionType } from './actions.js';
import { EffectType }  from './effects.js';

/** @typedef {import('../domain/types.js').NormalizedLevel} NormalizedLevel */
/** A step event descriptor (carries an ActionType/EffectType `type` + payload). @typedef {{ type: string } & Record<string, any>} StepEvent */
/** @typedef {{ x: number, y: number, color: string }} Ripple */
/** @typedef {{ outcome: string|null, events: StepEvent[], mutations: { ripples: Ripple[] } }} ComputeStepResult */
/**
 * Injected dependencies for `computeStep` (kept as an explicit port so the step logic stays pure).
 * @typedef {Object} ComputeStepDeps
 * @property {(target: number, state: any, level: any, options: any) => boolean} isValidMove
 * @property {(state: any, key: number, level: any) => boolean} wouldCreateBlockedTIntersection
 * @property {(level: any, key: number) => ({ dest: number }|null)} resolvePortal
 * @property {(state: any, level: any) => boolean} areWinMetricsSatisfied
 * @property {(level: any, key: number, themeColor: any) => string} getPortalDisplayColor
 * @property {(key: number) => { x: number, y: number }} UNPACK
 * @property {(nav: any, key: number, isJump: boolean, level: any) => void} pushStepOnNav
 * @property {(nav: any, targetLength: number) => void} truncateNavTo
 * @property {() => any} createNavSnapshot
 * @property {(nav: any, level: any, mode: any, logicState: any) => boolean} checkWinCondition
 * @property {Record<string, any>} MoveContext
 * @property {any} HAZARD_TRIGGERED
 * @property {any} PORTAL_PAUSE
 * @property {any} EDITOR
 * @property {any} REVIEW
 * @property {any} portalThemeColor
 */

/**
 * @param {any} nav  the live engine nav slice (mutated in place)
 * @param {any} hazards  the live engine hazards slice (mutated in place)
 * @param {number} mode @param {any} logicState @param {NormalizedLevel} level @param {number} targetKey
 * @param {ComputeStepDeps} deps @returns {ComputeStepResult}
 */
export function computeStep(nav, hazards, mode, logicState, level, targetKey, {
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
}) {
    /** @type {StepEvent[]} */
    const events  = [];
    /** @type {Ripple[]} */
    const ripples = [];

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
        events.push({ type: ActionType.LOGIC_STATE_CHANGE, value: HAZARD_TRIGGERED });
        events.push({ type: EffectType.PLAY_SOUND, note: 'C2', duration: '8n' });
        return { outcome: 'goose', events, mutations: { ripples } };
    }

    // --- Normal step ---
    nav.undoStack.push(createNavSnapshot());
    if (nav.undoStack.length > 200) nav.undoStack.shift();
    pushStepOnNav(nav, targetKey, false, level);

    // False goal check at targetKey
    if (hazards.armedFalseGoals.has(targetKey) && areWinMetricsSatisfied(nav, level)) {
        events.push({ type: EffectType.SHOW_BOMB_DETONATION, key: targetKey });
        return { outcome: 'detonate', events, mutations: { ripples } };
    }

    // Portal traversal
    const portal = resolvePortal(level, targetKey);
    if (portal && portal.dest !== -1) {
        pushStepOnNav(nav, portal.dest, true, level);
        if (hazards.armedFalseGoals.has(portal.dest) && areWinMetricsSatisfied(nav, level)) {
            events.push({ type: EffectType.SHOW_BOMB_DETONATION, key: portal.dest });
            return { outcome: 'detonate', events, mutations: { ripples } };
        }
        const color = getPortalDisplayColor(level, targetKey, portalThemeColor);
        const src = UNPACK(targetKey);
        const dst = UNPACK(portal.dest);
        ripples.push({ x: src.x, y: src.y, color });
        ripples.push({ x: dst.x, y: dst.y, color });
        events.push({ type: EffectType.PLAY_SOUND, note: 'A5', duration: '16n' });
        events.push({ type: ActionType.LOGIC_STATE_CHANGE, value: PORTAL_PAUSE });
        if (checkWinCondition(nav, level, mode, PORTAL_PAUSE)) events.push({ type: ActionType.WIN });
        return { outcome: 'portal', events, mutations: { ripples } };
    }

    // Plain valid move
    events.push({ type: EffectType.PLAY_SOUND, note: 'G4', duration: '32n' });
    if (checkWinCondition(nav, level, mode, logicState)) events.push({ type: ActionType.WIN });
    return { outcome: 'valid', events, mutations: { ripples } };
}
