import { setCurrentThemeName } from './state-actions.js';

export function createBoot({ ui, debug, persistence, loader, themes, engine, data, state }) {
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
                persistence.initAuth().catch((e) => console.warn('[Boot] Auth init failed', e)).finally(() => persistence.syncProgress());
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
                } catch (e) {
                    console.warn('[Boot] Published levels load failed', e);
                }
            }

            themes.ensureThemeLeaveColors();
            themes.applyTheme(persistedSession.currentTheme);
            engine.game.loadLevel(persistedSession.levelIdx);
            engine.updatePlayModeLayout();
            engine.loop();
            loader.finish();

            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('mode') === 'review') {
                const overlay = document.getElementById('reviewAuthOverlay');
                if (overlay) overlay.classList.remove('hidden');
            }
        } catch (error) {
            loader.fail('boot', error);
        }
    };

    return { start };
}

// Factory for the window.onload handler — keeps the boot module testable
// without requiring a real window at construction time.
export function createOnloadHandler({ input, boot, ui, loader }) {
    return () => {
        let inputInitError = null;
        try {
            input.init();
        } catch (err) {
            inputInitError = err;
            console.error('[Startup] Input init failed; continuing boot.', err);
        }

        boot.start()
            .then(() => {
                if (inputInitError) {
                    try { ui.reportError('startup-input-init', inputInitError); } catch (_) {}
                }
            })
            .catch((err) => {
                loader.fail('startup-boot', err);
            });
    };
}
