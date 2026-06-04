export function installDebug(APP) {
    APP.Debug = (() => {
        const debugExports = {};

        function register(name, value) {
            if (!name) return;
            debugExports[name] = value;
        }

        function expose() {
            if (!APP?.Core?.DEV) return;
            window.AXIS = APP.Core.AXIS;
            Object.entries(debugExports).forEach(([name, value]) => {
                window[name] = value;
            });
        }

        return { register, expose };
    })();
}
