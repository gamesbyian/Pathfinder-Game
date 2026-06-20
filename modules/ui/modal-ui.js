import { resolveEl, addClass, removeClass, setText } from './dom.js';
import { activateFocusTrap, releaseFocusTrap } from './focus-trap.js';

// Escape (or a release) dismisses a modal by clicking its in-modal close/dismiss control
// when one exists — so the control's own handler runs — and otherwise just hides it.
const dismissModal = (el, id) => {
    const btn = [...el.querySelectorAll('.modal-close-btn, .modal-dismiss')]
        .find(b => !b.disabled && b.offsetParent !== null);
    if (btn) btn.click();
    else closeModal(id);
};

export const openModal = (id) => {
    const el = resolveEl(id);
    if (!el) return;
    removeClass(el, 'hidden');
    activateFocusTrap(el, { onEscape: () => dismissModal(el, id) });
};

export const closeModal = (id) => {
    const el = resolveEl(id);
    if (!el) return;
    releaseFocusTrap(el);
    addClass(el, 'hidden');
};

export const isModalOpen = (id) => { const el = resolveEl(id); return !!el && !el.classList.contains('hidden'); };

export const toggleModal = (id, force = null) => {
    const el = resolveEl(id);
    if (!el) return false;
    const next = (force === null) ? el.classList.contains('hidden') : force;
    if (next) openModal(id); else closeModal(id);
    return next;
};

export const setModalContent = (id, value, _mode = 'text') => {
    const el = resolveEl(id);
    if (!el) return;
    setText(el, value);
};

export const closeAllModals = () => {
    ['guideModal', 'editorHelpModal', 'winModal', 'themeModal', 'unsavedModal', 'publishedLevelsModal',
     'paletteVariantPopup', 'solveOptionsModal']
        .forEach(id => closeModal(id));
};
