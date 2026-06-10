// Pure step computation: no DOM, no sound bus, no timers, no ENGINE-level state access.
//
// Mutates `nav` and `hazards` in-place (path push, undo stack, goose reveal).
// Returns { outcome, events, mutations } where:
//   outcome  — 'backtrack' | 'valid' | 'portal' | 'goose' | 'detonate' | null
//   events   — side-effect descriptors the engine must dispatch
//   mutations.ripples — { x, y, color }[] the engine must append (with startTime) to ENGINE.ripples
//
// Callers restore `outcome === 'backtrack'` to 'valid' if they need the old interface.

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
    const events  = [];
    const ripples = [];

    // --- Backtrack: step onto the previous cell ---
    if (nav.path.length > 1 && targetKey === nav.path[nav.path.length - 2]) {
        truncateNavTo(nav, nav.path.length - 2);
        events.push({ type: 'sound', note: 'E4', duration: '32n' });
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
    if (wouldCreateBlockedTIntersection(nav, targetKey, level)) {
        return { outcome: null, events: [], mutations: { ripples: [] } };
    }

    // --- Goose hazard (play mode only) ---
    if (isPlayMode && level.gooseSet.has(targetKey)) {
        nav.undoStack.push(createNavSnapshot());
        if (nav.undoStack.length > 200) nav.undoStack.shift();
        const justCreatedIntersection = nav.path.length > 1 && (nav.visitedCounts.get(targetKey) || 0) > 0;
        if (justCreatedIntersection) truncateNavTo(nav, nav.path.length - 2);
        const alreadyRevealed = hazards.revealedGeese.has(targetKey);
        hazards.revealedGeese.add(targetKey);
        if (!alreadyRevealed) {
            events.push({ type: 'goose_jumpscare' });
            events.push({ type: 'logic_state', value: HAZARD_TRIGGERED });
            events.push({ type: 'sound', note: 'C2', duration: '8n' });
        }
        return { outcome: alreadyRevealed ? null : 'goose', events, mutations: { ripples } };
    }

    // --- Normal step ---
    nav.undoStack.push(createNavSnapshot());
    if (nav.undoStack.length > 200) nav.undoStack.shift();
    pushStepOnNav(nav, targetKey, false, level);

    // False goal check at targetKey
    if (hazards.armedFalseGoals.has(targetKey) && areWinMetricsSatisfied(nav, level)) {
        events.push({ type: 'bomb_detonation', key: targetKey });
        return { outcome: 'detonate', events, mutations: { ripples } };
    }

    // Portal traversal
    const portal = resolvePortal(level, targetKey);
    if (portal && portal.dest !== -1) {
        pushStepOnNav(nav, portal.dest, true, level);
        if (hazards.armedFalseGoals.has(portal.dest) && areWinMetricsSatisfied(nav, level)) {
            events.push({ type: 'bomb_detonation', key: portal.dest });
            return { outcome: 'detonate', events, mutations: { ripples } };
        }
        const color = getPortalDisplayColor(level, targetKey, portalThemeColor);
        const src = UNPACK(targetKey);
        const dst = UNPACK(portal.dest);
        ripples.push({ x: src.x, y: src.y, color });
        ripples.push({ x: dst.x, y: dst.y, color });
        events.push({ type: 'sound', note: 'A5', duration: '16n' });
        events.push({ type: 'logic_state', value: PORTAL_PAUSE });
        if (checkWinCondition(nav, level, mode, PORTAL_PAUSE)) events.push({ type: 'win' });
        return { outcome: 'portal', events, mutations: { ripples } };
    }

    // Plain valid move
    events.push({ type: 'sound', note: 'G4', duration: '32n' });
    if (checkWinCondition(nav, level, mode, logicState)) events.push({ type: 'win' });
    return { outcome: 'valid', events, mutations: { ripples } };
}
