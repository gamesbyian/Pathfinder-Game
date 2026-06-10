export function createLoader({ ui, data, themes, core }) {
    const state = {
        progress:    0,
        hasLoaded:   false,
        hasFinished: false,
        status:      'idle',
        mode:        'unknown',
        initPromise: null,
        timeoutId:   null,
        settled:     false
    };

    const setProgress = (nextProgress, label = 'Initing Systems...') => {
        state.progress = Math.max(0, Math.min(100, nextProgress));
        ui.setProgress({ pct: state.progress, phase: label });
    };

    const finalizeInit = (mode) => {
        if (state.settled) return;
        state.settled = true;
        if (state.timeoutId) {
            clearTimeout(state.timeoutId);
            state.timeoutId = null;
        }
        state.mode = mode;
    };

    const finish = () => {
        if (state.hasFinished) return;
        state.hasFinished = true;
        setProgress(100, state.mode === 'ready' ? 'Ready' : 'Load failed');
        if (document.getElementById('loadingOverlay')) {
            ui.setOverlayOpacity('loadingOverlay', '0');
            setTimeout(() => ui.hideOverlay('loadingOverlay'), 500);
        }
        themes.populateThemes();
    };

    const fail = (kind, payload) => {
        try { ui.reportError(kind, payload); } catch {}
        state.status = 'failed';
        state.mode   = 'failed';
        finish();
    };

    const init = () => {
        if (state.initPromise) return state.initPromise;
        state.status     = 'loading';
        state.settled    = false;
        state.hasFinished = false;
        setProgress(5, 'Initing Systems...');

        state.initPromise = new Promise((resolve) => {
            const done = (mode) => {
                finalizeInit(mode);
                resolve(mode);
            };

            const loadScriptWithTimeout = (src, timeoutMs) => new Promise((res, rej) => {
                const s = document.createElement('script');
                s.src = src;
                let settled = false;
                const timer = setTimeout(() => {
                    if (settled) return;
                    settled = true;
                    rej(new Error(`Timed out loading ${src} after ${timeoutMs}ms`));
                }, timeoutMs);
                s.onload = () => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    res();
                };
                s.onerror = () => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    rej(new Error(`Failed to load ${src}`));
                };
                document.head.appendChild(s);
            });

            const loadThemes = new Promise(innerResolve => {
                setProgress(20, 'Loading Themes...');
                loadScriptWithTimeout('./themes.js', 4000)
                    .then(() => { setProgress(55, 'Themes Ready'); innerResolve(); })
                    .catch(err => {
                        console.warn('[Loader] themes.js failed; using fallback theme.', err);
                        setProgress(55, 'Themes Fallback');
                        innerResolve();
                    });
            });

            const loadLevels = loadScriptWithTimeout('./levels.js', 4000)
                .then(() => { setProgress(70, 'Loading Levels...'); });

            loadThemes
                .then(() => loadLevels)
                .then(() => {
                    if (state.hasLoaded) {
                        done(state.mode === 'unknown' ? 'failed' : state.mode);
                        return;
                    }
                    data.ingest();
                    themes.ensureThemeLeaveColors();
                    if (!Array.isArray(data.getLevels()) || data.getLevels().length === 0) {
                        done('failed');
                        return;
                    }
                    state.hasLoaded = true;
                    state.status    = 'ready';
                    setProgress(95, 'Levels Ready');
                    if (core.DEV) console.log('Levels loaded:', data.getLevels().length);
                    done('ready');
                })
                .catch(err => {
                    console.error('[External level/theme load failed]', err);
                    done('failed');
                });

            state.timeoutId = setTimeout(() => {
                done('failed');
            }, 5000);
        });

        return state.initPromise;
    };

    const getStatus = () => ({
        phase:       state.status,
        progress:    state.progress,
        hasLoaded:   state.hasLoaded,
        hasFinished: state.hasFinished,
        mode:        state.mode
    });

    window.addEventListener('error',             (event) => fail('error',   event?.error  || event));
    window.addEventListener('unhandledrejection',(event) => fail('promise', event?.reason || event));

    return { init, finish, fail, getStatus };
}
