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
    // ======================================================
    // I) Themes
    // ======================================================

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

        const btnFallbacks = { undo: t.grid, reset: t.headerLeft, guide: t.headerRight, whoa: t.headerRight, hint: t.headerRight, saved: t.headerRight, mega: t.headerRight, mute: t.canvasBg, muteIcon: t.headerRight, copy: t.canvasBg, gen: t.canvasBg, modeToggle: t.headerRight, orient: t.headerRight, solve: t.headerRight, editClear: t.headerLeft, editBombs: t.colors.goal || t.headerLeft, editNew: t.headerRight };
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
            t.shell.auditBg = t.btns.saved || t.btns.solve || t.btns.guide || shellBase;
            t.shell.auditBgHover = darkenHex(t.shell.auditBg, 0.9);
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
        t.shell.auditBg = t.shell.auditBg || t.shell.btnBg;
        t.shell.auditBgHover = t.shell.auditBgHover || darkenHex(t.shell.auditBg, 0.92);
        t.shell.auditText = keepOrImproveContrast(t.shell.auditBg, t.shell.auditText || t.shell.btnText);
        t.shell.auditBorder = t.shell.auditBorder || t.shell.btnBorder || t.modal.border;

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

        t.layout.mainBorder = t.layout.mainBorder || t.modal.border;
        t.layout.headerLeftBorder = t.layout.headerLeftBorder || t.grid;
        t.layout.exportBorder = t.layout.exportBorder || t.palette.border;
        t.layout.editorPanelBorder = t.layout.editorPanelBorder || t.palette.border;

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

    function applyTheme(name) {
        const themes = getThemeRegistry();
        if (name === 'chaos') { themes.chaos = normalizeTheme({ bodyBg: rc(), canvasBg: rc(), grid: rc(), headerLeft: rc(), headerRight: rc(), path: rc(), controls: rc(), metricText: rc(), btns: { undo: rc(), reset: rc(), guide: rc(), whoa: rc(), hint: rc(), saved: rc(), mega: rc(), mute: rc(), muteIcon: rc(), copy: rc(), gen: rc(), modeToggle: rc(), orient: rc(), solve: rc(), editClear: rc(), editBombs: rc(), editNew: rc(), disabled: rc() }, modal: { bg: rc(), panelBg: rc(), border: rc(), text: rc(), textMuted: rc(), accent: rc(), closeHover: rc() }, output: { bg: rc(), text: rc() }, colors: { gate: rc(), goal: rc(), block: rc(), pin: rc(), pinUnflipped: rc(), filter: rc(), portal: rc(), cross: rc(), portalPending: rc(), bombBlastRing: rc(), bombBlastRays: rc() }, palette: { bg: rc(), border: rc(), itemBg: rc(), itemBorder: rc(), toolBg: rc() }, headerLeftText: rc(), headerLeftLabel: rc(), ghostBg: rc(), ghostBorder: rc(), win: { bg: rc(), border: rc(), text: rc(), accent: rc() }, alert: { bg: rc(), stroke: rc() }, ctrlArea: { bg: rc(), border: rc() }, text: { modal: rc(), modalMuted: rc(), modalAccent: rc(), output: rc(), metric: rc(), headerMain: rc(), headerSub: rc(), win: rc(), winAccent: rc(), megaDesc: rc(), megaOutput: rc(), megaPrimary: rc(), megaSecondary: rc(), megaGemini: rc(), megaCopy: rc(), body: rc(), shellBtn: rc(), actionBtn: rc(), utilityBtn: rc(), utilityBtnGen: rc(), error: rc(), handDrawnShadow: rc() }, loading: { overlayBg: rc(), panelBg: rc(), panelBorder: rc(), title: rc(), status: rc(), percent: rc(), track: rc(), bar: rc(), error: rc() }, search: { overlayBg: rc(), megaStatusText: rc(), megaStatusBorder: rc(), label: rc(), dot: rc(), timer: rc(), close: rc(), closeHover: rc() }, jumpscare: { gooseBg: rc(), gooseText: rc(), bombBg: rc(), bombTopText: rc(), bombBottomText: rc() }, shell: { btnBg: rc(), btnBgHover: rc(), btnText: rc(), btnBorder: rc(), auditBg: rc(), auditBgHover: rc(), auditText: rc(), auditBorder: rc(), muteBg: rc(), muteBgHover: rc(), muteText: rc(), muteBorder: rc() }, header: { navBg: rc(), navBgHover: rc(), navText: rc(), divider: rc() }, editor: { inputBg: rc(), inputText: rc(), inputBorder: rc(), inputFocus: rc(), toolIcon: rc(), paletteShadow: `0 0 0 2px ${rc()}66` }, layout: { mainBorder: rc(), headerLeftBorder: rc(), exportBorder: rc(), editorPanelBorder: rc() }, themeEditor: { panelBg: rc(), swatchBorder: rc() }, mega: { outputBg: rc(), outputBorder: rc(), primaryBg: rc(), primaryBorder: rc(), secondaryBg: rc(), secondaryBorder: rc(), geminiBg: rc(), geminiBorder: rc(), copyBg: rc(), copyBorder: rc() }, burst: rc(), check: rc(), leave: { bg: rc(), hover: rc(), text: rc(), border: rc() } }, 'chaos'); }
        APP.State.ENGINE.runtime.currentTheme = name;
        APP.Themes.currentTheme = APP.State.ENGINE.runtime.currentTheme;
        const t = themes[name];
        APP.UI.applyTheme(t, { themeName: name });
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
        const themeKeys = Object.keys(themes).filter(key => key !== 'classic' && key !== 'chaos');
        themeKeys.forEach(key => { const t = themes[key] || themes.classic; const btn = document.createElement('div'); btn.className = "flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95 p-1 bg-transparent border-0 shadow-none rounded-none"; btn.style.background = 'transparent'; btn.style.border = '0'; btn.style.boxShadow = 'none'; btn.style.borderRadius = '0'; btn.onclick = () => { applyTheme(key); APP.UI.closeModal('themeModal'); }; const circle = document.createElement('div'); circle.className = "w-12 h-12 rounded-full border-4 shadow-md"; circle.style.backgroundColor = t.headerRight || '#000'; circle.style.borderColor = t.canvasBg || '#fff'; const label = document.createElement('span'); label.className = "text-[0.65rem] font-black uppercase tracking-widest"; label.style.color = uniformThemeNameColor; label.innerText = key; btn.appendChild(circle); btn.appendChild(label); grid.appendChild(btn); });
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
            layout: ['mainBorder','headerLeftBorder','exportBorder','editorPanelBorder'],
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

        APP.UI.ThemeEditor.renderAll();
        APP.Themes.populateThemes();
    }

        const getThemeAiColorsStore = () => themeAiColors;
        const getThemeUndoStacksStore = () => themeUndoStacks;
        const getOriginalThemesStore = () => originalThemes;

        const api = { rc, isValidHexColor, parseGeminiSuggestionsText, fetchGeminiThemeColors, getCurrentTheme, toRgb, darkenHex, getLeaveThemeColors, normalizeTheme, ensureThemeLeaveColors, applyTheme, populateThemes, replaceThemeColor, getThemeAiColorsStore, getThemeUndoStacksStore, getOriginalThemesStore };
        Object.defineProperty(api, 'THEMES', { get: () => getThemeRegistry() });
        return api;
    })();
}
