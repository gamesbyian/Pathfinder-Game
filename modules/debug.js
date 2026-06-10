export function createDebug({ core }) {
    const debugExports = {};

    function register(name, value) {
        if (!name) return;
        debugExports[name] = value;
    }

    function expose() {
        if (!core.DEV) return;
        window.AXIS = core.AXIS;
        Object.entries(debugExports).forEach(([name, value]) => {
            window[name] = value;
        });
    }

    return { register, expose };
}
