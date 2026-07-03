import * as Tone from 'tone';
import { defaultReportError } from './error-reporting.js';

export function createCore({ reportError = defaultReportError }: { reportError?: (context: string, err: unknown, meta?: Record<string, unknown>) => void } = {}) {
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
            if (unlockArmed || typeof window === 'undefined') return;
            unlockArmed = true;
            const unlock = async () => {
                // Failure here means audio never unlocks for the session — report it (the
                // game continues silently, so this would otherwise be invisible).
                try { await Tone.start(); } catch (e: any) { reportError('audio.unlock', e); }
                try {
                    if (Tone.context && Tone.context.state !== 'running') {
                        await Tone.context.resume();
                    }
                } catch (e: any) { reportError('audio.context-resume', e); }
            };
            const opts = { once: true, passive: true };
            window.addEventListener('pointerdown', unlock, opts);
            window.addEventListener('keydown', unlock, opts);
            window.addEventListener('touchstart', unlock, opts);
        };
        const getSynth = () => {
            if (!synth) synth = new Tone.Synth().toDestination();
            return synth;
        };
        let reportedPlayFailure = false;
        return {
            armUnlock,
            setMutedProvider(fn: any) { _isMuted = fn; },
            play(freq: any, dur: any = "16n") {
                if (_isMuted()) return;
                armUnlock();
                if (Tone.context?.state !== 'running') return;
                const s = getSynth();
                if (s) {
                    // Skip the note on failure; report only the first one — a broken synth
                    // fails on every note and would otherwise flood the reporter.
                    try { s.triggerAttackRelease(freq, dur); } catch (e: any) {
                        if (!reportedPlayFailure) { reportedPlayFailure = true; reportError('audio.play', e, { note: 'first failure only; later ones suppressed' }); }
                    }
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
