export function createDebug({ core, getWindow = () => (typeof window === 'undefined' ? null : window) }) {
    const debugExports = {};

    function register(name, value) {
        if (!name) return;
        debugExports[name] = value;
    }

    function expose() {
        if (!core.DEV) return;
        const targetWindow = getWindow();
        if (!targetWindow) return;
        targetWindow.AXIS = core.AXIS;
        Object.entries(debugExports).forEach(([name, value]) => {
            targetWindow[name] = value;
        });
    }

    return { register, expose };
}
