// @ts-check
/** @param {{ core: any, getWindow?: () => any }} deps */
export function createDebug({ core, getWindow = () => (typeof window === 'undefined' ? null : window) }) {
    /** @type {Record<string, any>} */
    const debugExports = {};

    /** @param {string} name @param {any} value @returns {void} */
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
