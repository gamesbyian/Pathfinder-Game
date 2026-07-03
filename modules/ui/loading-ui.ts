import { getEl, resolveEl, setText, setStyle, removeClass } from './dom.js';
import { setStatus } from './toast-ui.js';

export const setProgress = ({ phase = '', current = null, total = null, pct = null, detail = '', mode = '' }: any = {}) => {
    if (pct !== null && pct !== undefined) {
        const clamped = Math.max(0, Math.min(100, Number(pct)));
        setText(getEl('loadPercent'), `${Math.round(clamped)}%`);
        setStyle(getEl('loadProgressBar'), 'width', `${clamped}%`);
    }
    const parts = [];
    if (phase) parts.push(phase);
    if (current !== null && total !== null) parts.push(`${current}/${total}`);
    if (detail) parts.push(detail);
    if (mode)   parts.push(mode);
    if (parts.length) setText(getEl('loadStatusLabel'), parts.join(' • '));
};

// User-facing startup-failure display (loading overlay + toast). Distinct from the
// error-reporting seam (error-reporting.ts): this shows the player something broke;
// `reportError` tells the developer.
export const showStartupError = (kind: any, payload: any) => {
    const details = payload?.message || payload?.reason || 'Unknown initialization failure.';
    const el = resolveEl('loadErrorMessage');
    if (el) {
        el.textContent = `Startup error (${kind}): ${details}`;
        removeClass(el, 'hidden');
    }
    setStatus(`Startup error (${kind})`, 'error');
};
