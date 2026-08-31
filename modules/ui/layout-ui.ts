import { setRootCssVar } from './dom.js';
import { markDirty } from '../state-actions.js';

export const getViewportDimensions = () => {
    const vv = window.visualViewport;
    if (vv) return { width: vv.width, height: vv.height };
    return { width: window.innerWidth, height: window.innerHeight };
};

export const measureGridModalRect = () => {
    const appLayout       = (document.getElementById('appLayout') as any);
    const canvasContainer = (document.getElementById('canvasContainer') as any);
    const source          = canvasContainer || appLayout;
    if (!source) return;
    const r = source.getBoundingClientRect();
    setRootCssVar('--grid-modal-left',   `${r.left}px`);
    setRootCssVar('--grid-modal-top',    `${r.top}px`);
    setRootCssVar('--grid-modal-width',  `${r.width}px`);
    setRootCssVar('--grid-modal-height', `${r.height}px`);
};

export const syncEditorPalettePlacement = () => {
    const pal          = (document.getElementById('editorPalette') as any);
    const gamePane     = (document.getElementById('gamePane') as any);
    const controlsPane = (document.getElementById('controlsPane') as any);
    if (!pal || !gamePane || !controlsPane) return;
    if (pal.parentElement !== gamePane.parentElement)
        gamePane.parentElement.insertBefore(pal, controlsPane);
};

export const createLayoutUI = ({ core, getState }: any) => {
    const updateLayoutMode = () => {
        syncEditorPalettePlacement();
        measureGridModalRect();
        requestAnimationFrame(() => measureGridModalRect());
    };

    const updateViewport = () => {
        // Read the canvas directly (it's the same #gameCanvas the renderer owns). Reading it here
        // rather than via an injected renderer keeps ui independent of renderer — no ui↔renderer
        // construction cycle (see app.js stage 2).
        const canvas = (document.getElementById('gameCanvas') as any);
        const rect   = canvas.getBoundingClientRect();
        if (rect.width === 0) return;
        const eng = getState();
        const l = eng.mode === core.PLAY
            ? eng.level
            : eng.editor.workingLevel;
        if (!l) return;
        const swaps = [1, 3, 6, 7];
        eng.viewport.swapped = swaps.includes(eng.orientation);
        const gridW = eng.viewport.swapped ? l.grid.h : l.grid.w;
        const gridH = eng.viewport.swapped ? l.grid.w : l.grid.h;
        eng.viewport.cellW = canvas.width  / gridW;
        eng.viewport.cellH = canvas.height / gridH;
        markDirty(eng);
    };

    const updateAppScale = () => {
        const VIEWPORT_EPSILON = 2;
        const viewport      = getViewportDimensions();
        const eng           = getState();
        const widthChanged  = Math.abs(viewport.width  - eng.viewport.lastWidth)  > VIEWPORT_EPSILON;
        const heightChanged = Math.abs(viewport.height - eng.viewport.lastHeight) > VIEWPORT_EPSILON;
        updateLayoutMode();
        if (!widthChanged && !heightChanged) return;
        eng.viewport.lastWidth  = viewport.width;
        eng.viewport.lastHeight = viewport.height;
        const scale = Math.min(viewport.height * 0.02, viewport.width * 0.035);
        setRootCssVar('--app-scale', `${scale}px`);
        updateViewport();
        markDirty(eng);
    };

    return { updateLayoutMode, updateViewport, updateAppScale };
};
