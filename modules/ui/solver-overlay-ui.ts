import { SOLVER_RUNNING } from '../app-constants.js';
import { getEl, resolveEl, setStyle, setText, setTextContent, setButtonState, showOverlay, hideOverlay } from './dom.js';

let solverAbortRequested = false;

export const setSearchIndicatorVisible = (visible: any) => {
    if (visible) showOverlay('searchIndicator');
    else         hideOverlay('searchIndicator');
};

export const setSolverControlsEnabled = (enabled: any) => {
    setButtonState('solveLevelBtn',   { enabled });
    setButtonState('editTrapSpotsBtn', { enabled });
    const hintEl = resolveEl('hintBtn');
    if (!hintEl) return;
    setStyle(hintEl, 'pointerEvents', enabled ? 'auto' : 'none');
    setStyle(hintEl, 'opacity',       enabled ? '1'    : '0.5');
};

export const setSolverTimerText  = (text: any)     => setTextContent('solverTimer',       text);
export const setSolverDetailText = (text: any)     => setTextContent('solverDetailLabel', text);
export const setSolverProgress   = (pct: any = 0) => {
    const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
    setStyle(getEl('solverProgressBar'), 'width', `${clamped}%`);
    setText(getEl('solverProgressPct'), `${Math.round(clamped)}%`);
};

export const setSolverAbortRequested = (requested: any) => { solverAbortRequested = !!requested; };

export const createSolverOverlayUI = () => {
    const applyOverlayState = (state: any) => {
        if (state === SOLVER_RUNNING) {
            setSearchIndicatorVisible(true);
            setButtonState('solverCloseBtn', { enabled: true });
            if (!solverAbortRequested) setTextContent('searchLabel', 'Finding Solutions...');
            if (!solverAbortRequested) setSolverDetailText('Preparing solver…');
            setSolverProgress(0);
            setSolverControlsEnabled(false);
            return;
        }
        setSearchIndicatorVisible(false);
        setButtonState('solverCloseBtn', { enabled: true });
        setSolverControlsEnabled(true);
    };
    return { applyOverlayState };
};
