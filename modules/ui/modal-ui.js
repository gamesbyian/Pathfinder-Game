import { resolveEl, addClass, removeClass, toggleClass, setText, setHTML } from './dom.js';

export const openModal   = (id) => removeClass(resolveEl(id), 'hidden');
export const closeModal  = (id) => addClass(resolveEl(id), 'hidden');
export const isModalOpen = (id) => { const el = resolveEl(id); return !!el && !el.classList.contains('hidden'); };

export const toggleModal = (id, force = null) => {
    const el = resolveEl(id);
    if (!el) return false;
    const next = (force === null) ? el.classList.contains('hidden') : force;
    toggleClass(el, 'hidden', !next);
    return next;
};

export const setModalContent = (id, value, mode = 'text') => {
    const el = resolveEl(id);
    if (!el) return;
    if (mode === 'html') setHTML(el, value);
    else setText(el, value);
};

export const closeAllModals = () => {
    ['guideModal', 'editorHelpModal', 'winModal', 'themeModal', 'unsavedModal', 'publishedLevelsModal']
        .forEach(id => closeModal(id));
};
