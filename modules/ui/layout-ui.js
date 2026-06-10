import { setRootCssVar } from './dom.js';

export const getViewportDimensions = () => {
    const vv = window.visualViewport;
    if (vv) return { width: vv.width, height: vv.height };
    return { width: window.innerWidth, height: window.innerHeight };
};

export const measureGridModalRect = () => {
    const appLayout      = document.getElementById('appLayout');
    const canvasContainer = document.getElementById('canvasContainer');
    const source          = canvasContainer || appLayout;
    if (!source) return;
    const r = source.getBoundingClientRect();
    setRootCssVar('--grid-modal-left',   `${r.left}px`);
    setRootCssVar('--grid-modal-top',    `${r.top}px`);
    setRootCssVar('--grid-modal-width',  `${r.width}px`);
    setRootCssVar('--grid-modal-height', `${r.height}px`);
};

export const syncEditorPalettePlacement = () => {
    const pal          = document.getElementById('editorPalette');
    const gamePane     = document.getElementById('gamePane');
    const controlsPane = document.getElementById('controlsPane');
    if (!pal || !gamePane || !controlsPane) return;
    if (pal.parentElement !== gamePane.parentElement)
        gamePane.parentElement.insertBefore(pal, controlsPane);
};

export const createLayoutUI = (APP) => {
    const updateLayoutMode = () => {
        syncEditorPalettePlacement();
        measureGridModalRect();
        requestAnimationFrame(() => measureGridModalRect());
    };

    const updateViewport = () => {
        const canvas = APP.Renderer.getCanvas();
        const rect   = canvas.getBoundingClientRect();
        if (rect.width === 0) return;
        const l = APP.State.ENGINE.mode === APP.Core.PLAY
            ? APP.State.ENGINE.level
            : APP.State.ENGINE.editor.workingLevel;
        if (!l) return;
        const swaps = [1, 3, 6, 7];
        APP.State.ENGINE.viewport.swapped = swaps.includes(APP.State.ENGINE.variant);
        const gridW = APP.State.ENGINE.viewport.swapped ? l.grid.h : l.grid.w;
        const gridH = APP.State.ENGINE.viewport.swapped ? l.grid.w : l.grid.h;
        APP.State.ENGINE.viewport.cellW = canvas.width  / gridW;
        APP.State.ENGINE.viewport.cellH = canvas.height / gridH;
        APP.State.ENGINE.isDirty = true;
    };

    const updateAppScale = () => {
        const VIEWPORT_EPSILON = 2;
        const viewport      = getViewportDimensions();
        const widthChanged  = Math.abs(viewport.width  - APP.State.ENGINE.viewport.lastWidth)  > VIEWPORT_EPSILON;
        const heightChanged = Math.abs(viewport.height - APP.State.ENGINE.viewport.lastHeight) > VIEWPORT_EPSILON;
        updateLayoutMode();
        if (!widthChanged && !heightChanged) return;
        APP.State.ENGINE.viewport.lastWidth  = viewport.width;
        APP.State.ENGINE.viewport.lastHeight = viewport.height;
        const scale = Math.min(viewport.height * 0.02, viewport.width * 0.035);
        setRootCssVar('--app-scale', `${scale}px`);
        updateViewport();
        APP.State.ENGINE.isDirty = true;
    };

    return { updateLayoutMode, updateViewport, updateAppScale };
};
