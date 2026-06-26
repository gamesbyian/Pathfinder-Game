// Pure theme normalization helpers — no APP references, no DOM access.

import { isSeedTheme, deriveTokens } from '../theme-engine.js';

interface Rgb { r: number; g: number; b: number; }

export function rc(): string { return `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`; }

export function isValidHexColor(value: any): boolean {
    return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export const CLASSIC_LEAVE = Object.freeze({ bg: '#dc2626', hover: '#b91c1c', text: '#ffffff', border: '#b91c1c' });

export function toRgb(hex: string | undefined, fallback: Rgb = { r: 220, g: 38, b: 38 }): Rgb {
    const normalized = (hex || '').replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return fallback;
    return {
        r: parseInt(normalized.slice(0, 2), 16),
        g: parseInt(normalized.slice(2, 4), 16),
        b: parseInt(normalized.slice(4, 6), 16),
    };
}

export function darkenHex(hex: string | undefined, factor = 0.85): string {
    const { r, g, b } = toRgb(hex);
    return `#${Math.max(0, Math.floor(r * factor)).toString(16).padStart(2, '0')}${Math.max(0, Math.floor(g * factor)).toString(16).padStart(2, '0')}${Math.max(0, Math.floor(b * factor)).toString(16).padStart(2, '0')}`;
}

export function lightenHex(hex: string | undefined, factor = 0.3): string {
    const { r, g, b } = toRgb(hex);
    const blend = (channel: number) => Math.min(255, Math.floor(channel + (255 - channel) * factor));
    return `#${blend(r).toString(16).padStart(2, '0')}${blend(g).toString(16).padStart(2, '0')}${blend(b).toString(16).padStart(2, '0')}`;
}

export function collectThemePaths(obj: any, prefix = '', out: Set<string> = new Set()): Set<string> {
    if (!obj || typeof obj !== 'object') return out;
    Object.keys(obj).forEach((key: string) => {
        const path = prefix ? `${prefix}.${key}` : key;
        out.add(path);
        const value = obj[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) collectThemePaths(value, path, out);
    });
    return out;
}

export function getLeaveThemeColors(theme: any, isClassic = false): { bg: string, hover: string, text: string, border: string } {
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

export function normalizeTheme(theme: any, key = 'theme'): any {
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

    const btnFallbacks: Record<string, any> = {
        undo: t.grid, reset: t.headerLeft, guide: t.headerRight, whoa: t.headerRight,
        hint: t.headerRight, mute: t.canvasBg, muteIcon: t.headerRight,
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

    const pickContrastText = (bg: string | undefined, light = '#f8fafc', dark = '#0f172a'): string => {
        const rgb = toRgb(bg, { r: 30, g: 41, b: 59 });
        const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
        return luminance > 0.55 ? dark : light;
    };
    const contrastRatio = (a: string | undefined, b: string | undefined): number => {
        const toLum = (c: string | undefined) => {
            const rgb = toRgb(c, { r: 30, g: 41, b: 59 });
            const chan = [rgb.r, rgb.g, rgb.b].map((v: number) => {
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
    const keepOrImproveContrast = (bg: string | undefined, current: string | undefined, min = 3.2): string => {
        const existing = current || pickContrastText(bg);
        return contrastRatio(bg, existing) >= min ? existing : pickContrastText(bg);
    };
    const pickThemeNameColor = (bg: string | undefined, candidates: (string | undefined)[], fallback: string): string => {
        const valid = candidates.filter(Boolean) as string[];
        if (!valid.length) return fallback;
        return valid.reduce((best, candidate) => (
            contrastRatio(bg, candidate) > contrastRatio(bg, best) ? candidate : best
        ));
    };

    // Contrast floor for panel text tiers. The body/muted fallbacks (headerRight / grid)
    // can land too close to the panel background on low-saturation themes. keepOrImproveContrast
    // leaves already-legible values (e.g. classic) untouched and only nudges the failing ones,
    // so this can't regress well-tuned themes while raising the floor on the weak ones.
    t.modal.text = keepOrImproveContrast(t.modal.panelBg, t.modal.text, 4.0);
    t.modal.textMuted = keepOrImproveContrast(t.modal.panelBg, t.modal.textMuted, 3.0);

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
    t.text.error = t.text.error || t.text.output || '#ef4444';
    t.text.handDrawnShadow = t.text.handDrawnShadow || '#000000';

    const normalizeColorKey = (color: any): string => typeof color === 'string' ? color.trim().toLowerCase() : '';
    const colorMatchesAny = (color: any, avoid: any[] = []): boolean => avoid.some((candidate: any) => normalizeColorKey(candidate) === normalizeColorKey(color));
    const pickDistinctButtonColor = (base: string, avoid: any[] = []): string => {
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
    t.btns.heatmap = pickDistinctButtonColor(t.headerRight, [guideColor, hintColor, cautionColor, utilityActionColor]);

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
    t.loading.warning = t.loading.warning || t.btns.editClear;
    t.loading.success = t.loading.success || t.btns.approve;
    t.loading.btnBg = t.loading.btnBg || lightenHex(t.loading.panelBg, 0.28);
    t.loading.btnBgHover = t.loading.btnBgHover || lightenHex(t.loading.panelBg, 0.42);
    t.loading.btnText = t.loading.btnText || pickContrastText(t.loading.btnBg, '#ffffff', '#0f172a');

    t.search.overlayBg = t.search.overlayBg || t.modal.bg;
    t.search.label = t.search.label || t.text.output;
    t.search.dot = t.search.dot || t.path || t.headerRight;
    t.search.timer = t.search.timer || t.text.modal;
    t.search.close = t.search.close || t.text.modalMuted;
    t.search.closeHover = t.search.closeHover || t.text.modal;

    t.jumpscare.gooseBg = t.jumpscare.gooseBg || 'rgba(0,0,0,0.4)';
    t.jumpscare.gooseText = t.jumpscare.gooseText || t.btns.hint || t.colors.goal || '#ffffff';
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
    t.alert.textError = t.alert.textError || pickContrastText(t.alert.bg, '#fecaca', '#7f1d1d');
    t.alert.textWarning = t.alert.textWarning || pickContrastText(t.alert.bg, '#fde68a', '#78350f');
    t.alert.textSuccess = t.alert.textSuccess || pickContrastText(t.alert.bg, '#bbf7d0', '#14532d');
    t.alert.textMuted = t.alert.textMuted || pickContrastText(t.alert.bg, '#e2e8f0', '#1e293b');
    t.shell.muteText = keepOrImproveContrast(t.shell.muteBg, t.shell.muteText || t.btns.muteIcon);
    t.shell.muteBorder = t.shell.muteBorder || t.modal.border;

    t.header.navBg = t.header.navBg || 'rgba(255,255,255,0.2)';
    t.header.navBgHover = t.header.navBgHover || 'rgba(255,255,255,0.3)';
    t.header.navText = t.header.navText || t.text.headerMain;
    t.header.divider = t.header.divider || 'rgba(226,232,240,0.2)';

    t.editor.inputBg = t.editor.inputBg || t.palette.toolBg || t.modal.panelBg;
    t.editor.inputText = t.editor.inputText || t.modal.text;
    t.editor.inputBorder = t.editor.inputBorder || t.modal.border;
    t.editor.inputFocus = t.editor.inputFocus || t.modal.accent || t.headerRight;
    t.editor.toolIcon = t.editor.toolIcon || t.btns.muteIcon;
    t.editor.paletteShadow = t.editor.paletteShadow || (() => {
        const { r, g, b } = toRgb(t.headerRight);
        return `0 0 0 2px rgba(${r},${g},${b},0.35)`;
    })();

    t.layout.border = t.layout.border || t.modal.border;
    t.layout.divider = t.layout.divider || t.modal.border;

    t.modal.closeHover = t.modal.closeHover || 'rgba(0,0,0,0.05)';
    t.colors.portalPending = t.colors.portalPending || '#999999';
    t.colors.bombBlastRing = t.colors.bombBlastRing || t.colors.goal;
    t.colors.bombBlastRays = t.colors.bombBlastRays || t.headerLeft;

    if (['candy_apple', 'hello_kitty', 'roygbiv', 'vegas', 'sherbet'].includes(key)) {
        const vibrantModeToggle: Record<string, { bg: string, text: string }> = {
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

    // Hint/caution path colours (consumed directly by the canvas renderer, not via CSS vars).
    // Default to the historic amber line + black dashed outline; a theme can override either
    // (e.g. a dark/neon theme that wants a brighter caution stroke) without touching the renderer.
    t.caution = t.caution || {};
    t.caution.path = t.caution.path || '#fbbf24';
    t.caution.outline = t.caution.outline || '#000000';

    t.burst = t.burst || t.palette.itemBg;
    t.check = t.check || t.colors.filter;
    t.leave = getLeaveThemeColors(t, key === 'classic');
    return t;
}

export function buildChaosTheme() {
    return normalizeTheme({
        bodyBg: rc(), canvasBg: rc(), grid: rc(), headerLeft: rc(), headerRight: rc(), path: rc(),
        controls: rc(), metricText: rc(),
        btns: { undo: rc(), reset: rc(), guide: rc(), whoa: rc(), hint: rc(), mute: rc(), muteIcon: rc(), copy: rc(), gen: rc(), modeToggle: rc(), orient: rc(), solve: rc(), submit: rc(), approve: rc(), reject: rc(), editClear: rc(), editBombs: rc(), editNew: rc(), disabled: rc() },
        modal: { bg: rc(), panelBg: rc(), border: rc(), text: rc(), textMuted: rc(), accent: rc(), closeHover: rc() },
        output: { bg: rc(), text: rc() },
        colors: { gate: rc(), goal: rc(), block: rc(), pin: rc(), pinUnflipped: rc(), filter: rc(), portal: rc(), cross: rc(), portalPending: rc(), bombBlastRing: rc(), bombBlastRays: rc() },
        palette: { bg: rc(), border: rc(), itemBg: rc(), itemBorder: rc(), toolBg: rc() },
        headerLeftText: rc(), headerLeftLabel: rc(), ghostBg: rc(), ghostBorder: rc(),
        win: { bg: rc(), border: rc(), text: rc(), accent: rc() },
        alert: { bg: rc(), stroke: rc(), textError: rc(), textWarning: rc(), textSuccess: rc(), textMuted: rc() },
        ctrlArea: { bg: rc(), border: rc() },
        text: { modal: rc(), modalMuted: rc(), modalAccent: rc(), output: rc(), metric: rc(), headerMain: rc(), headerSub: rc(), win: rc(), winAccent: rc(), body: rc(), actionBtn: rc(), utilityBtn: rc(), utilityBtnGen: rc(), error: rc(), handDrawnShadow: rc() },
        loading: { overlayBg: rc(), panelBg: rc(), panelBorder: rc(), title: rc(), status: rc(), percent: rc(), track: rc(), bar: rc(), error: rc(), warning: rc(), success: rc(), btnBg: rc(), btnBgHover: rc(), btnText: rc() },
        search: { overlayBg: rc(), label: rc(), dot: rc(), timer: rc(), close: rc(), closeHover: rc() },
        jumpscare: { gooseBg: rc(), gooseText: rc(), bombBg: rc(), bombTopText: rc(), bombBottomText: rc() },
        shell: { btnBg: rc(), btnBgHover: rc(), btnText: rc(), btnBorder: rc(), muteBg: rc(), muteBgHover: rc(), muteText: rc(), muteBorder: rc() },
        header: { navBg: rc(), navBgHover: rc(), navText: rc(), divider: rc() },
        editor: { inputBg: rc(), inputText: rc(), inputBorder: rc(), inputFocus: rc(), toolIcon: rc(), paletteShadow: `0 0 0 2px ${rc()}66` },
        layout: { border: rc(), divider: rc() },
        caution: { path: rc(), outline: rc() },
        burst: rc(), check: rc(), leave: { bg: rc(), hover: rc(), text: rc(), border: rc() },
    }, 'chaos');
}

// Computed once at module load — used by ensureThemeLeaveColors in theme-registry.js.
export const REQUIRED_THEME_PATHS = collectThemePaths(normalizeTheme({}, '__schema__'));
