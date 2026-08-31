function createDefaultLoaderBrowser() {
    const rootWindow = typeof window === 'undefined' ? null : window;
    const rootDocument = typeof document === 'undefined' ? null : document;
    return {
        createScript: () => rootDocument?.createElement('script'),
        appendToHead: (scriptEl: any) => rootDocument?.head?.appendChild(scriptEl),
        getElementById: (id: any) => rootDocument?.getElementById(id),
        setTimeout: (fn: any, ms: any) => setTimeout(fn, ms),
        clearTimeout: (id: any) => clearTimeout(id),
        addEventListener: (eventName: any, handler: any) => rootWindow?.addEventListener?.(eventName, handler),
    };
}

import { defaultReportError } from './error-reporting.js';
import { DEV } from './app-constants.js';

export function createLoader({ ui, data, themes, browser = createDefaultLoaderBrowser(), dataAssetLoader = null, reportError = defaultReportError }: any) {
    const state = {
        progress:    0,
        hasLoaded:   false,
        hasFinished: false,
        status:      'idle',
        mode:        'unknown',
        initPromise: null as any,
        timeoutId:   null,
        settled:     false
    };

    const setProgress = (nextProgress: any, label: any = 'Initing Systems...') => {
        state.progress = Math.max(0, Math.min(100, nextProgress));
        ui.setProgress({ pct: state.progress, phase: label });
    };

    const finalizeInit = (mode: any) => {
        if (state.settled) return;
        state.settled = true;
        if (state.timeoutId) {
            browser.clearTimeout(state.timeoutId);
            state.timeoutId = null;
        }
        state.mode = mode;
    };

    const finish = () => {
        if (state.hasFinished) return;
        state.hasFinished = true;
        setProgress(100, state.mode === 'ready' ? 'Ready' : 'Load failed');
        if (browser.getElementById('loadingOverlay')) {
            ui.setOverlayOpacity('loadingOverlay', '0');
            browser.setTimeout(() => ui.hideOverlay('loadingOverlay'), 500);
        }
        themes.populateThemes();
    };

    // Central failure funnel: boot errors and the window `error`/`unhandledrejection` hooks
    // (registered below) all land here, so the error-reporting seam sees every one of them.
    const fail = (kind: any, payload: any) => {
        reportError(`loader.${kind}`, payload);
        try { ui.showStartupError(kind, payload); } catch (e: any) { reportError('loader.show-startup-error', e); }
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

        state.initPromise = new Promise((resolve: any) => {
            const done = (mode: any) => {
                finalizeInit(mode);
                resolve(mode);
            };

            const finishLoadedData = (label: any) => {
                themes.ensureThemeLeaveColors();
                if (!Array.isArray(data.getLevels()) || data.getLevels().length === 0) {
                    done('failed');
                    return;
                }
                state.hasLoaded = true;
                state.status    = 'ready';
                setProgress(95, label);
                if (DEV) console.log('Levels loaded:', data.getLevels().length);
                done('ready');
            };

            if (typeof dataAssetLoader !== 'function') {
                reportError('loader.data-assets', 'dataAssetLoader is required but was not provided');
                done('failed');
                return;
            }

            setProgress(20, 'Loading Data Assets...');
            Promise.resolve(dataAssetLoader())
                .then((assets: any) => {
                    if (!assets || !Array.isArray(assets.levels) || !assets.themes || typeof assets.themes !== 'object') {
                        reportError('loader.data-assets', 'dataAssetLoader returned invalid assets');
                        done('failed');
                        return;
                    }
                    data.ingest({ levels: assets.levels, themes: assets.themes, window: null });
                    finishLoadedData('Data Assets Ready');
                })
                .catch((err: any) => {
                    reportError('loader.data-assets', err);
                    done('failed');
                });

            state.timeoutId = browser.setTimeout(() => {
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

    browser.addEventListener('error',             (event: any) => fail('error',   event?.error  || event));
    browser.addEventListener('unhandledrejection',(event: any) => fail('promise', event?.reason || event));

    return { init, finish, fail, getStatus };
}
