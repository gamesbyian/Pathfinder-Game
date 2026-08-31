import * as Tone from 'tone';
import { defaultReportError } from './error-reporting.js';
import type { ReportError } from './ports.js';

export interface AudioService {
    armUnlock(): void;
    setMutedProvider(fn: () => boolean): void;
    play(freq: any, dur?: any): void;
}

/**
 * Browser audio adapter formerly hidden inside core.SOUND_BUS.
 *
 * Ownership is now explicit at the composition root. The adapter preserves the existing one-shot
 * unlock listeners, mute-before-synth behavior, context-resume handling, and first-play-failure
 * suppression contract.
 */
export function createAudioService(
    { reportError = defaultReportError }: { reportError?: ReportError } = {},
): AudioService {
    let synth: any = null;
    let unlockArmed = false;
    let isMuted = () => false;
    let reportedPlayFailure = false;

    const armUnlock = () => {
        if (unlockArmed || typeof window === 'undefined') return;
        unlockArmed = true;
        const unlock = async () => {
            try { await Tone.start(); } catch (e: unknown) { reportError('audio.unlock', e); }
            try {
                if (Tone.context && Tone.context.state !== 'running') {
                    await Tone.context.resume();
                }
            } catch (e: unknown) {
                reportError('audio.context-resume', e);
            }
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

    const audioService: AudioService = {
        armUnlock,
        setMutedProvider(fn) { isMuted = fn; },
        play(freq, dur = "16n") {
            if (isMuted()) return;
            armUnlock();
            if (Tone.context?.state !== 'running') return;
            const currentSynth = getSynth();
            if (!currentSynth) return;
            try {
                currentSynth.triggerAttackRelease(freq, dur);
            } catch (e: unknown) {
                if (!reportedPlayFailure) {
                    reportedPlayFailure = true;
                    reportError('audio.play', e, { note: 'first failure only; later ones suppressed' });
                }
            }
        },
    };

    audioService.armUnlock();
    return audioService;
}
