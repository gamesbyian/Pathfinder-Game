export function installThemeEditor(APP) {
    APP.UI.ThemeEditor = (() => {
        const noop = () => false;
        return {
            init() {},
            getDragState() { return { pointerId: null, isDragging: false }; },
            markPointerDrag() {},
            setDragGhost() {},
            clearDragState() {},
            hasTapSelection() { return false; },
            setSwatchSelected() {},
            applySwatchReplace: noop,
            renderAll() {},
            openEditorView() {},
            closeEditorView() {}
        };
    })();
}
