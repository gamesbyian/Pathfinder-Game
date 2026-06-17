// Pure DOM primitives, element cache, compound helpers, and clipboard.
// No APP dependency — safe to import anywhere.

const dom = {};

export const addClass    = (el, cls)          => { if (el && cls) el.classList.add(cls); };
export const removeClass = (el, cls)          => { if (el && cls) el.classList.remove(cls); };
export const toggleClass = (el, cls, force)   => { if (el && cls) el.classList.toggle(cls, force); };
export const setText     = (el, value = '')   => { if (el) el.textContent = `${value}`; };

const SVG_NS = 'http://www.w3.org/2000/svg';

export const createSvgElement = (tag, attrs = {}) => {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        el.setAttribute(key, `${value}`);
    });
    return el;
};

export const replaceSvgChildren = (svg, children = []) => {
    if (!svg) return;
    svg.replaceChildren(...children.filter(Boolean));
};

export const removeChildren = (el) => { if (el) el.replaceChildren(); };
export const setStyle    = (el, key, value)   => { if (el) el.style[key]  = value; };
export const safeEnable  = (el, enabled=true) => { if (el) el.disabled    = !enabled; };
export const show = (el, displayClass = 'flex') => {
    if (!el) return;
    removeClass(el, 'hidden');
    if (displayClass) addClass(el, displayClass);
};
export const hide = (el, displayClass = 'flex') => {
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
        'guideModal','editorHelpModal','winModal','themeModal','unsavedModal','playOptionsBlockedModal','publishedLevelsModal',
        'gooseJumpScare','bombJumpScare','alertOverlay','hintBtn','solutionOutput','completionBurst',
        'themeSelectView','dragGhost',
    ].forEach(id => { dom[id] = document.getElementById(id); });
};

export const resolveEl = (idOrEl) => {
    if (!idOrEl) return null;
    if (typeof idOrEl !== 'string') return idOrEl;
    if (dom[idOrEl]) return dom[idOrEl];
    const found = document.getElementById(idOrEl);
    if (found) dom[idOrEl] = found;
    return found;
};
export const getEl = (key) => resolveEl(key);

export const addClasses    = (el, classes = []) => { if (!el) return; classes.forEach(cls => addClass(el, cls)); };
export const removeClasses = (el, classes = []) => { if (!el) return; classes.forEach(cls => removeClass(el, cls)); };

export const setInlineStyle = (idOrEl, key, value) => setStyle(resolveEl(idOrEl), key, value);
export const setTextContent = (idOrEl, value = '')  => setText(resolveEl(idOrEl), value);
export const setInputValue  = (idOrEl, value = '')  => { const el = resolveEl(idOrEl); if (el) el.value = value; };

export const setButtonLabel = (idOrEl, label = '') => setText(resolveEl(idOrEl), label);
export const setButtonState = (id, { enabled = true, active = null, label = null, className = null } = {}) => {
    const el = resolveEl(id);
    if (!el) return;
    safeEnable(el, enabled);
    if (active    !== null) toggleClass(el, 'selected', !!active);
    if (label     !== null) setText(el, label);
    if (className !== null) el.className = className;
};
export const setClassState = (idOrEl, cls, on) => {
    const el = resolveEl(idOrEl);
    if (!el) return;
    toggleClass(el, cls, !!on);
};

export const setFieldValue   = (id, value = '') => { const el = resolveEl(id); if (!el) return; el.value = `${value}`; };
export const appendFieldLine = (id, line = '')  => {
    const el = resolveEl(id);
    if (!el) return;
    el.value += `${line}\n`;
    el.scrollTop = el.scrollHeight;
};
export const clearElement      = (id)         => { const el = resolveEl(id); if (!el) return; removeChildren(el); };
export const renderTextList = (idOrEl, items = [], { className = '', prefix = '' } = {}) => {
    const el = resolveEl(idOrEl);
    if (!el) return;
    const values = Array.isArray(items) ? items : [items];
    const nodes = values.map((item) => {
        const p = document.createElement('p');
        if (className) p.className = className;
        p.textContent = `${prefix}${item ?? ''}`;
        return p;
    });
    el.replaceChildren(...nodes);
};
export const setSolutionOutput = (value = '') => setFieldValue('solutionOutput', value);

export const queryAll  = (selector) => Array.from(document.querySelectorAll(selector));
export const clearClass = (selector, cls) => { document.querySelectorAll(selector).forEach(el => removeClass(el, cls)); };
export const bindAll    = (selector, eventName, handler) => {
    queryAll(selector).forEach(el => el.addEventListener(eventName, (e) => handler(e, el)));
};

export const setRootCssVar = (name, value) => document.documentElement.style.setProperty(name, value);
export const setBodyStyle  = (key, value)  => setStyle(document.body, key, value);

export const showOverlay       = (key)        => show(getEl(key));
export const hideOverlay       = (key)        => hide(getEl(key));
export const setOverlayOpacity = (key, value) => setStyle(getEl(key), 'opacity', value);

export const getValue   = (idOrEl, fallback = '')    => { const el = resolveEl(idOrEl); return el ? el.value : fallback; };
export const getChecked = (idOrEl, fallback = false) => { const el = resolveEl(idOrEl); return el ? !!el.checked : fallback; };
export const getNumber  = (idOrEl, fallback = 0)     => {
    const v = parseInt(getValue(idOrEl, `${fallback}`), 10);
    return Number.isNaN(v) ? fallback : v;
};

export const copyText = async (text, opts = {}) => {
    const value = `${text ?? ''}`;
    if (navigator.clipboard?.writeText) {
        try { await navigator.clipboard.writeText(value); return true; } catch (_) {}
    }
    const fallbackEl = opts.fallbackEl || (opts.fallbackElId ? resolveEl(opts.fallbackElId) : null);
    if (!fallbackEl) return false;
    if ('value' in fallbackEl) fallbackEl.value = value;
    else fallbackEl.textContent = value;
    if (typeof fallbackEl.select === 'function') fallbackEl.select();
    try { return document.execCommand('copy'); } catch (_) { return false; }
};
