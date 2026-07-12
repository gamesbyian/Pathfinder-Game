import { setCurrentThemeName } from './state-actions.js';
import { defaultReportError } from './error-reporting.js';

export function createBoot({ ui, debug, persistence, loader, themes, engine, data, state, reportError = defaultReportError }: any) {
    let started = false;

    const start = async () => {
        if (started) return;
        started = true;

        ui.initDom();
        debug.expose();
        const persistedSession = persistence.applySessionState();
        setCurrentThemeName(state, persistedSession.currentTheme);

        try {
            persistence.syncProgress();
            if (persistence.hasConfig) {
                persistence.initAuth().catch((e: any) => reportError('boot.auth-init', e)).finally(() => persistence.syncProgress());
            }

            const mode = await loader.init();
            if (mode !== 'ready') {
                loader.fail('boot', { message: `Unexpected loader mode: ${mode}` });
                return;
            }
            if (loader.getStatus().phase === 'failed') return;

            if (persistence.hasConfig) {
                try {
                    const published = await persistence.loadPublishedLevels();
                    if (published.length > 0) data.appendLevels(published);
                } catch (e: any) {
                    reportError('boot.published-levels-load', e);
                }
            }

            themes.ensureThemeLeaveColors();
            themes.applyTheme(persistedSession.currentTheme);

            // Session state is read before loader.init() because the persisted theme is needed
            // early, but the level corpus is not available until after loader.init() completes.
            // That means persistence cannot reliably clamp a saved level index against the active
            // corpus during applySessionState(). This matters after using the Dev-Mode corpus
            // switcher: a high stress-corpus index can be saved locally, while the next page load
            // always starts on the published corpus. If we pass that out-of-range index through,
            // level-flow intentionally no-ops and leaves the first render with no level (blank
            // grid). Re-validate against the now-loaded corpus and fall back to level 1.
            const initialLevelIdx = Number.isInteger(persistedSession.levelIdx) && data.getLevel(persistedSession.levelIdx)
                ? persistedSession.levelIdx
                : 0;
            engine.game.loadLevel(initialLevelIdx);
            engine.updatePlayModeLayout();
            engine.loop();
            loader.finish();

            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('mode') === 'review') {
                const overlay = (document.getElementById('reviewAuthOverlay') as any);
                if (overlay) overlay.classList.remove('hidden');
            }
        } catch (error: any) {
            loader.fail('boot', error);
        }
    };

    return { start };
}

// Factory for the window.onload handler — keeps the boot module testable
// without requiring a real window at construction time.
export function createOnloadHandler({ input, boot, ui, loader, reportError = defaultReportError }: any) {
    return () => {
        let inputInitError = null;
        try {
            input.init();
        } catch (err: any) {
            inputInitError = err;
            reportError('startup.input-init', err);
        }

        boot.start()
            .then(() => {
                if (inputInitError) {
                    try { ui.showStartupError('startup-input-init', inputInitError); } catch (e: any) { reportError('startup.show-startup-error', e); }
                }
            })
            .catch((err: any) => {
                loader.fail('startup-boot', err);
            });
    };
}
