// Pure theme normalization helpers — no APP references, no DOM access.

import { isSeedTheme, deriveTokens } from '../theme-engine.js';

export function rc() { return `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`; }

export function isValidHexColor(value) {
    return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export const CLASSIC_LEAVE = Object.freeze({ bg: '#dc2626', hover: '#b91c1c', text: '#ffffff', border: '#b91c1c' });

export function toRgb(hex, fallback = { r: 220, g: 38, b: 38 }) {
    const normalized = (hex || '').replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return fallback;
    return {
        r: parseInt(normalized.slice(0, 2), 16),
        g: parseInt(normalized.slice(2, 4), 16),
        b: parseInt(normalized.slice(4, 6), 16),
    };
}

export function darkenHex(hex, factor = 0.85) {
    const { r, g, b } = toRgb(hex);
    return `#${Math.max(0, Math.floor(r * factor)).toString(16).padStart(2, '0')}${Math.max(0, Math.floor(g * factor)).toString(16).padStart(2, '0')}${Math.max(0, Math.floor(b * factor)).toString(16).padStart(2, '0')}`;
}

export function collectThemePaths(obj, prefix = '', out = new Set()) {
    if (!obj || typeof obj !== 'object') return out;
    Object.keys(obj).forEach((key) => {
        const path = prefix ? `${prefix}.${key}` : key;
        out.add(path);
        const value = obj[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) collectThemePaths(value, path, out);
    });
    return out;
}

export function getLeaveThemeColors(theme, isClassic = false) {
    if (isClassic) return { ...CLASSIC_LEAVE };
    const fallbackBase = theme.headerRight || theme.btns?.editClear || theme.btns?.reset || theme.colors?.goal || '#7f1d1d';
    const leave = theme.leave || {};
    let bg = leave.bg || fallbackBase;
    if (bg.toLowerCase() === CLASSIC_LEAVE.bg) bg = theme.headerLeft || theme.colors?.goal || '#7f1d1d';
    let hover = leave.hover || darkenHex(bg, 0.85);
    if (hover.toLowerCase() === CLASSIC_LEAVE.hover) hover = darkenHex(bg, 0.78);
    const { r, g, b } = toRgb(bg);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const text = leave.text || (luminance > 0.55 ? '#0f172a' : '#ffffff');
    const border = leave.border || hover;
    return { bg, hover, text, border };
}

export function normalizeTheme(theme, key = 'theme') {
    if (isSeedTheme(theme)) {
        const base = deriveTokens(theme.seeds);
        if (theme.overrides) {
            for (const k of Object.keys(theme.overrides)) {
                const src = theme.overrides[k];
                if (src && typeof src === 'object' && !Array.isArray(src) && base[k] && typeof base[k] === 'object') {
                    base[k] = { ...base[k], ...src };
                } else {
                    base[k] = src;
                }
            }
        }
        return normalizeTheme(base, key);
    }
    const t = theme || {};
    t.btns = t.btns || {};
    t.modal = t.modal || {};
    t.output = t.output || {};
    t.colors = t.colors || {};
    t.palette = t.palette || {};
    t.win = t.win || {};
    t.alert = t.alert || {};
    t.ctrlArea = t.ctrlArea || {};
    t.text = t.text || {};
    t.mega = t.mega || {};
    t.loading = t.loading || {};
    t.search = t.search || {};
    t.jumpscare = t.jumpscare || {};
    t.shell = t.shell || {};
    t.header = t.header || {};
    t.editor = t.editor || {};
    t.layout = t.layout || {};

    t.bodyBg = t.bodyBg || '#e0f2fe';
    t.canvasBg = t.canvasBg || '#ffffff';
    t.grid = t.grid || '#94a3b8';
    t.headerLeft = t.headerLeft || '#dc2626';
    t.headerRight = t.headerRight || '#2563eb';
    t.path = t.path || '#2563eb';
    t.controls = t.controls || 'rgba(255, 255, 255, 0.7)';
    t.metricText = t.metricText || '#ffffff';
    t.headerLeftText = t.headerLeftText || '#ffffff';
    t.headerLeftLabel = t.headerLeftLabel || 'rgba(255, 255, 255, 0.7)';
    t.ghostBg = t.ghostBg || t.canvasBg;
    t.ghostBorder = t.ghostBorder || t.headerRight;

    const btnFallbacks = {
        undo: t.grid, reset: t.headerLeft, guide: t.headerRight, whoa: t.headerRight,
        hint: t.headerRight, mega: t.headerRight, mute: t.canvasBg, muteIcon: t.headerRight,
        copy: t.canvasBg, gen: t.canvasBg, modeToggle: t.headerRight, orient: t.headerRight,
        solve: t.headerRight, submit: t.btns.solve || t.headerRight, approve: t.btns.editNew || t.headerRight, reject: t.btns.editClear || t.headerLeft,
        editClear: t.headerLeft, editBombs: t.colors.goal || t.headerLeft, editNew: t.headerRight,
    };
    Object.keys(btnFallbacks).forEach(btnKey => { t.btns[btnKey] = t.btns[btnKey] || btnFallbacks[btnKey]; });

    t.modal.bg = t.modal.bg || 'rgba(248, 250, 252, 0.95)';
    t.modal.panelBg = t.modal.panelBg || t.canvasBg;
    t.modal.border = t.modal.border || t.grid;
    t.modal.text = t.modal.text || t.headerRight;
    t.modal.textMuted = t.modal.textMuted || t.grid;
    t.modal.accent = t.modal.accent || t.headerLeft;

    t.output.bg = t.output.bg || t.bodyBg;
    t.output.text = t.output.text || t.modal.text;

    t.colors.gate = t.colors.gate || t.headerRight;
    t.colors.goal = t.colors.goal || t.headerLeft;
    t.colors.block = t.colors.block || t.canvasBg;
    t.colors.pin = t.colors.pin || t.colors.goal;
    t.colors.pinUnflipped = t.colors.pinUnflipped || t.grid;
    t.colors.filter = t.colors.filter || t.modal.text;
    t.colors.portal = t.colors.portal || t.headerRight;
    t.colors.cross = t.colors.cross || t.colors.filter;

    t.palette.bg = t.palette.bg || t.bodyBg;
    t.palette.border = t.palette.border || t.grid;
    t.palette.itemBg = t.palette.itemBg || t.canvasBg;
    t.palette.itemBorder = t.palette.itemBorder || t.grid;
    t.palette.toolBg = t.palette.toolBg || t.palette.bg;

    t.win.bg = t.win.bg || t.canvasBg;
    t.win.border = t.win.border || t.headerRight;
    t.win.text = t.win.text || t.modal.textMuted;
    t.win.accent = t.win.accent || t.modal.accent;

    t.alert.bg = t.alert.bg || t.headerLeft;
    t.alert.stroke = t.alert.stroke || t.grid;

    const pickContrastText = (bg, light = '#f8fafc', dark = '#0f172a') => {
        const rgb = toRgb(bg, { r: 30, g: 41, b: 59 });
        const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
        return luminance > 0.55 ? dark : light;
    };
    const contrastRatio = (a, b) => {
        const toLum = (c) => {
            const rgb = toRgb(c, { r: 30, g: 41, b: 59 });
            const chan = [rgb.r, rgb.g, rgb.b].map(v => {
                const n = v / 255;
                return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
        };
        const l1 = toLum(a);
        const l2 = toLum(b);
        const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
        return (hi + 0.05) / (lo + 0.05);
    };
    const keepOrImproveContrast = (bg, current, min = 3.2) => {
        const existing = current || pickContrastText(bg);
        return contrastRatio(bg, existing) >= min ? existing : pickContrastText(bg);
    };
    const pickThemeNameColor = (bg, candidates, fallback) => {
        const valid = candidates.filter(Boolean);
        if (!valid.length) return fallback;
        return valid.reduce((best, candidate) => (
            contrastRatio(bg, candidate) > contrastRatio(bg, best) ? candidate : best
        ));
    };

    t.ctrlArea.bg = t.ctrlArea.bg || t.palette.bg;
    t.ctrlArea.border = t.ctrlArea.border || t.palette.border;

    t.text.modal = t.text.modal || t.modal.text;
    t.text.modalMuted = t.text.modalMuted || t.modal.textMuted;
    t.text.modalAccent = t.text.modalAccent || t.modal.accent;
    t.text.output = t.text.output || t.output.text;
    t.text.metric = t.text.metric || t.metricText;
    t.text.headerMain = t.text.headerMain || t.headerLeftText;
    t.text.headerSub = t.text.headerSub || t.headerLeftLabel;
    t.text.win = t.text.win || t.win.text;
    t.text.winAccent = t.text.winAccent || t.win.accent;
    t.text.megaDesc = t.text.megaDesc || t.modal.textMuted;
    t.text.megaOutput = t.text.megaOutput || t.output.text;
    t.text.megaPrimary = t.text.megaPrimary || '#ffffff';
    t.text.megaSecondary = t.text.megaSecondary || '#ffffff';
    t.text.megaCopy = t.text.megaCopy || t.modal.text;
    t.text.body = t.text.body || t.modal.text;
    t.text.themeName = pickThemeNameColor(
        t.modal.panelBg || t.canvasBg || '#ffffff',
        [
            t.text.modalAccent, t.modal.accent, t.text.modal, t.modal.text,
            t.text.modalMuted, t.modal.textMuted, t.text.body, t.headerLeftText,
            '#000000', '#ffffff',
        ],
        pickContrastText(t.modal.panelBg || t.canvasBg || '#ffffff', '#ffffff', '#000000')
    );
    t.text.actionBtn = t.text.actionBtn || ((t.bodyBg === '#020617' || t.bodyBg === '#000000') ? '#f8fafc' : '#ffffff');
    t.text.utilityBtn = keepOrImproveContrast(t.btns.copy || '#334155', t.btns.muteIcon);
    t.text.utilityBtnGen = keepOrImproveContrast(t.btns.gen || '#334155', t.btns.muteIcon);
    t.text.error = t.text.error || t.loading.error || '#ef4444';
    t.text.handDrawnShadow = t.text.handDrawnShadow || '#000000';

    const normalizeColorKey = (color) => typeof color === 'string' ? color.trim().toLowerCase() : '';
    const colorMatchesAny = (color, avoid = []) => avoid.some(candidate => normalizeColorKey(candidate) === normalizeColorKey(color));
    const pickDistinctButtonColor = (base, avoid = []) => {
        const candidates = [
            base,
            darkenHex(base, 0.78),
            darkenHex(base, 0.62),
            t.btns.orient,
            t.headerRight,
            darkenHex(t.headerRight, 0.72),
            t.headerLeft,
            darkenHex(t.headerLeft, 0.72),
            t.grid,
            '#0f172a',
            '#f8fafc',
        ].filter(Boolean);
        return candidates.find(candidate => !colorMatchesAny(candidate, avoid)) || base;
    };

    // Keep label colours stable across modes while making the visible button rows
    // alternate enough that adjacent actions never receive the exact same token.
    // Mode rows are:
    // Play:   Guide, Hint, Whoa, Undo, Reset
    // Edit:   Guide, New, Clear, Bombs?, Solve, Submit
    // Review: New, Hint, Solve, Submit, Reject, Approve
    const guideColor = t.btns.guide;
    const hintColor = pickDistinctButtonColor(t.btns.hint, [guideColor]);
    const cautionColor = pickDistinctButtonColor(t.btns.editClear || t.headerLeft, [hintColor]);
    const utilityActionColor = pickDistinctButtonColor(
        t.btns.modeToggle || t.btns.orient || t.headerRight,
        [guideColor, hintColor, cautionColor, t.btns.undo]
    );
    t.btns.guide = guideColor;
    t.btns.solve = guideColor;
    t.btns.hint = hintColor;
    t.btns.whoa = utilityActionColor;
    t.btns.editNew = utilityActionColor;
    t.btns.editBombs = utilityActionColor;
    t.btns.submit = utilityActionColor;
    t.btns.editClear = cautionColor;
    t.btns.reject = cautionColor;
    t.btns.approve = hintColor;
    t.btns.reset = pickDistinctButtonColor(t.btns.reset || cautionColor, [t.btns.undo]);

    // Button roles (Drafting Table grammar): ink = the row's primary action,
    // outline = supporting actions, danger = red-pencil destructive actions.
    t.btns.ink           = t.btns.ink           || t.btns.guide;
    t.btns.danger        = t.btns.danger        || t.btns.reset || t.headerLeft;
    if (contrastRatio(t.canvasBg, t.btns.danger) < 2.5) {
        t.btns.danger = pickContrastText(t.canvasBg, '#f87171', '#b91c1c');
    }
    t.btns.outlineBorder = t.btns.outlineBorder || t.modal.border;
    t.btns.outlineText   = t.btns.outlineText   || keepOrImproveContrast(t.canvasBg, t.text.modalAccent);
    t.text.btnInk        = t.text.btnInk        || pickContrastText(t.btns.ink);

    t.btns.disabled = t.btns.disabled || '#94a3b8';
    const hintBase = t.btns.hint || t.btns.guide || t.headerRight;
    const hintRgb = toRgb(hintBase, { r: 207, g: 107, b: 23 });
    const hintLuminance = (0.2126 * hintRgb.r + 0.7152 * hintRgb.g + 0.0722 * hintRgb.b) / 255;
    t.btns.hintHover = t.btns.hintHover || darkenHex(hintBase, 0.88);
    t.btns.hintDivider = t.btns.hintDivider || (hintLuminance > 0.55 ? 'rgba(15,23,42,0.35)' : 'rgba(255,255,255,0.35)');

    t.loading.overlayBg = t.loading.overlayBg || (t.modal.bg || 'rgba(15, 23, 42, 0.6)');
    t.loading.panelBg = t.loading.panelBg || t.output.bg;
    t.loading.panelBorder = t.loading.panelBorder || t.modal.border;
    t.loading.title = t.loading.title || t.text.headerMain || '#ffffff';
    t.loading.status = t.loading.status || t.text.output;
    t.loading.percent = t.loading.percent || t.text.headerMain || '#ffffff';
    t.loading.track = t.loading.track || t.palette.toolBg || t.modal.panelBg;
    t.loading.bar = t.loading.bar || t.path || t.headerRight;
    t.loading.error = t.loading.error || t.text.output;

    t.search.overlayBg = t.search.overlayBg || t.modal.bg;
    t.search.megaStatusText = t.search.megaStatusText || t.text.megaOutput;
    t.search.label = t.search.label || t.text.output;
    t.search.dot = t.search.dot || t.path || t.headerRight;
    t.search.timer = t.search.timer || t.text.modal;
    t.search.close = t.search.close || t.text.modalMuted;
    t.search.closeHover = t.search.closeHover || t.text.modal;

    t.jumpscare.gooseBg = t.jumpscare.gooseBg || 'rgba(0,0,0,0.4)';
    t.jumpscare.gooseText = t.jumpscare.gooseText || '#ffffff';
    t.jumpscare.bombBg = t.jumpscare.bombBg || 'rgba(0,0,0,0.6)';
    t.jumpscare.bombTopText = t.jumpscare.bombTopText || t.burst || '#fde047';
    t.jumpscare.bombBottomText = t.jumpscare.bombBottomText || t.colors.goal || '#f97316';

    if (key !== 'chaos') {
        const shellBase = t.btns.modeToggle || t.btns.orient || t.headerRight || t.modal.accent || '#334155';
        t.shell.btnBg      = t.shell.btnBg      || shellBase;
        t.shell.btnBgHover = t.shell.btnBgHover || darkenHex(t.shell.btnBg, 0.9);
        t.shell.muteBg     = t.shell.muteBg     || t.btns.mute || t.btns.orient || shellBase;
        t.shell.muteBgHover = t.shell.muteBgHover || darkenHex(t.shell.muteBg, 0.9);
    }
    t.shell.btnBgHover  = t.shell.btnBgHover  || darkenHex(t.shell.btnBg,  0.92);
    t.shell.btnText     = keepOrImproveContrast(t.shell.btnBg, t.shell.btnText);
    t.shell.btnBorder   = t.shell.btnBorder   || t.modal.border;
    t.shell.muteBgHover = t.shell.muteBgHover || darkenHex(t.shell.muteBg, 0.92);
    t.alert.text = pickContrastText(t.alert.bg, '#ffffff', '#0f172a');
    t.shell.muteText = keepOrImproveContrast(t.shell.muteBg, t.shell.muteText || t.btns.muteIcon);
    t.shell.muteBorder = t.shell.muteBorder || t.modal.border;

    t.header.navBg = t.header.navBg || 'rgba(255,255,255,0.2)';
    t.header.navBgHover = t.header.navBgHover || 'rgba(255,255,255,0.3)';
    t.header.navText = t.header.navText || t.text.headerMain;
    t.header.divider = t.header.divider || 'rgba(226,232,240,0.2)';

    t.editor.inputBg = t.editor.inputBg || 'rgba(0,0,0,0.15)';
    t.editor.inputText = t.editor.inputText || '#ffffff';
    t.editor.inputBorder = t.editor.inputBorder || 'rgba(255,255,255,0.3)';
    t.editor.inputFocus = t.editor.inputFocus || '#ffffff';
    t.editor.toolIcon = t.editor.toolIcon || t.btns.muteIcon;
    t.editor.paletteShadow = t.editor.paletteShadow || '0 0 0 2px rgba(59,130,246,0.3)';

    t.layout.border = t.layout.border || t.modal.border;
    t.layout.divider = t.layout.divider || t.modal.border;

    t.modal.closeHover = t.modal.closeHover || 'rgba(0,0,0,0.05)';
    t.colors.portalPending = t.colors.portalPending || '#999999';
    t.colors.bombBlastRing = t.colors.bombBlastRing || t.colors.goal;
    t.colors.bombBlastRays = t.colors.bombBlastRays || t.headerLeft;

    // Board ink tokens (Drafting Table grammar): red-pencil corrections,
    // recessive inactive gates, and hazard illustrations drawn in theme ink.
    t.colors.hint          = t.colors.hint          || t.colors.goal;
    t.colors.prohibit      = t.colors.prohibit      || t.colors.hint;
    t.colors.inactive      = t.colors.inactive      || t.grid;
    t.colors.hazardInk     = t.colors.hazardInk
        || (contrastRatio(t.canvasBg, t.colors.filter) >= 4
            ? t.colors.filter
            : pickContrastText(t.canvasBg, '#f8fafc', '#0f172a'));
    t.colors.hazardSurface = t.colors.hazardSurface || t.canvasBg;
    t.colors.hazardAccent  = t.colors.hazardAccent  || t.colors.goal;
    t.colors.scorch        = t.colors.scorch        || t.colors.hazardInk;

    t.mega.outputBg = t.mega.outputBg || t.output.bg;
    t.mega.outputBorder = t.mega.outputBorder || t.modal.border;
    t.mega.primaryBg = t.mega.primaryBg || t.btns.mega || t.headerRight;
    t.mega.primaryBorder = t.mega.primaryBorder || t.modal.border;
    t.mega.secondaryBg = t.mega.secondaryBg || darkenHex(t.mega.primaryBg, 0.88);
    t.mega.secondaryBorder = t.mega.secondaryBorder || t.modal.border;
    t.mega.copyBg = t.mega.copyBg || t.btns.copy || t.modal.panelBg;
    t.mega.copyBorder = t.mega.copyBorder || t.modal.border;
    t.search.megaStatusBorder = t.search.megaStatusBorder || t.mega.outputBorder;

    if (['candy_apple', 'hello_kitty', 'roygbiv', 'vegas', 'sherbet'].includes(key)) {
        const vibrantModeToggle = {
            candy_apple: { bg: '#ff0800', text: '#ffffff' },
            hello_kitty: { bg: '#ff1493', text: '#3b0a26' },
            roygbiv:     { bg: '#ff7a00', text: '#0f172a' },
            vegas:       { bg: '#ff00cc', text: '#0f172a' },
            sherbet:     { bg: '#ff8a3d', text: '#0f172a' },
        };
        const mode = vibrantModeToggle[key];
        t.btns.modeToggle = mode.bg;
        t.text.actionBtn = mode.text;
    }

    t.burst = t.burst || t.palette.itemBg;
    t.check = t.check || t.colors.filter;
    t.leave = getLeaveThemeColors(t, key === 'classic');
    return t;
}

export function buildChaosTheme() {
    return normalizeTheme({
        bodyBg: rc(), canvasBg: rc(), grid: rc(), headerLeft: rc(), headerRight: rc(), path: rc(),
        controls: rc(), metricText: rc(),
        btns: { undo: rc(), reset: rc(), guide: rc(), whoa: rc(), hint: rc(), mega: rc(), mute: rc(), muteIcon: rc(), copy: rc(), gen: rc(), modeToggle: rc(), orient: rc(), solve: rc(), submit: rc(), approve: rc(), reject: rc(), editClear: rc(), editBombs: rc(), editNew: rc(), disabled: rc() },
        modal: { bg: rc(), panelBg: rc(), border: rc(), text: rc(), textMuted: rc(), accent: rc(), closeHover: rc() },
        output: { bg: rc(), text: rc() },
        colors: { gate: rc(), goal: rc(), block: rc(), pin: rc(), pinUnflipped: rc(), filter: rc(), portal: rc(), cross: rc(), portalPending: rc(), bombBlastRing: rc(), bombBlastRays: rc() },
        palette: { bg: rc(), border: rc(), itemBg: rc(), itemBorder: rc(), toolBg: rc() },
        headerLeftText: rc(), headerLeftLabel: rc(), ghostBg: rc(), ghostBorder: rc(),
        win: { bg: rc(), border: rc(), text: rc(), accent: rc() },
        alert: { bg: rc(), stroke: rc() },
        ctrlArea: { bg: rc(), border: rc() },
        text: { modal: rc(), modalMuted: rc(), modalAccent: rc(), output: rc(), metric: rc(), headerMain: rc(), headerSub: rc(), win: rc(), winAccent: rc(), megaDesc: rc(), megaOutput: rc(), megaPrimary: rc(), megaSecondary: rc(), megaCopy: rc(), body: rc(), actionBtn: rc(), utilityBtn: rc(), utilityBtnGen: rc(), error: rc(), handDrawnShadow: rc() },
        loading: { overlayBg: rc(), panelBg: rc(), panelBorder: rc(), title: rc(), status: rc(), percent: rc(), track: rc(), bar: rc(), error: rc() },
        search: { overlayBg: rc(), megaStatusText: rc(), megaStatusBorder: rc(), label: rc(), dot: rc(), timer: rc(), close: rc(), closeHover: rc() },
        jumpscare: { gooseBg: rc(), gooseText: rc(), bombBg: rc(), bombTopText: rc(), bombBottomText: rc() },
        shell: { btnBg: rc(), btnBgHover: rc(), btnText: rc(), btnBorder: rc(), muteBg: rc(), muteBgHover: rc(), muteText: rc(), muteBorder: rc() },
        header: { navBg: rc(), navBgHover: rc(), navText: rc(), divider: rc() },
        editor: { inputBg: rc(), inputText: rc(), inputBorder: rc(), inputFocus: rc(), toolIcon: rc(), paletteShadow: `0 0 0 2px ${rc()}66` },
        layout: { border: rc(), divider: rc() },
        mega: { outputBg: rc(), outputBorder: rc(), primaryBg: rc(), primaryBorder: rc(), secondaryBg: rc(), secondaryBorder: rc(), copyBg: rc(), copyBorder: rc() },
        burst: rc(), check: rc(), leave: { bg: rc(), hover: rc(), text: rc(), border: rc() },
    }, 'chaos');
}

// Computed once at module load — used by ensureThemeLeaveColors in theme-registry.js.
export const REQUIRED_THEME_PATHS = collectThemePaths(normalizeTheme({}, '__schema__'));
