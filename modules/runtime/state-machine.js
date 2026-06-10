// Logic-state transition table for the Pathfinder game engine.
// These string values MUST stay in sync with APP.Core.LogicStatus.

const IDLE             = 'IDLE';
const DRAGGING         = 'DRAGGING';
const PORTAL_PAUSE     = 'PORTAL_PAUSE';
const RESOLVED         = 'RESOLVED';
const HAZARD_TRIGGERED = 'HAZARD_TRIGGERED';
const EDIT_DRAG        = 'EDIT_DRAG';

export const VALID_LOGIC_TRANSITIONS = {
    [IDLE]:             [DRAGGING, EDIT_DRAG, RESOLVED],
    [DRAGGING]:         [IDLE, PORTAL_PAUSE, RESOLVED, HAZARD_TRIGGERED],
    [PORTAL_PAUSE]:     [DRAGGING, IDLE, RESOLVED],
    [RESOLVED]:         [IDLE],
    [HAZARD_TRIGGERED]: [IDLE],
    [EDIT_DRAG]:        [IDLE]
};

export function isValidLogicTransition(from, to) {
    if (to === IDLE) return true;
    return VALID_LOGIC_TRANSITIONS[from]?.includes(to) ?? false;
}
