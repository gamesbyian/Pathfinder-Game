// ============================================================
// theme-engine.js  –  color utilities + algorithmic derivation
// ============================================================

// ---- low-level HSL utilities ----

function hexToHsl(hex) {
    hex = hex.replace('#', '').slice(0, 6);
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l: l * 100 };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return { h: h * 60, s: s * 100, l: l * 100 };
}

function hslToHex({ h, s, l }) {
    const hh = ((h % 360) + 360) % 360;
    const ss = Math.max(0, Math.min(100, s)) / 100;
    const ll = Math.max(0, Math.min(100, l)) / 100;
    const c = (1 - Math.abs(2 * ll - 1)) * ss;
    const x = c * (1 - Math.abs((hh / 60) % 2 - 1));
    const m = ll - c / 2;
    let r, g, b;
    if (hh < 60)        { r = c; g = x; b = 0; }
    else if (hh < 120)  { r = x; g = c; b = 0; }
    else if (hh < 180)  { r = 0; g = c; b = x; }
    else if (hh < 240)  { r = 0; g = x; b = c; }
    else if (hh < 300)  { r = x; g = 0; b = c; }
    else                { r = c; g = 0; b = x; }
    const toHex = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ---- exported color utilities ----

export function lighten(hex, amount) {
    const hsl = hexToHsl(hex);
    return hslToHex({ ...hsl, l: Math.min(97, hsl.l + amount * 100) });
}

export function darken(hex, amount) {
    const hsl = hexToHsl(hex);
    return hslToHex({ ...hsl, l: Math.max(3, hsl.l - amount * 100) });
}

export function saturate(hex, amount) {
    const hsl = hexToHsl(hex);
    return hslToHex({ ...hsl, s: Math.min(100, hsl.s + amount * 100) });
}

export function desaturate(hex, amount) {
    const hsl = hexToHsl(hex);
    return hslToHex({ ...hsl, s: Math.max(0, hsl.s - amount * 100) });
}

export function shiftHue(hex, degrees) {
    const hsl = hexToHsl(hex);
    return hslToHex({ ...hsl, h: hsl.h + degrees });
}

export function mix(a, b, t) {
    if (!a || !b || a.startsWith('rgba') || b.startsWith('rgba')) return a || b;
    const pa = a.replace('#', '').slice(0, 6), pb = b.replace('#', '').slice(0, 6);
    const r = Math.round(parseInt(pa.slice(0,2),16)*(1-t) + parseInt(pb.slice(0,2),16)*t);
    const g = Math.round(parseInt(pa.slice(2,4),16)*(1-t) + parseInt(pb.slice(2,4),16)*t);
    const bv = Math.round(parseInt(pa.slice(4,6),16)*(1-t) + parseInt(pb.slice(4,6),16)*t);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bv.toString(16).padStart(2,'0')}`;
}

export function withAlpha(hex, alpha) {
    const h = hex.replace('#', '').slice(0, 6);
    const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
    return `rgba(${r},${g},${b},${alpha})`;
}

export function luminance(hex) {
    const h = hex.replace('#', '').slice(0, 6);
    const toLin = v => { const n = v / 255; return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4); };
    return 0.2126 * toLin(parseInt(h.slice(0,2),16)) + 0.7152 * toLin(parseInt(h.slice(2,4),16)) + 0.0722 * toLin(parseInt(h.slice(4,6),16));
}

export function contrastRatio(a, b) {
    if (!a || !b || a.startsWith('rgba') || b.startsWith('rgba')) return 1;
    const la = luminance(a), lb = luminance(b);
    const [hi, lo] = la > lb ? [la, lb] : [lb, la];
    return (hi + 0.05) / (lo + 0.05);
}

export function isLight(hex) {
    if (!hex || hex.startsWith('rgba')) return true;
    return luminance(hex) > 0.35;
}

export function readableOn(bg, light = '#ffffff', dark = '#0f172a') {
    if (!bg || bg.startsWith('rgba')) return light;
    return contrastRatio(bg, dark) > contrastRatio(bg, light) ? dark : light;
}

// ---- seed theme helpers ----

export function isSeedTheme(theme) {
    return theme != null && typeof theme === 'object' && theme.seeds != null && typeof theme.seeds === 'object';
}

export function randomSeeds() {
    const rc = () => `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
    return { bg: rc(), surface: rc(), primary: rc(), secondary: rc(), neutral: rc(), text: rc(), border: rc(), path: rc() };
}

// ---- semantic button colors ----
// Guide, hint, saved/editNew use fixed semantic hues so users learn them across all themes.
// Lightness adapts to the theme's dark/light mode.

function semanticColor(hue, saturation, bgLight) {
    return hslToHex({ h: hue, s: saturation, l: bgLight ? 42 : 56 });
}

// ---- main derivation ----

