export function installBoot(APP) {
    // APP.Boot lifecycle guarantees:
    // - start() is the single authoritative init entrypoint.
    // - loader/init errors route through APP.Loader.fail(...) and stop further boot progression.
    // - successful path reaches APP.Loader.finish() exactly once.
    // APP.Boot Public API: start().
    // Owns the single initialization entrypoint and orchestrates auth/progress sync, loader completion, and post-load system startup.
    APP.Boot = (() => {
        let started = false;

        const start = async () => {
            if (started) return;
            started = true;

            APP.UI.initDom();
            APP.UI.ThemeEditor.init();
            APP.Debug.expose();
            const persistedSession = APP.Persistence.applySessionState();
            APP.State.ENGINE.runtime.currentTheme = persistedSession.currentTheme;

            try {
                APP.Persistence.syncProgress();
                if (APP.Persistence.hasConfig) {
                    Promise.resolve(APP.Persistence.initAuth())
                        .then(
                            () => { APP.Persistence.syncProgress(); },
                            () => { APP.Persistence.syncProgress(); }
                        );
                }

                const mode = await APP.Loader.init();
                if (mode !== 'ready') {
                    APP.Loader.fail('boot', { message: `Unexpected loader mode: ${mode}` });
                    return;
                }
                if (APP.Loader.getStatus().phase === 'failed') return;

                APP.Themes.ensureThemeLeaveColors();
                APP.Themes.applyTheme(persistedSession.currentTheme);
                APP.Engine.loadLevel(persistedSession.levelIdx);
                APP.Engine.updatePlayModeLayout();
                APP.Engine.loop();
                APP.Loader.finish();
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

        Promise.resolve(APP.Boot.start())
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
