import { getEl, resolveEl, setText, setStyle, addClass, removeClass, setInlineStyle, toggleClass, show, hide, setHTML } from './dom.js';

let messageTimer = null;

const stripAlertTextColorClasses = (className = '') =>
    `${className}`.split(/\s+/).filter(token => token && !/^!?text-/.test(token)).join(' ');

export const setStatus = (text = '', severity = 'info', className = '') => {
    const el = getEl('message');
    if (!el) return;
    const safeClassName = stripAlertTextColorClasses(className);
    el.className = `font-black text-[var(--theme-alert-text)] text-[0.9rem] uppercase tracking-tighter architectural-tight leading-tight drop-shadow-lg ${safeClassName}`.trim();
    el.dataset.severity = severity;
    setText(el, text);
};

export const setCompletionBurstVisible = (isVisible) => {
    toggleClass(resolveEl('completionBurst'), 'hidden', !isVisible);
};

export const flashMessage = (text = '', className = '', duration = 1200) => {
    const overlay = getEl('alertOverlay');
    setStatus(text, 'info', className);
    if (!overlay) return;
    removeClass(overlay, 'pointer-events-none');
    setStyle(overlay, 'opacity', text ? '1' : '0');
    if (!text) {
        addClass(overlay, 'pointer-events-none');
        return;
    }
    setTimeout(() => {
        setStyle(overlay, 'opacity', '0');
        addClass(overlay, 'pointer-events-none');
    }, duration);
};

export const showMessage = (text = '', className = '', durationMs = 2000) => {
    setStatus(text, 'info', className || '');
    const overlay = getEl('alertOverlay');
    if (!overlay) return;
    if (text === '') { setInlineStyle(overlay, 'opacity', '0'); return; }
    setInlineStyle(overlay, 'opacity', '1');
    if (messageTimer) clearTimeout(messageTimer);
    messageTimer = setTimeout(() => { setInlineStyle(overlay, 'opacity', '0'); }, durationMs);
};

export const showSolverAlreadyRunning = () => showMessage('Solver already running.', 'text-amber-600');

export const showGooseJumpScare = () => show(getEl('gooseJumpScare'));
export const hideGooseJumpScare = () => hide(getEl('gooseJumpScare'));

export const showBombDetonation = ({ explodedMarkup } = {}) => {
    const overlay = getEl('bombJumpScare');
    show(overlay);
    if (explodedMarkup) {
        const bomb = overlay ? overlay.querySelector('#scaryBomb') : null;
        setHTML(bomb, explodedMarkup);
    }
};

export const hideBombDetonation = ({ resetMarkup } = {}) => {
    const overlay = getEl('bombJumpScare');
    hide(overlay);
    if (resetMarkup) {
        const bomb = overlay ? overlay.querySelector('#scaryBomb') : null;
        setHTML(bomb, resetMarkup);
    }
};
