import { getEl, resolveEl, setText, setStyle, addClass, removeClass, setInlineStyle, toggleClass, show, hide, createSvgElement } from './dom.js';

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

const getBombNode = (overlay) => overlay ? overlay.querySelector('#scaryBomb') : null;

const renderBombReady = (bomb) => {
    if (!bomb) return;
    const svg = createSvgElement('svg', { viewBox: '0 0 100 100', class: 'w-full h-full' });
    svg.append(createSvgElement('use', { href: '#def-falsegoal' }));
    bomb.replaceChildren(svg);
};

const renderBombExplosion = (bomb) => {
    if (!bomb) return;
    const svg = createSvgElement('svg', { viewBox: '0 0 100 100', class: 'w-full h-full' });
    svg.append(
        createSvgElement('circle', {
            cx: 50,
            cy: 50,
            r: 45,
            fill: 'none',
            stroke: 'var(--theme-bomb-blast-ring)',
            'stroke-width': 10,
            'stroke-dasharray': '10 5',
            class: 'animate-ping',
        }),
        createSvgElement('path', {
            d: 'M 50 10 L 50 90 M 10 50 L 90 50 M 20 20 L 80 80 M 20 80 L 80 20',
            stroke: 'var(--theme-bomb-blast-rays)',
            'stroke-width': 8,
        }),
    );
    bomb.replaceChildren(svg);
};

export const showBombDetonation = ({ exploded = false } = {}) => {
    const overlay = getEl('bombJumpScare');
    show(overlay);
    const bomb = getBombNode(overlay);
    if (exploded) renderBombExplosion(bomb);
    else renderBombReady(bomb);
};

export const hideBombDetonation = ({ reset = true } = {}) => {
    const overlay = getEl('bombJumpScare');
    hide(overlay);
    if (reset) renderBombReady(getBombNode(overlay));
};
