export function installBoot(APP) {
    APP.Boot = (() => {
        let started = false;

        const start = async () => {
            if (started) return;
            started = true;

            APP.UI.initDom();
            APP.Debug.expose();
            const persistedSession = APP.Persistence.applySessionState();
            APP.State.ENGINE.runtime.currentTheme = persistedSession.currentTheme;

            try {
                APP.Persistence.syncProgress();
                if (APP.Persistence.hasConfig) {
                    APP.Persistence.initAuth().catch((e) => console.warn('[Boot] Auth init failed', e)).finally(() => APP.Persistence.syncProgress());
                }

                const mode = await APP.Loader.init();
                if (mode !== 'ready') {
                    APP.Loader.fail('boot', { message: `Unexpected loader mode: ${mode}` });
                    return;
                }
                if (APP.Loader.getStatus().phase === 'failed') return;

                if (APP.Persistence.hasConfig) {
                    try {
                        const published = await APP.Persistence.loadPublishedLevels();
                        if (published.length > 0) APP.Data.appendLevels(published);
                    } catch (e) {
                        console.warn('[Boot] Published levels load failed', e);
                    }
                }

                APP.Themes.ensureThemeLeaveColors();
                APP.Themes.applyTheme(persistedSession.currentTheme);
                APP.Engine.loadLevel(persistedSession.levelIdx);
                APP.Engine.updatePlayModeLayout();
                APP.Engine.loop();
                APP.Loader.finish();

                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('mode') === 'review') {
                    const overlay = document.getElementById('reviewAuthOverlay');
                    if (overlay) overlay.classList.remove('hidden');
                }
            } catch (error) {
                APP.Loader.fail('boot', error);
            }
        };

        return { start };
    })();

    window.onload = () => {
        let inputInitError = null;
        try {
            APP.Input.init();
        } catch (err) {
            inputInitError = err;
            console.error('[Startup] Input init failed; continuing boot.', err);
        }

        APP.Boot.start()
            .then(() => {
                if (inputInitError) {
                    try { APP.UI.reportError('startup-input-init', inputInitError); } catch (_) {}
                }
            })
            .catch((err) => {
                APP.Loader.fail('startup-boot', err);
            });
    };
}