export function deriveTokens(seeds) {
    const bg       = seeds.bg       || '#e0f2fe';
    const surface  = seeds.surface  || '#ffffff';
    const primary  = seeds.primary  || '#2563eb';
    const secondary = seeds.secondary || '#dc2626';
    const neutral  = (seeds.neutral || seeds.grid || '#94a3b8').slice(0, 7); // strip alpha channel if present
    const text     = seeds.text     || '#334155';
    const border   = seeds.border   || '#cbd5e1';
    const path     = seeds.path !== undefined ? seeds.path : primary;

    const bgLight      = isLight(bg);
    const surfaceLight = isLight(surface);
    const onPrimary    = readableOn(primary);
    const onSecondary  = readableOn(secondary);

    // primary family
    const primaryD  = darken(primary, 0.15);
    const primaryDD = darken(primary, 0.30);
    const primaryL  = lighten(primary, 0.22);

    // semantic action button colors (fixed hues, adaptive lightness)
    const guideColor   = semanticColor(268, 68, bgLight);  // violet
    const hintColor    = semanticColor(26,  78, bgLight);  // amber
    const successColor = semanticColor(153, 65, bgLight);  // emerald

    // portal: shift primary towards magenta-violet (h=300) by 60%
    const portalColor = (() => {
        const hsl = hexToHsl(primary);
        const diff = ((300 - hsl.h + 540) % 360) - 180;
        return hslToHex({ h: hsl.h + diff * 0.60, s: Math.max(55, hsl.s), l: Math.max(38, Math.min(62, hsl.l)) });
    })();

    // mode/orient buttons – always very dark; on dark themes use a dark tint of bg
    const actionDarkBg = bgLight ? darken(primary, 0.42) : lighten(bg, 0.12);

    // utility buttons (mute, copy, gen) – guard against near-black on fully-dark themes
    const utilBtnBgRaw = bgLight ? mix(surface, border, 0.6) : mix(surface, bg, 0.35);
    const utilBtnBg = hexToHsl(utilBtnBgRaw).l < 10 ? lighten(bg, 0.15) : utilBtnBgRaw;

    // output panel (code / solution display)
    // dark themes: slightly lighten bg rather than mixing two near-identical darks
    const outputBg = bgLight ? '#0f172a' : (luminance(bg) > 0.15 ? darken(bg, 0.25) : lighten(bg, 0.10));
    const outputTextRaw = bgLight ? lighten(primary, 0.28) : lighten(primary, 0.38);
    const outputText = contrastRatio(outputBg, outputTextRaw) >= 3.5
        ? outputTextRaw
        : (contrastRatio(outputBg, lighten(primary, 0.50)) >= 3.5 ? lighten(primary, 0.50) : '#dce4f0');

    // modal / overlay
    const controlsBg  = surfaceLight ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.35)';
    const closeHoverBg = surfaceLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
    const modalBg     = withAlpha(bgLight ? surface : bg, bgLight ? 0.97 : 0.95);

    // text variants
    const textMuted  = bgLight ? desaturate(lighten(text, 0.18), 0.1) : desaturate(darken(text, 0.12), 0.1);
    const textAccent = bgLight ? darken(text, 0.20) : lighten(text, 0.15);

    // palette / editor area
    const paletteBg    = bgLight ? mix(bg, surface, 0.4) : mix(bg, neutral, 0.15);
    const paletteToolBg = bgLight ? mix(bg, border, 0.5) : mix(bg, neutral, 0.25);

    // divider slightly distinct from border
    const dividerColor = bgLight ? lighten(border, 0.04) : darken(border, 0.04);

    // header sub-label opacity
    const headerSubLabel = onSecondary === '#ffffff' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';

    // win text: prefer neutral but fall back to something that actually contrasts with the surface
    const winText = contrastRatio(surface, neutral) >= 3.0
        ? neutral
        : (contrastRatio(surface, textMuted) >= 3.0 ? textMuted : text);

    // alert bg: fall back to secondary when primary is too dark to distinguish
    const alertBg     = hexToHsl(primary).l < 20 ? secondary : primaryD;
    const alertStroke = isLight(alertBg) ? darken(alertBg, 0.2) : lighten(alertBg, 0.3);

    return {
        bodyBg: bg,
        canvasBg: surface,
        grid: neutral,
        headerLeft: secondary,
        headerRight: primary,
        path,
        controls: controlsBg,
        metricText: onPrimary,
        headerLeftText: onSecondary,
        headerLeftLabel: headerSubLabel,
        ghostBg: surface,
        ghostBorder: primary,
        burst: surface,
        check: textAccent,

        btns: {
            undo: neutral,
            reset: secondary,
            guide: guideColor,
            whoa: primary,
            hint: hintColor,
            saved: successColor,
            mega: guideColor,
            mute: utilBtnBg,
            muteIcon: neutral,
            copy: utilBtnBg,
            gen: utilBtnBg,
            modeToggle: actionDarkBg,
            orient: actionDarkBg,
            solve: guideColor,
            editClear: secondary,
            editBombs: lighten(secondary, 0.07),
            editNew: successColor,
        },

        modal: {
            bg: modalBg,
            panelBg: surface,
            border,
            text,
            textMuted,
            accent: textAccent,
            closeHover: closeHoverBg,
        },

        output: { bg: outputBg, text: outputText },

        colors: {
            gate: primary,
            goal: secondary,
            block: border,
            pin: secondary,
            pinUnflipped: text,
            filter: text,
            portal: portalColor,
            cross: text,
            portalPending: '#999999',
            bombBlastRing: secondary,
            bombBlastRays: '#f97316',
        },

        palette: {
            bg: paletteBg,
            border,
            itemBg: surface,
            itemBorder: border,
            toolBg: paletteToolBg,
        },

        win: {
            bg: surface,
            border: primary,
            text: winText,
            accent: bgLight ? primaryDD : primaryL,
        },

        alert: {
            bg: alertBg,
            stroke: alertStroke,
        },

        ctrlArea: {
            bg: paletteBg,
            border,
        },

        layout: {
            border,
            divider: dividerColor,
        },

        themeEditor: {
            panelBg: surfaceLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
            swatchBorder: border,
        },
    };
}
