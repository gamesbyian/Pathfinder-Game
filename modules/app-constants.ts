/**
 * Application/runtime constants that were formerly bundled into modules/core.ts.
 *
 * These values are plain, immutable vocabulary. Consumers import only the constants they use;
 * there is deliberately no replacement "core" bag.
 */
export const AXIS = Object.freeze({ NONE: 0, H: 1, V: 2 } as const);
export const { H, V, NONE } = AXIS;

export const DEV = false;

export const MODES = Object.freeze({ PLAY: 0, EDITOR: 1, REVIEW: 2 } as const);
export const { PLAY, EDITOR, REVIEW } = MODES;

export const LogicStatus = Object.freeze({
    IDLE: "IDLE",
    DRAGGING: "DRAGGING",
    PORTAL_PAUSE: "PORTAL_PAUSE",
    RESOLVED: "RESOLVED",
    HAZARD_TRIGGERED: "HAZARD_TRIGGERED",
    EDIT_DRAG: "EDIT_DRAG",
} as const);
export const { IDLE, DRAGGING, PORTAL_PAUSE, RESOLVED, HAZARD_TRIGGERED, EDIT_DRAG } = LogicStatus;

export const OverlayStatus = Object.freeze({
    NONE: "NONE",
    HINT_ANIMATING: "HINT_ANIMATING",
    FALSE_GOAL_ANIMATING: "FALSE_GOAL_ANIMATING",
    GOOSE_OVERLAY: "GOOSE_OVERLAY",
    SOLVER_RUNNING: "SOLVER_RUNNING",
} as const);
export const {
    NONE: OVERLAY_NONE,
    HINT_ANIMATING,
    FALSE_GOAL_ANIMATING,
    GOOSE_OVERLAY,
    SOLVER_RUNNING,
} = OverlayStatus;
