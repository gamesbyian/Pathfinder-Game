import { resolveEl, addClass, removeClass, setText } from './dom.js';
import { activateFocusTrap, releaseFocusTrap } from './focus-trap.js';

// Escape (or a release) dismisses a modal by clicking its in-modal close/dismiss control
// when one exists and visible — so the control's own handler runs — and otherwise just hides
// it. The dismiss hook is the `.modal-close-btn` class (screen modals) or a
// `data-modal-dismiss` attribute (loading overlays, whose Close buttons are styled
// differently and shouldn't pick up modal-close-btn styling).
const dismissModal = (el: any, id: any) => {
    const btn = [...el.querySelectorAll('.modal-close-btn, [data-modal-dismiss]')]
        .find((b: any) => !b.disabled && b.offsetParent !== null);
    if (btn) btn.click();
    else closeModal(id);
};

export const openModal = (id: any) => {
    const el = resolveEl(id);
    if (!el) return;
    removeClass(el, 'hidden');
    activateFocusTrap(el, { onEscape: () => dismissModal(el, id) });
};

export const closeModal = (id: any) => {
    const el = resolveEl(id);
    if (!el) return;
    releaseFocusTrap(el);
    addClass(el, 'hidden');
};

export const isModalOpen = (id: any) => { const el = resolveEl(id); return !!el && !el.classList.contains('hidden'); };

export const toggleModal = (id: any, force: any = null) => {
    const el = resolveEl(id);
    if (!el) return false;
    const next = (force === null) ? el.classList.contains('hidden') : force;
    if (next) openModal(id); else closeModal(id);
    return next;
};

export const setModalContent = (id: any, value: any, _mode: any = 'text') => {
    const el = resolveEl(id);
    if (!el) return;
    setText(el, value);
};

export const closeAllModals = () => {
    ['guideModal', 'editorHelpModal', 'winModal', 'themeModal', 'unsavedModal', 'publishedLevelsModal',
     'paletteVariantPopup', 'solveOptionsModal']
        .forEach((id: any) => closeModal(id));
};
