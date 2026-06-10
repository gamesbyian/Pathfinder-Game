import { deriveTokens, isSeedTheme, randomSeeds } from './theme-engine.js';

export function installThemes(APP) {
    APP.Themes = (() => {

    const themeAiColors = {};
    const themeUndoStacks = {};
    let originalThemes = null;
function rc() { return `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`; }

    const THEMES = {};

    function isValidHexColor(value) {
        return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim());
    }

    function parseGeminiSuggestionsText(text) {
        const parseCandidates = [];
        if (typeof text === 'string' && text.trim()) {
            parseCandidates.push(text);
            const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
            if (fencedMatch?.[1]) parseCandidates.push(fencedMatch[1]);
        }

        let parsed = null;
        let parseError = null;
        for (const candidateText of parseCandidates) {
            try {
                parsed = JSON.parse(candidateText);
                parseError = null;
                break;
            } catch (err) {
                parseError = err;
            }
        }
        if (!parsed) return { colors: null, error: parseError ? `Invalid JSON response: ${parseError.message}` : 'No JSON response text returned.' };

        if (!Array.isArray(parsed.suggestions)) return { colors: null, error: 'Invalid schema: suggestions must be an array.' };
        const normalized = [];
        for (const raw of parsed.suggestions) {
            const color = typeof raw === 'string' ? raw.trim() : '';
            if (isValidHexColor(color)) normalized.push(color.toUpperCase());
        }
        const unique = Array.from(new Set(normalized));
        if (unique.length < 6) return { colors: null, error: 'Invalid schema: need 6 valid #RRGGBB colors.' };
        return { colors: unique.slice(0, 6), error: null };
    }

    async function fetchGeminiThemeColors(themeName, themeObj) {
        const systemPrompt = "You are a professional UI/UX color palette specialist. Your goal is to analyze the provided Pathfinder game theme and suggest exactly 6 new hex colors that expand the existing palette while maintaining visual consistency and accessibility.";
        const userPrompt = `Theme Name: ${themeName}
Current Colors: ${JSON.stringify(themeObj)}

Suggest 6 complementary hex colors in #RRGGBB format.`;
        const prompt = `${systemPrompt}\n\n${userPrompt}`;
        const payload = {
            prompt,
            model: 'gemini-2.5-flash',
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        suggestions: {
                            type: "ARRAY",
                            items: { type: "STRING", pattern: "^#[0-9A-Fa-f]{6}$" },
                            minItems: 6,
                            maxItems: 6
                        }
                    },
                    required: ["suggestions"]
                }
            }
        };

        const delays = [1000, 2000, 4000, 8000, 16000];
        let lastError = null;
        for (let i = 0; i < 6; i++) {
            try {
                const res = await fetch('./api/gemini_color_suggest.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const body = await res.json().catch(() => ({}));

                if (res.status === 429) {
                    lastError = `Rate limited (${res.status}).`;
                    throw new Error('Rate Limit');
                }
                if (!res.ok) {
                    const apiMessage = body?.error || `HTTP ${res.status}`;
                    return { colors: null, error: `Suggestion API error: ${apiMessage}` };
                }
                if (!body?.ok) return { colors: null, error: body?.error || 'Unable to generate suggestions.' };

                const parsed = parseGeminiSuggestionsText(body?.text);
                if (parsed.colors) return { colors: parsed.colors, error: null };
                lastError = parsed.error;
            } catch (err) {
                if (err.message !== 'Rate Limit') lastError = err?.message || 'Unknown request failure.';
            }
            if (i < delays.length) await new Promise(r => setTimeout(r, delays[i]));
        }
        return { colors: null, error: lastError || 'Unable to generate suggestions.' };
    }

    const getCurrentTheme = () => APP.State.ENGINE.runtime.currentTheme;
    const getTheme = (id) => getThemeRegistry()[id];

    const CLASSIC_LEAVE = { bg: '#dc2626', hover: '#b91c1c', text: '#ffffff', border: '#b91c1c' };

    function toRgb(hex, fallback = { r: 220, g: 38, b: 38 }) {
        const normalized = (hex || '').replace('#', '');
        if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return fallback;
        return { r: parseInt(normalized.slice(0, 2), 16), g: parseInt(normalized.slice(2, 4), 16), b: parseInt(normalized.slice(4, 6), 16) };
    }

    function darkenHex(hex, factor = 0.85) {
        const { r, g, b } = toRgb(hex);
        return `#${Math.max(0, Math.floor(r * factor)).toString(16).padStart(2, '0')}${Math.max(0, Math.floor(g * factor)).toString(16).padStart(2, '0')}${Math.max(0, Math.floor(b * factor)).toString(16).padStart(2, '0')}`;
    }

    function collectThemePaths(obj, prefix = '', out = new Set()) {
        if (!obj || typeof obj !== 'object') return out;
        Object.keys(obj).forEach((key) => {
            const path = prefix ? `${prefix}.${key}` : key;
            out.add(path);
            const value = obj[key];
            if (value && typeof value === 'object' && !Array.isArray(value)) collectThemePaths(value, path, out);
        });
        return out;
    }

    function getLeaveThemeColors(theme, isClassic = false) {
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

    function normalizeTheme(theme, key = 'theme') {
        // Expand seed-format themes into full base objects first
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
        t.themeEditor = t.themeEditor || {};

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

        const btnFallbacks = { undo: t.grid, reset: t.headerLeft, guide: t.headerRight, whoa: t.headerRight, hint: t.headerRight, mega: t.headerRight, mute: t.canvasBg, muteIcon: t.headerRight, copy: t.canvasBg, gen: t.canvasBg, modeToggle: t.headerRight, orient: t.headerRight, solve: t.headerRight, editClear: t.headerLeft, editBombs: t.colors.goal || t.headerLeft, editNew: t.headerRight };
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
        t.text.megaGemini = t.text.megaGemini || '#ffffff';
        t.text.megaCopy = t.text.megaCopy || t.modal.text;
        t.text.body = t.text.body || t.modal.text;
        t.text.themeName = pickThemeNameColor(
            t.modal.panelBg || t.canvasBg || '#ffffff',
            [
                t.text.modalAccent,
                t.modal.accent,
                t.text.modal,
                t.modal.text,
                t.text.modalMuted,
                t.modal.textMuted,
                t.text.body,
                t.headerLeftText,
                '#000000',
                '#ffffff'
            ],
            pickContrastText(t.modal.panelBg || t.canvasBg || '#ffffff', '#ffffff', '#000000')
        );
        t.text.shellBtn = t.text.shellBtn || ((t.bodyBg === '#020617' || t.bodyBg === '#000000') ? '#f8fafc' : '#475569');
        t.text.actionBtn = t.text.actionBtn || ((t.bodyBg === "#020617" || t.bodyBg === "#000000") ? "#f8fafc" : "#ffffff");
        t.text.utilityBtn = keepOrImproveContrast(t.btns.copy || '#334155', t.btns.muteIcon);
        t.text.utilityBtnGen = keepOrImproveContrast(t.btns.gen || '#334155', t.btns.muteIcon);
        t.text.error = t.text.error || t.loading.error || "#ef4444";
        t.text.handDrawnShadow = t.text.handDrawnShadow || "#000000";

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
        t.search.megaStatusBorder = t.search.megaStatusBorder || t.mega.outputBorder;
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
            t.shell.btnBg = shellBase;
            t.shell.btnBgHover = darkenHex(t.shell.btnBg, 0.9);
            t.shell.muteBg = t.btns.mute || t.btns.orient || shellBase;
            t.shell.muteBgHover = darkenHex(t.shell.muteBg, 0.9);
        }
        t.shell.btnBg = t.shell.btnBg || t.btns.orient || t.btns.modeToggle || t.btns.mute;
        t.shell.btnBgHover = t.shell.btnBgHover || darkenHex(t.shell.btnBg, 0.92);
        t.shell.btnText = keepOrImproveContrast(t.shell.btnBg, t.shell.btnText);
        t.shell.btnBorder = t.shell.btnBorder || t.modal.border;
        t.shell.muteBg = t.shell.muteBg || t.btns.orient || t.btns.modeToggle || t.btns.mute;
        t.shell.muteBgHover = t.shell.muteBgHover || darkenHex(t.shell.muteBg, 0.92);
        t.text.shellBtn = pickContrastText(t.btns.orient || t.btns.modeToggle || t.headerRight || '#1e293b');
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

        t.themeEditor.panelBg = t.themeEditor.panelBg || 'rgba(0,0,0,0.05)';
        t.themeEditor.swatchBorder = t.themeEditor.swatchBorder || t.modal.border;

        t.modal.closeHover = t.modal.closeHover || 'rgba(0,0,0,0.05)';
        t.colors.portalPending = t.colors.portalPending || '#999999';
        t.colors.bombBlastRing = t.colors.bombBlastRing || t.colors.goal;
        t.colors.bombBlastRays = t.colors.bombBlastRays || t.headerLeft;

        t.mega.outputBg = t.mega.outputBg || t.output.bg;
        t.mega.outputBorder = t.mega.outputBorder || t.modal.border;
        t.mega.primaryBg = t.mega.primaryBg || t.btns.mega || t.headerRight;
        t.mega.primaryBorder = t.mega.primaryBorder || t.modal.border;
        t.mega.secondaryBg = t.mega.secondaryBg || darkenHex(t.mega.primaryBg, 0.88);
        t.mega.secondaryBorder = t.mega.secondaryBorder || t.modal.border;
        t.mega.geminiBg = t.mega.geminiBg || t.btns.guide || t.headerRight;
        t.mega.geminiBorder = t.mega.geminiBorder || t.modal.border;
        t.mega.copyBg = t.mega.copyBg || t.btns.copy || t.modal.panelBg;
        t.mega.copyBorder = t.mega.copyBorder || t.modal.border;

        if (['candy_apple','hello_kitty','roygbiv','vegas','sherbet'].includes(key)) {
            const vibrantModeToggle = {
                candy_apple: { bg: '#ff0800', text: '#ffffff' },
                hello_kitty: { bg: '#ff1493', text: '#3b0a26' },
                roygbiv: { bg: '#ff7a00', text: '#0f172a' },
                vegas: { bg: '#ff00cc', text: '#0f172a' },
                sherbet: { bg: '#ff8a3d', text: '#0f172a' }
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

    const getThemeRegistry = () => {
        if (APP.Data && APP.Data.isLoaded()) return APP.Data.getThemes();
        if (window.THEMES && typeof window.THEMES === 'object') return window.THEMES;
        return THEMES;
    };

    const REQUIRED_THEME_PATHS = collectThemePaths(normalizeTheme({}, '__schema__'));

    function ensureThemeLeaveColors() {
        const themes = getThemeRegistry();
        Object.keys(themes).forEach(key => {
            themes[key] = normalizeTheme(themes[key], key);
            const paths = collectThemePaths(themes[key]);
            const missing = Array.from(REQUIRED_THEME_PATHS).filter(path => !paths.has(path));
            if (missing.length) throw new Error(`Theme "${key}" missing schema keys: ${missing.join(', ')}`);
        });
    }

    function buildChaosTheme() {
        return normalizeTheme({
            bodyBg: rc(), canvasBg: rc(), grid: rc(), headerLeft: rc(), headerRight: rc(), path: rc(),
            controls: rc(), metricText: rc(),
            btns: { undo: rc(), reset: rc(), guide: rc(), whoa: rc(), hint: rc(), mega: rc(), mute: rc(), muteIcon: rc(), copy: rc(), gen: rc(), modeToggle: rc(), orient: rc(), solve: rc(), editClear: rc(), editBombs: rc(), editNew: rc(), disabled: rc() },
            modal: { bg: rc(), panelBg: rc(), border: rc(), text: rc(), textMuted: rc(), accent: rc(), closeHover: rc() },
            output: { bg: rc(), text: rc() },
            colors: { gate: rc(), goal: rc(), block: rc(), pin: rc(), pinUnflipped: rc(), filter: rc(), portal: rc(), cross: rc(), portalPending: rc(), bombBlastRing: rc(), bombBlastRays: rc() },
            palette: { bg: rc(), border: rc(), itemBg: rc(), itemBorder: rc(), toolBg: rc() },
            headerLeftText: rc(), headerLeftLabel: rc(), ghostBg: rc(), ghostBorder: rc(),
            win: { bg: rc(), border: rc(), text: rc(), accent: rc() },
            alert: { bg: rc(), stroke: rc() },
            ctrlArea: { bg: rc(), border: rc() },
            text: { modal: rc(), modalMuted: rc(), modalAccent: rc(), output: rc(), metric: rc(), headerMain: rc(), headerSub: rc(), win: rc(), winAccent: rc(), megaDesc: rc(), megaOutput: rc(), megaPrimary: rc(), megaSecondary: rc(), megaGemini: rc(), megaCopy: rc(), body: rc(), shellBtn: rc(), actionBtn: rc(), utilityBtn: rc(), utilityBtnGen: rc(), error: rc(), handDrawnShadow: rc() },
            loading: { overlayBg: rc(), panelBg: rc(), panelBorder: rc(), title: rc(), status: rc(), percent: rc(), track: rc(), bar: rc(), error: rc() },
            search: { overlayBg: rc(), megaStatusText: rc(), megaStatusBorder: rc(), label: rc(), dot: rc(), timer: rc(), close: rc(), closeHover: rc() },
            jumpscare: { gooseBg: rc(), gooseText: rc(), bombBg: rc(), bombTopText: rc(), bombBottomText: rc() },
            shell: { btnBg: rc(), btnBgHover: rc(), btnText: rc(), btnBorder: rc(), muteBg: rc(), muteBgHover: rc(), muteText: rc(), muteBorder: rc() },
            header: { navBg: rc(), navBgHover: rc(), navText: rc(), divider: rc() },
            editor: { inputBg: rc(), inputText: rc(), inputBorder: rc(), inputFocus: rc(), toolIcon: rc(), paletteShadow: `0 0 0 2px ${rc()}66` },
            layout: { border: rc(), divider: rc() },
            themeEditor: { panelBg: rc(), swatchBorder: rc() },
            mega: { outputBg: rc(), outputBorder: rc(), primaryBg: rc(), primaryBorder: rc(), secondaryBg: rc(), secondaryBorder: rc(), geminiBg: rc(), geminiBorder: rc(), copyBg: rc(), copyBorder: rc() },
            burst: rc(), check: rc(), leave: { bg: rc(), hover: rc(), text: rc(), border: rc() }
        }, 'chaos');
    }

    function applyTheme(name) {
        const themes = getThemeRegistry();
        if (name === 'chaos') { themes.chaos = buildChaosTheme(); }
        APP.State.ENGINE.runtime.currentTheme = name;
        const t = themes[name];
        const root = document.documentElement;

        root.style.setProperty('--theme-gate', t.colors.gate);
        root.style.setProperty('--theme-goal', t.colors.goal);
        root.style.setProperty('--theme-block', t.colors.block);
        root.style.setProperty('--theme-block-dot', t.grid);
        root.style.setProperty('--theme-pin', t.colors.pin);
        root.style.setProperty('--theme-portal', t.colors.portal);
        root.style.setProperty('--theme-filter', t.colors.filter);
        root.style.setProperty('--theme-cross', t.colors.cross);
        root.style.setProperty('--theme-modal-bg', t.modal.bg);
        root.style.setProperty('--theme-modal-panel', t.modal.panelBg);
        root.style.setProperty('--theme-modal-border', t.modal.border);
        root.style.setProperty('--theme-modal-text', t.modal.text);
        root.style.setProperty('--theme-modal-muted', t.modal.textMuted);
        root.style.setProperty('--theme-modal-accent', t.modal.accent);
        root.style.setProperty('--theme-modal-close-hover', t.modal.closeHover);
        root.style.setProperty('--theme-win-bg', t.win.bg);
        root.style.setProperty('--theme-win-border', t.win.border);
        root.style.setProperty('--theme-win-text', t.win.text);
        root.style.setProperty('--theme-win-accent', t.win.accent);
        root.style.setProperty('--theme-alert-bg', t.alert.bg);
        root.style.setProperty('--theme-alert-stroke', t.alert.stroke);
        root.style.setProperty('--theme-alert-text', t.alert.text);
        root.style.setProperty('--theme-logo-bg', t.canvasBg);
        root.style.setProperty('--theme-logo-grid', t.grid);
        root.style.setProperty('--theme-logo-path', t.path === 'rainbow' ? '#3b82f6' : t.path);
        root.style.setProperty('--theme-logo-gate', t.colors.gate);
        root.style.setProperty('--theme-logo-goal', t.colors.goal);
        root.style.setProperty('--theme-burst', t.burst);
        root.style.setProperty('--theme-check', t.check);
        root.style.setProperty('--theme-mega-output-bg', t.mega.outputBg);
        root.style.setProperty('--theme-mega-output-text', t.text.megaOutput);
        root.style.setProperty('--theme-mega-output-border', t.mega.outputBorder);
        root.style.setProperty('--theme-mega-primary-bg', t.mega.primaryBg);
        root.style.setProperty('--theme-mega-primary-text', t.text.megaPrimary);
        root.style.setProperty('--theme-mega-primary-border', t.mega.primaryBorder);
        root.style.setProperty('--theme-mega-secondary-bg', t.mega.secondaryBg);
        root.style.setProperty('--theme-mega-secondary-text', t.text.megaSecondary);
        root.style.setProperty('--theme-mega-secondary-border', t.mega.secondaryBorder);
        root.style.setProperty('--theme-mega-gemini-bg', t.mega.geminiBg);
        root.style.setProperty('--theme-mega-gemini-text', t.text.megaGemini);
        root.style.setProperty('--theme-mega-gemini-border', t.mega.geminiBorder);
        root.style.setProperty('--theme-mega-copy-bg', t.mega.copyBg);
        root.style.setProperty('--theme-mega-copy-text', t.text.megaCopy);
        root.style.setProperty('--theme-mega-copy-border', t.mega.copyBorder);
        root.style.setProperty('--theme-mega-desc-text', t.text.megaDesc);
        root.style.setProperty('--theme-body-text', t.text.body);
        root.style.setProperty('--theme-disabled-btn-bg', t.btns.disabled);
        root.style.setProperty('--theme-canvas-bg', t.canvasBg);
        root.style.setProperty('--theme-loading-overlay-bg', t.loading.overlayBg);
        root.style.setProperty('--theme-loading-panel-bg', t.loading.panelBg);
        root.style.setProperty('--theme-loading-panel-border', t.loading.panelBorder);
        root.style.setProperty('--theme-loading-title', t.loading.title);
        root.style.setProperty('--theme-loading-status', t.loading.status);
        root.style.setProperty('--theme-loading-percent', t.loading.percent);
        root.style.setProperty('--theme-loading-track', t.loading.track);
        root.style.setProperty('--theme-loading-bar', t.loading.bar);
        root.style.setProperty('--theme-loading-error', t.text.error);
        root.style.setProperty('--theme-search-overlay-bg', t.search.overlayBg);
        root.style.setProperty('--theme-search-mega-status-text', t.search.megaStatusText);
        root.style.setProperty('--theme-search-mega-status-border', t.search.megaStatusBorder);
        root.style.setProperty('--theme-search-label', t.search.label);
        root.style.setProperty('--theme-search-dot', t.search.dot);
        root.style.setProperty('--theme-search-timer', t.search.timer);
        root.style.setProperty('--theme-search-close', t.search.close);
        root.style.setProperty('--theme-search-close-hover', t.search.closeHover);
        root.style.setProperty('--theme-jumpscare-goose-bg', t.jumpscare.gooseBg);
        root.style.setProperty('--theme-jumpscare-goose-text', t.jumpscare.gooseText);
        root.style.setProperty('--theme-jumpscare-bomb-bg', t.jumpscare.bombBg);
        root.style.setProperty('--theme-jumpscare-bomb-top-text', t.jumpscare.bombTopText);
        root.style.setProperty('--theme-jumpscare-bomb-bottom-text', t.jumpscare.bombBottomText);
        root.style.setProperty('--theme-shell-btn-bg', t.shell.btnBg);
        root.style.setProperty('--theme-shell-btn-bg-hover', t.shell.btnBgHover);
        root.style.setProperty('--theme-shell-btn-text', t.shell.btnText);
        root.style.setProperty('--theme-shell-btn-border', t.shell.btnBorder);
        root.style.setProperty('--theme-shell-mute-bg', t.shell.muteBg);
        root.style.setProperty('--theme-shell-mute-bg-hover', t.shell.muteBgHover);
        root.style.setProperty('--theme-shell-mute-text', t.shell.muteText);
        root.style.setProperty('--theme-shell-mute-border', t.shell.muteBorder);
        root.style.setProperty('--theme-header-nav-bg', t.header.navBg);
        root.style.setProperty('--theme-header-nav-bg-hover', t.header.navBgHover);
        root.style.setProperty('--theme-header-nav-text', t.header.navText);
        root.style.setProperty('--theme-header-divider', t.header.divider);
        root.style.setProperty('--theme-border', t.layout.border);
        root.style.setProperty('--theme-divider', t.layout.divider);
        root.style.setProperty('--theme-action-btn-text', t.text.actionBtn);
        root.style.setProperty('--theme-hint-hover', t.btns.hintHover);
        root.style.setProperty('--theme-hint-divider', t.btns.hintDivider);
        root.style.setProperty('--theme-editor-input-bg', t.editor.inputBg);
        root.style.setProperty('--theme-editor-input-text', t.editor.inputText);
        root.style.setProperty('--theme-editor-input-border', t.editor.inputBorder);
        root.style.setProperty('--theme-editor-input-focus', t.editor.inputFocus);
        root.style.setProperty('--theme-theme-editor-panel-bg', t.themeEditor.panelBg);
        root.style.setProperty('--theme-theme-editor-swatch-border', t.themeEditor.swatchBorder);
        root.style.setProperty('--theme-modal-close-hover', t.modal.closeHover);
        root.style.setProperty('--theme-editor-tool-icon', t.editor.toolIcon);
        root.style.setProperty('--theme-editor-palette-shadow', t.editor.paletteShadow);
        root.style.setProperty('--theme-hand-drawn-shadow', t.text.handDrawnShadow);
        root.style.setProperty('--theme-portal-pending', t.colors.portalPending);
        root.style.setProperty('--theme-bomb-blast-ring', t.colors.bombBlastRing);
        root.style.setProperty('--theme-bomb-blast-rays', t.colors.bombBlastRays);
        const leave = APP.Themes.getLeaveThemeColors(t, name === 'classic');
        root.style.setProperty('--theme-leave-bg', leave.bg);
        root.style.setProperty('--theme-leave-hover', leave.hover);
        root.style.setProperty('--theme-leave-text', leave.text);
        root.style.setProperty('--theme-leave-border', leave.border);

        document.body.style.backgroundColor = t.bodyBg;
        APP.Renderer.getCanvas().style.backgroundColor = t.canvasBg;
        APP.UI.getEl('canvasContainer').style.backgroundColor = t.canvasBg;
        APP.UI.getEl('headerLeft').style.backgroundColor = t.canvasBg;
        APP.UI.getEl('headerMiddle').style.backgroundColor = t.headerLeft;
        APP.UI.getEl('headerRight').style.backgroundColor = t.headerRight;
        APP.UI.getEl('levelTitle').style.color = t.text.headerMain;
        APP.UI.getEl('levelLabelText').style.color = t.text.headerSub;

        const ghost = APP.UI.getEl('dragGhost');
        ghost.style.backgroundColor = t.ghostBg;
        ghost.style.borderColor = t.ghostBorder;

        const pal = APP.UI.getEl('editorPalette');
        pal.style.backgroundColor = t.palette.bg;
        pal.style.borderColor = t.palette.border;
        Array.from(document.querySelectorAll('.palette-item')).forEach(item => {
            item.style.backgroundColor = t.palette.itemBg;
            item.style.borderColor = t.palette.itemBorder;
        });

        const metadataPanel = APP.UI.getEl('levelMetadataPanel');
        if (metadataPanel) {
            metadataPanel.style.backgroundColor = t.palette.bg;
            metadataPanel.style.borderColor = t.palette.border;
            metadataPanel.style.color = t.text.modal;
            metadataPanel.querySelectorAll('.metadata-label').forEach(label => { label.style.color = t.text.metric; });
            metadataPanel.querySelectorAll('.metadata-input').forEach(input => {
                input.style.backgroundColor = t.editor.inputBg;
                input.style.color = t.editor.inputText;
                input.style.borderColor = t.editor.inputBorder;
            });
        }

        APP.UI.getEl('editCopyMetrics').style.backgroundColor = t.headerLeft;
        APP.UI.getEl('editCopyMetrics').style.borderColor = t.palette.itemBorder;
        const pc = APP.UI.getEl('playControls');
        pc.style.backgroundColor = t.controls;
        pc.style.borderColor = t.grid;

        APP.UI.getEl('undoBtn').style.backgroundColor = t.btns.undo;
        APP.UI.getEl('resetBtn').style.backgroundColor = t.btns.reset;
        APP.UI.getEl('guideBtn').style.backgroundColor = t.btns.guide;
        APP.UI.getEl('whoaBtn').style.backgroundColor = t.btns.whoa;
        APP.UI.getEl('hintBtn').style.backgroundColor = t.btns.hint;
        const reviewHintEl = APP.UI.getEl('reviewHintBtn');
        if (reviewHintEl) reviewHintEl.style.backgroundColor = t.btns.hint;

        APP.UI.getEl('openThemeModalBtn').style.backgroundColor = t.shell.btnBg;
        APP.UI.getEl('openThemeModalBtn').style.color = t.shell.btnText;
        APP.UI.getEl('openThemeModalBtn').style.borderColor = t.shell.btnBorder;
        APP.UI.getEl('modeToggleShellBtn').style.backgroundColor = t.shell.btnBg;
        APP.UI.getEl('modeToggleShellBtn').style.color = t.shell.btnText;
        APP.UI.getEl('modeToggleShellBtn').style.borderColor = t.shell.btnBorder;

        ['resetBtn','undoBtn','whoaBtn','guideBtn','editResetGrid','editNewLevel','editMegaSolver','editTrapSpotsBtn','editHelpBtn','editCopyMetrics','hintBtn','reviewHintBtn','reviewPublishedLevelsBtn'].forEach(id => {
            const el = APP.UI.getEl(id);
            if (el) el.style.color = t.text.actionBtn;
        });

        APP.UI.getEl('editResetGrid').style.backgroundColor = t.btns.editClear;
        APP.UI.getEl('editNewLevel').style.backgroundColor = t.btns.editNew;
        APP.UI.getEl('editHelpBtn').style.backgroundColor = t.btns.guide;
        APP.UI.getEl('editMegaSolver').style.backgroundColor = t.btns.solve;
        APP.UI.getEl('editTrapSpotsBtn').style.backgroundColor = t.btns.editBombs;
        const publishedBtn = APP.UI.getEl('reviewPublishedLevelsBtn');
        if (publishedBtn) { publishedBtn.style.backgroundColor = t.btns.copy; publishedBtn.style.color = t.text.utilityBtn; publishedBtn.style.borderColor = t.palette.itemBorder; }

        const muteBtn = APP.UI.getEl('muteBtn');
        muteBtn.style.backgroundColor = t.shell.muteBg;
        muteBtn.style.color = t.shell.muteText;
        muteBtn.style.borderColor = t.shell.muteBorder;
        APP.UI.getEl('muteIcon').style.color = t.shell.muteText;
        APP.UI.getEl('muteSlash').style.color = t.shell.muteText;

        APP.UI.getEl('devCopyBtn').style.backgroundColor = t.btns.copy;
        APP.UI.getEl('devGenBtn').style.backgroundColor = t.btns.gen;
        APP.UI.getEl('devCopyBtn').style.color = t.text.utilityBtn;
        APP.UI.getEl('devGenBtn').style.color = t.text.utilityBtnGen;

        APP.UI.getEl('exportLabel').style.color = t.text.metric;
        Array.from(document.querySelectorAll('.metric-label')).forEach(el => el.style.color = t.text.metric);
        APP.UI.getEl('solutionOutput').style.backgroundColor = t.output.bg;
        APP.UI.getEl('solutionOutput').style.color = t.text.output;
        APP.UI.getEl('solutionOutput').style.borderColor = t.modal.border;
        APP.UI.getEl('winSolutionOutput').style.backgroundColor = t.output.bg;
        APP.UI.getEl('winSolutionOutput').style.color = t.text.output;
        APP.UI.getEl('winSolutionOutput').style.borderColor = t.modal.border;

        ['gridSizeMinusBtn','gridSizePlusBtn','gridRotateBtn','gridMirrorBtn'].forEach(id => {
            const el = APP.UI.getEl(id);
            if (el) { el.style.backgroundColor = t.btns.copy; el.style.color = t.btns.muteIcon; el.style.borderColor = t.palette.itemBorder; }
        });
        APP.UI.getEl('gridSizeLabel').style.color = t.btns.muteIcon;

        const gArea = APP.UI.getEl('gridControlArea');
        if (gArea) { gArea.style.backgroundColor = t.ctrlArea.bg; gArea.style.borderColor = t.ctrlArea.border; }

        const winModalContent = APP.UI.getEl('winModalContent');
        APP.UI.getEl('winCircle').style.backgroundColor = t.win.bg;
        APP.UI.getEl('winCircle').style.borderColor = t.win.border;
        winModalContent.querySelector('h2').style.color = t.text.winAccent;
        winModalContent.querySelector('p').style.color = t.text.win;
        APP.UI.getEl('nextLevelModalBtn').style.color = t.text.winAccent;
        APP.UI.getEl('dismissWinModalBtn').style.color = t.text.winAccent;

        APP.Persistence.persistSessionState();
        APP.State.ENGINE.rainbowActive = (name === 'classic');
        APP.State.ENGINE.isDirty = true;
    }

    function populateThemes() {
        if (!originalThemes) {
            originalThemes = APP.Core.deepClone(THEMES);
            delete originalThemes['chaos'];
        }
        const themes = getThemeRegistry();
        const grid = document.getElementById('themeGrid'); APP.UI.clearElement('themeGrid');
        const currentThemeKey = APP.State.ENGINE.runtime.currentTheme || 'classic';
        const currentTheme = themes[currentThemeKey] || themes.classic || {};
        const uniformThemeNameColor = (currentTheme.text && (currentTheme.text.themeName || currentTheme.text.modal)) || '#000000';
        const otherKeys = Object.keys(themes).filter(key => key !== 'classic' && key !== 'chaos');
        const themeKeys = ['classic', ...otherKeys, 'chaos'];
        themeKeys.forEach(key => {
            const t = themes[key] || themes.classic;
            const btn = document.createElement('div');
            btn.className = "flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95 p-1 bg-transparent border-0 shadow-none rounded-none";
            btn.style.background = 'transparent'; btn.style.border = '0'; btn.style.boxShadow = 'none'; btn.style.borderRadius = '0';
            btn.onclick = () => { applyTheme(key); const label = document.getElementById('currentThemeOptionLabel'); if (label) label.textContent = key; document.getElementById('optionsPanelTrack')?.classList.remove('show-theme-page'); };
            const circle = document.createElement('div');
            circle.className = "w-12 h-12 rounded-full border-4 shadow-md";
            if (key === 'chaos') {
                circle.style.background = 'conic-gradient(red, orange, yellow, green, blue, violet, red)';
                circle.style.borderColor = '#ffffff';
            } else {
                circle.style.backgroundColor = t.headerRight || '#000';
                circle.style.borderColor = t.canvasBg || '#fff';
            }
            const label = document.createElement('span');
            label.className = "text-[0.65rem] font-black uppercase tracking-widest";
            label.style.color = uniformThemeNameColor;
            label.innerText = key;
            btn.appendChild(circle); btn.appendChild(label); grid.appendChild(btn);
        });
    }

    function replaceThemeColor(themeKey, oldColor, newColor, category) {
        if (!themeUndoStacks[themeKey]) themeUndoStacks[themeKey] = [];
        themeUndoStacks[themeKey].push(APP.Core.deepClone(APP.Themes.THEMES[themeKey]));

        const t = APP.Themes.THEMES[themeKey];
        const LINE_KEY_GROUPS = {
            modal: ['border'],
            palette: ['border', 'itemBorder'],
            win: ['border'],
            alert: ['stroke'],
            ctrlArea: ['border'],
            layout: ['border', 'divider'],
            themeEditor: ['swatchBorder']
        };
        const replaceInKeys = (obj, keys) => {
            if (!obj) return;
            keys.forEach(key => {
                if (obj[key] === oldColor) obj[key] = newColor;
            });
        };

        if (category === "Buttons") {
            replaceInKeys(t.btns, Object.keys(t.btns || {}));
        }
        else if (category === "Grid Items") {
            replaceInKeys(t.colors, Object.keys(t.colors || {}));
            if (t.path === oldColor) t.path = newColor;
            if (t.grid === oldColor) t.grid = newColor;
        }
        else if (category === "Misc") {
            ['bodyBg', 'canvasBg', 'headerLeft', 'headerRight', 'controls', 'ghostBg', 'burst', 'check'].forEach(key => {
                if (t[key] === oldColor) t[key] = newColor;
            });
            replaceInKeys(t.modal, ['bg', 'panelBg', 'closeHover']);
            replaceInKeys(t.output, ['bg']);
            replaceInKeys(t.palette, ['bg', 'itemBg', 'toolBg']);
            replaceInKeys(t.win, ['bg']);
            replaceInKeys(t.alert, ['bg']);
            replaceInKeys(t.ctrlArea, ['bg']);
            replaceInKeys(t.mega, ['outputBg', 'primaryBg', 'secondaryBg', 'geminiBg', 'copyBg']); replaceInKeys(t.loading, ['overlayBg','panelBg']); replaceInKeys(t.search, ['overlayBg']); replaceInKeys(t.jumpscare, ['gooseBg','bombBg']); replaceInKeys(t.shell, ['btnBg','btnBgHover','muteBg','muteBgHover']); replaceInKeys(t.header, ['navBg','navBgHover']); replaceInKeys(t.themeEditor, ['panelBg']); replaceInKeys(t.editor, ['inputBg','paletteShadow']);
        } else if (category === "Lines") {
            replaceInKeys(t.modal, LINE_KEY_GROUPS.modal);
            replaceInKeys(t.palette, LINE_KEY_GROUPS.palette);
            replaceInKeys(t.win, LINE_KEY_GROUPS.win);
            replaceInKeys(t.alert, LINE_KEY_GROUPS.alert);
            replaceInKeys(t.ctrlArea, LINE_KEY_GROUPS.ctrlArea); replaceInKeys(t.layout, LINE_KEY_GROUPS.layout); replaceInKeys(t.themeEditor, LINE_KEY_GROUPS.themeEditor);
            replaceInKeys(t.mega, ['outputBorder', 'primaryBorder', 'secondaryBorder', 'geminiBorder', 'copyBorder']); replaceInKeys(t.loading, ['panelBorder','track']); replaceInKeys(t.search, ['megaStatusBorder']); replaceInKeys(t.shell, ['btnBorder','muteBorder']); replaceInKeys(t.header, ['divider']);
            if (t.ghostBorder === oldColor) t.ghostBorder = newColor;
            replaceInKeys(t.leave, ['border']);
        } else if (category === "Text") {
            ['metricText', 'headerLeftText', 'headerLeftLabel'].forEach(key => {
                if (t[key] === oldColor) t[key] = newColor;
            });
            replaceInKeys(t.modal, ['text', 'textMuted', 'accent']);
            replaceInKeys(t.output, ['text']);
            replaceInKeys(t.win, ['text', 'accent']);
            replaceInKeys(t.text, Object.keys(t.text || {}));
            replaceInKeys(t.leave, ['text']);
            replaceInKeys(t.loading, ['title','status','percent','error']);
            replaceInKeys(t.search, ['megaStatusText','label','timer','close','closeHover']);
            replaceInKeys(t.jumpscare, ['gooseText','bombTopText','bombBottomText']);
            replaceInKeys(t.shell, ['btnText','muteText']);
            replaceInKeys(t.header, ['navText']);
                } else {
            const replaceDeep = (obj) => {
                if (!obj || typeof obj !== 'object') return;
                for (let k in obj) {
                    if (typeof obj[k] === 'object' && obj[k] !== null) replaceDeep(obj[k]);
                    else if (obj[k] === oldColor) obj[k] = newColor;
                }
            };
            replaceDeep(t);
        }

        APP.Themes.populateThemes();
    }

        const getThemeAiColorsStore = () => themeAiColors;
        const getThemeUndoStacksStore = () => themeUndoStacks;
        const getOriginalThemesStore = () => originalThemes;

        const api = { rc, isValidHexColor, parseGeminiSuggestionsText, fetchGeminiThemeColors, getCurrentTheme, getTheme, toRgb, darkenHex, getLeaveThemeColors, normalizeTheme, ensureThemeLeaveColors, applyTheme, populateThemes, replaceThemeColor, getThemeAiColorsStore, getThemeUndoStacksStore, getOriginalThemesStore, deriveTokens, isSeedTheme, randomSeeds };
        Object.defineProperty(api, 'THEMES', { get: () => getThemeRegistry() });
        return api;
    })();
}
