export function installCore(APP) {
    APP.Core = (() => {
        const $ = id => document.getElementById(id);
        const AXIS = { NONE: 0, H: 1, V: 2 };
        const { H, V, NONE } = AXIS;
        const DEV = false;
        const MODES = { PLAY: 0, EDITOR: 1 };
        const { PLAY, EDITOR } = MODES;

        const LogicStatus = {
            IDLE: "IDLE",
            DRAGGING: "DRAGGING",
            PORTAL_PAUSE: "PORTAL_PAUSE",
            RESOLVED: "RESOLVED",
            HAZARD_TRIGGERED: "HAZARD_TRIGGERED",
            EDIT_DRAG: "EDIT_DRAG",
            THEME_DRAG: "THEME_DRAG"
        };
        const { IDLE, DRAGGING, PORTAL_PAUSE, RESOLVED, HAZARD_TRIGGERED, EDIT_DRAG, THEME_DRAG } = LogicStatus;

        const OverlayStatus = {
            NONE: "NONE",
            HINT_ANIMATING: "HINT_ANIMATING",
            FALSE_GOAL_ANIMATING: "FALSE_GOAL_ANIMATING",
            GOOSE_OVERLAY: "GOOSE_OVERLAY",
            SOLVER_RUNNING: "SOLVER_RUNNING"
        };
        const { NONE: OVERLAY_NONE, HINT_ANIMATING, FALSE_GOAL_ANIMATING, GOOSE_OVERLAY, SOLVER_RUNNING } = OverlayStatus;


        const SOUND_BUS = (() => {
            let synth = null;
            let unlockArmed = false;
            const armUnlock = () => {
                if (unlockArmed || typeof window === 'undefined' || !window.Tone) return;
                unlockArmed = true;
                const unlock = async () => {
                    try { await window.Tone.start(); } catch (_) {}
                    try {
                        if (window.Tone.context && window.Tone.context.state !== 'running') {
                            await window.Tone.context.resume();
                        }
                    } catch (_) {}
                };
                const opts = { once: true, passive: true };
                window.addEventListener('pointerdown', unlock, opts);
                window.addEventListener('keydown', unlock, opts);
                window.addEventListener('touchstart', unlock, opts);
            };
            const getSynth = () => {
                if (!window.Tone) return null;
                if (!synth) synth = new window.Tone.Synth().toDestination();
                return synth;
            };
            return {
                armUnlock,
                play(freq, dur = "16n") {
                    if (APP.State?.ENGINE?.muted) return;
                    if (!window.Tone) return;
                    armUnlock();
                    if (window.Tone.context?.state !== 'running') return;
                    const s = getSynth();
                    if (s) {
                        try { s.triggerAttackRelease(freq, dur); } catch (_) {}
                    }
                }
            };
        })();
        SOUND_BUS.armUnlock();

        const deepClone = (value) => {
            try {
                if (typeof structuredClone === 'function') return structuredClone(value);
            } catch (_) { /* fallthrough */ }
            try { return JSON.parse(JSON.stringify(value)); }
            catch (_) { return value; }
        };

        return { $, AXIS, H, V, NONE, DEV, MODES, PLAY, EDITOR, LogicStatus, IDLE, DRAGGING, PORTAL_PAUSE, RESOLVED, HAZARD_TRIGGERED, EDIT_DRAG, THEME_DRAG, OverlayStatus, OVERLAY_NONE, HINT_ANIMATING, FALSE_GOAL_ANIMATING, GOOSE_OVERLAY, SOLVER_RUNNING, SOUND_BUS, deepClone };
    })();
}
