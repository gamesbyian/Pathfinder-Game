import { getEl, setInlineStyle, setHTML } from './dom.js';

export const EditorDragGhost = (() => {
    const getPaletteIconSVG = (type) => {
        if (!type) return '';
        const icon = document.querySelector(`.palette-item[data-type="${type}"] svg`);
        return icon ? icon.outerHTML : '';
    };

    const isPointerOverPalette = (x, y) => {
        const palEl = getEl('editorPalette');
        if (!palEl || palEl.classList.contains('hidden')) return false;
        const r = palEl.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };

    const update = ({ visible = false, x = 0, y = 0, cellSize = 0, type = '', isOverPalette = false } = {}) => {
        const ghostEl = getEl('dragGhost');
        if (!ghostEl) return;
        if (!visible || isOverPalette) {
            setInlineStyle(ghostEl, 'display', 'none');
            setHTML(ghostEl, '');
            return;
        }
        const ghostSize = cellSize * 1.15;
        setInlineStyle(ghostEl, 'width',  `${ghostSize}px`);
        setInlineStyle(ghostEl, 'height', `${ghostSize}px`);
        setInlineStyle(ghostEl, 'left',   `${x}px`);
        setInlineStyle(ghostEl, 'top',    `${y}px`);
        if (!ghostEl.innerHTML) setHTML(ghostEl, getPaletteIconSVG(type));
        setInlineStyle(ghostEl, 'display', 'flex');
    };

    return { update, getPaletteIconSVG, isPointerOverPalette };
})();
