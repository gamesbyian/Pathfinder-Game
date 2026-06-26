export function createCore() {
    const $ = (id: any) => (document.getElementById(id) as any);
    const AXIS = { NONE: 0, H: 1, V: 2 };
    const { H, V, NONE } = AXIS;
    const DEV = false;
    const MODES = { PLAY: 0, EDITOR: 1, REVIEW: 2 };
    const { PLAY, EDITOR, REVIEW } = MODES;

    const LogicStatus = {
        IDLE: "IDLE",
        DRAGGING: "DRAGGING",
        PORTAL_PAUSE: "PORTAL_PAUSE",
        RESOLVED: "RESOLVED",
        HAZARD_TRIGGERED: "HAZARD_TRIGGERED",
        EDIT_DRAG: "EDIT_DRAG"
    };
    const { IDLE, DRAGGING, PORTAL_PAUSE, RESOLVED, HAZARD_TRIGGERED, EDIT_DRAG } = LogicStatus;

    const OverlayStatus = {
        NONE: "NONE",
        HINT_ANIMATING: "HINT_ANIMATING",
        FALSE_GOAL_ANIMATING: "FALSE_GOAL_ANIMATING",
        GOOSE_OVERLAY: "GOOSE_OVERLAY",
        SOLVER_RUNNING: "SOLVER_RUNNING"
    };
    const { NONE: OVERLAY_NONE, HINT_ANIMATING, FALSE_GOAL_ANIMATING, GOOSE_OVERLAY, SOLVER_RUNNING } = OverlayStatus;

    const SOUND_BUS = (() => {
        let synth: any = null;
        let unlockArmed = false;
        let _isMuted = () => false;
        const armUnlock = () => {
            if (unlockArmed || typeof window === 'undefined' || !(window as any).Tone) return;
            unlockArmed = true;
            const unlock = async () => {
                try { await (window as any).Tone.start(); } catch (_: any) {}
                try {
                    if ((window as any).Tone.context && (window as any).Tone.context.state !== 'running') {
                        await (window as any).Tone.context.resume();
                    }
                } catch (_: any) {}
            };
            const opts = { once: true, passive: true };
            window.addEventListener('pointerdown', unlock, opts);
            window.addEventListener('keydown', unlock, opts);
            window.addEventListener('touchstart', unlock, opts);
        };
        const getSynth = () => {
            if (!(window as any).Tone) return null;
            if (!synth) synth = new (window as any).Tone.Synth().toDestination();
            return synth;
        };
        return {
            armUnlock,
            setMutedProvider(fn: any) { _isMuted = fn; },
            play(freq: any, dur: any = "16n") {
                if (_isMuted()) return;
                if (!(window as any).Tone) return;
                armUnlock();
                if ((window as any).Tone.context?.state !== 'running') return;
                const s = getSynth();
                if (s) {
                    try { s.triggerAttackRelease(freq, dur); } catch (_: any) {}
                }
            }
        };
    })();
    SOUND_BUS.armUnlock();

    const deepClone = (value: any) => {
        try { return structuredClone(value); }
        catch (_: any) { return JSON.parse(JSON.stringify(value)); }
    };

    return { $, AXIS, H, V, NONE, DEV, MODES, PLAY, EDITOR, REVIEW, LogicStatus, IDLE, DRAGGING, PORTAL_PAUSE, RESOLVED, HAZARD_TRIGGERED, EDIT_DRAG, OverlayStatus, OVERLAY_NONE, HINT_ANIMATING, FALSE_GOAL_ANIMATING, GOOSE_OVERLAY, SOLVER_RUNNING, SOUND_BUS, deepClone };
}
