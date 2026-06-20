import { getEl, resolveEl, setText, setStyle, addClass, removeClass, setInlineStyle, toggleClass, show, hide, createSvgElement } from './dom.js';

let messageTimer = null;

const SEVERITY_COLOR_PATTERNS = [
    { severity: 'error',   pattern: /^!?text-red-\d+$/ },
    { severity: 'warning', pattern: /^!?text-(yellow|amber)-\d+$/ },
    { severity: 'success', pattern: /^!?text-(emerald|green)-\d+$/ },
    { severity: 'muted',   pattern: /^!?text-slate-\d+$/ },
];

// Callers historically expressed intent (error/warning/success/muted) via a hardcoded
// Tailwind text-color class rather than the `severity` argument, which `showMessage`
// always hardcodes to 'info'. Recover that intent from the class instead of discarding it.
const detectSeverityFromClassName = (className = '') => {
    const tokens = `${className}`.split(/\s+/);
    const match = SEVERITY_COLOR_PATTERNS.find(({ pattern }) => tokens.some(token => pattern.test(token)));
    return match ? match.severity : null;
};

// Also strips font-weight tokens: the template below hardcodes font-black, but many
// callers redundantly carry their own font-bold/font-black left over from before that
// hardcoding existed — since .font-bold is declared after .font-black in app.css, equal
// specificity means font-bold silently wins the cascade, making "urgent" messages render
// lighter than plain confirmations. Stripping them makes weight consistent across severities.
const stripAlertOverrideClasses = (className = '') =>
    `${className}`.split(/\s+/).filter(token => token
        && !/^!?text-/.test(token)
        && !/^!?font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/.test(token)
    ).join(' ');

export const setStatus = (text = '', severity = 'info', className = '') => {
    const el = getEl('message');
    if (!el) return;
    const resolvedSeverity = severity === 'info' ? (detectSeverityFromClassName(className) || 'info') : severity;
    const safeClassName = stripAlertOverrideClasses(className);
    el.className = `font-black text-[var(--theme-alert-text)] text-[0.9rem] uppercase tracking-tighter leading-tight drop-shadow-lg ${safeClassName}`.trim();
    el.dataset.severity = resolvedSeverity;
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
