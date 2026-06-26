import { getEl, resolveEl, setText, setStyle, setInlineStyle, toggleClass, show, hide, createSvgElement } from './dom.js';

let messageTimer: any = null;

// Toast severity drives the message colour via the semantic `.alert-message` class plus a
// `data-severity` attribute (see #message[data-severity="…"] rules in components.css). Callers
// pass one of these tokens; anything unrecognised falls back to the neutral 'info' colour.
const VALID_SEVERITIES = new Set(['info', 'error', 'warning', 'success', 'muted']);
const normalizeSeverity = (severity: any) => (VALID_SEVERITIES.has(severity) ? severity : 'info');

export const setStatus = (text: any = '', severity: any = 'info') => {
    const el = getEl('message');
    if (!el) return;
    el.className = 'alert-message';
    el.dataset.severity = normalizeSeverity(severity);
    setText(el, text);
};

export const setCompletionBurstVisible = (isVisible: any) => {
    toggleClass(resolveEl('completionBurst'), 'hidden', !isVisible);
};

export const flashMessage = (text: any = '', severity: any = 'info', duration: any = 1200) => {
    const overlay = getEl('alertOverlay');
    setStatus(text, severity);
    if (!overlay) return;
    // #alertOverlay is permanently pointer-events:none (it's a passive message layer), so
    // only the opacity is toggled to show/hide it.
    setStyle(overlay, 'opacity', text ? '1' : '0');
    if (!text) return;
    setTimeout(() => {
        setStyle(overlay, 'opacity', '0');
    }, duration);
};

export const showMessage = (text: any = '', severity: any = 'info', durationMs: any = 2000) => {
    setStatus(text, severity);
    const overlay = getEl('alertOverlay');
    if (!overlay) return;
    if (text === '') { setInlineStyle(overlay, 'opacity', '0'); return; }
    setInlineStyle(overlay, 'opacity', '1');
    if (messageTimer) clearTimeout(messageTimer);
    messageTimer = setTimeout(() => { setInlineStyle(overlay, 'opacity', '0'); }, durationMs);
};

export const showSolverAlreadyRunning = () => showMessage('Solver already running.', 'warning');

export const showGooseJumpScare = () => show(getEl('gooseJumpScare'));
export const hideGooseJumpScare = () => hide(getEl('gooseJumpScare'));

const getBombNode = (overlay: any) => overlay ? overlay.querySelector('#scaryBomb') : null;

const renderBombReady = (bomb: any) => {
    if (!bomb) return;
    const svg = createSvgElement('svg', { viewBox: '0 0 100 100', class: 'fill' });
    svg.append(createSvgElement('use', { href: '#def-falsegoal' }));
    bomb.replaceChildren(svg);
};

const renderBombExplosion = (bomb: any) => {
    if (!bomb) return;
    const svg = createSvgElement('svg', { viewBox: '0 0 100 100', class: 'fill' });
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

export const showBombDetonation = ({ exploded = false }: any = {}) => {
    const overlay = getEl('bombJumpScare');
    show(overlay);
    const bomb = getBombNode(overlay);
    if (exploded) renderBombExplosion(bomb);
    else renderBombReady(bomb);
};

export const hideBombDetonation = ({ reset = true }: any = {}) => {
    const overlay = getEl('bombJumpScare');
    hide(overlay);
    if (reset) renderBombReady(getBombNode(overlay));
};
