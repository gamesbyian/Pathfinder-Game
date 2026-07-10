// Pure DOM primitives, element cache, compound helpers, and clipboard.
// No APP dependency — safe to import anywhere (error-reporting is likewise dependency-free).

import { defaultReportError } from '../error-reporting.js';

const dom: Record<string, any> = {};

export const addClass    = (el: any, cls: any)          => { if (el && cls) el.classList.add(cls); };
export const removeClass = (el: any, cls: any)          => { if (el && cls) el.classList.remove(cls); };
export const toggleClass = (el: any, cls: any, force: any)   => { if (el && cls) el.classList.toggle(cls, force); };
export const setText     = (el: any, value: any = '')   => { if (el) el.textContent = `${value}`; };

const SVG_NS = 'http://www.w3.org/2000/svg';

export const createSvgElement = (tag: any, attrs: any = {}) => {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]: any) => {
        if (value === null || value === undefined) return;
        el.setAttribute(key, `${value}`);
    });
    return el;
};

export const replaceSvgChildren = (svg: any, children: any = []) => {
    if (!svg) return;
    svg.replaceChildren(...children.filter(Boolean));
};

export const removeChildren = (el: any) => { if (el) el.replaceChildren(); };
export const setStyle    = (el: any, key: any, value: any)   => { if (el) el.style[key]  = value; };
export const safeEnable  = (el: any, enabled: any = true) => { if (el) el.disabled    = !enabled; };
// `is-shown` is the semantic display hook (defined in components.css) added/removed here at
// runtime, replacing the former Tailwind `flex` class so that utility can be fully removed.
export const show = (el: any, displayClass: any = 'is-shown') => {
    if (!el) return;
    removeClass(el, 'hidden');
    if (displayClass) addClass(el, displayClass);
};
export const hide = (el: any, displayClass: any = 'is-shown') => {
    if (!el) return;
    addClass(el, 'hidden');
    if (displayClass) removeClass(el, displayClass);
};

export const initDom = () => {
    if (dom.__inited) return;
    dom.__inited = true;
    [
        'loadingOverlay','loadPercent','loadProgressBar','loadStatusLabel','loadErrorMessage',
        'message','searchIndicator','searchLabel','solverDetailLabel','solverCloseBtn','solverTimer','solverProgressBar','solverProgressPct',
        'solverBudgetLabel','solverAddMinuteBtn','diverseSearchExtendSection',
        'guideModal','editorHelpModal','winModal','themeModal','unsavedModal','playOptionsBlockedModal','publishedLevelsModal',
        'gooseJumpScare','falseGoalJumpScare','alertOverlay','hintBtn','solutionOutput','completionBurst',
        'themeSelectView','dragGhost',
    ].forEach((id: any) => { dom[id] = (document.getElementById(id) as any); });
};

export const resolveEl = (idOrEl: any) => {
    if (!idOrEl) return null;
    if (typeof idOrEl !== 'string') return idOrEl;
    if (dom[idOrEl]) return dom[idOrEl];
    const found = (document.getElementById(idOrEl) as any);
    if (found) dom[idOrEl] = found;
    return found;
};
export const getEl = (key: any) => resolveEl(key);

export const addClasses    = (el: any, classes: any = []) => { if (!el) return; classes.forEach((cls: any) => addClass(el, cls)); };
export const removeClasses = (el: any, classes: any = []) => { if (!el) return; classes.forEach((cls: any) => removeClass(el, cls)); };

export const setInlineStyle = (idOrEl: any, key: any, value: any) => setStyle(resolveEl(idOrEl), key, value);
export const setTextContent = (idOrEl: any, value: any = '')  => setText(resolveEl(idOrEl), value);
export const setInputValue  = (idOrEl: any, value: any = '')  => { const el = resolveEl(idOrEl); if (el) el.value = value; };

export const setButtonLabel = (idOrEl: any, label: any = '') => setText(resolveEl(idOrEl), label);
export const setButtonState = (id: any, { enabled = true, active = null, label = null, className = null }: any = {}) => {
    const el = resolveEl(id);
    if (!el) return;
    safeEnable(el, enabled);
    if (active    !== null) toggleClass(el, 'selected', !!active);
    if (label     !== null) setText(el, label);
    if (className !== null) el.className = className;
};
export const setClassState = (idOrEl: any, cls: any, on: any) => {
    const el = resolveEl(idOrEl);
    if (!el) return;
    toggleClass(el, cls, !!on);
};

export const setFieldValue   = (id: any, value: any = '') => { const el = resolveEl(id); if (!el) return; el.value = `${value}`; };
export const appendFieldLine = (id: any, line: any = '')  => {
    const el = resolveEl(id);
    if (!el) return;
    el.value += `${line}\n`;
    el.scrollTop = el.scrollHeight;
};
export const clearElement      = (id: any)         => { const el = resolveEl(id); if (!el) return; removeChildren(el); };
export const renderTextList = (idOrEl: any, items: any = [], { className = '', prefix = '' }: any = {}) => {
    const el = resolveEl(idOrEl);
    if (!el) return;
    const values = Array.isArray(items) ? items : [items];
    const nodes = values.map((item: any) => {
        const p = document.createElement('p');
        if (className) p.className = className;
        p.textContent = `${prefix}${item ?? ''}`;
        return p;
    });
    el.replaceChildren(...nodes);
};
export const setSolutionOutput = (value: any = '') => setFieldValue('solutionOutput', value);

export const queryAll  = (selector: any): Element[] => Array.from(document.querySelectorAll(selector));
export const clearClass = (selector: any, cls: any) => { (document.querySelectorAll(selector) as any).forEach((el: any) => removeClass(el, cls)); };
export const bindAll    = (selector: any, eventName: any, handler: any) => {
    queryAll(selector).forEach((el: Element) => el.addEventListener(eventName, (e: Event) => handler(e, el)));
};

export const setRootCssVar = (name: any, value: any) => document.documentElement.style.setProperty(name, value);
export const setBodyStyle  = (key: any, value: any)  => setStyle(document.body, key, value);

export const showOverlay       = (key: any)        => show(getEl(key));
export const hideOverlay       = (key: any)        => hide(getEl(key));
export const setOverlayOpacity = (key: any, value: any) => setStyle(getEl(key), 'opacity', value);

export const getValue   = (idOrEl: any, fallback: any = '')    => { const el = resolveEl(idOrEl); return el ? el.value : fallback; };
export const getChecked = (idOrEl: any, fallback: any = false) => { const el = resolveEl(idOrEl); return el ? !!el.checked : fallback; };
export const getNumber  = (idOrEl: any, fallback: any = 0)     => {
    const v = parseInt(getValue(idOrEl, `${fallback}`), 10);
    return Number.isNaN(v) ? fallback : v;
};

export const copyText = async (text: any, opts: any = {}) => {
    const value = `${text ?? ''}`;
    if (navigator.clipboard?.writeText) {
        // Clipboard API can fail (unfocused document, permissions) — report and fall
        // through to the execCommand fallback below.
        try { await navigator.clipboard.writeText(value); return true; } catch (e: any) { defaultReportError('ui.clipboard-copy', e, { note: 'falling back to execCommand' }); }
    }
    const fallbackEl = opts.fallbackEl || (opts.fallbackElId ? resolveEl(opts.fallbackElId) : null);
    if (!fallbackEl) return false;
    if ('value' in fallbackEl) fallbackEl.value = value;
    else fallbackEl.textContent = value;
    if (typeof fallbackEl.select === 'function') fallbackEl.select();
    try { return document.execCommand('copy'); } catch (_: any) { return false; }
};
