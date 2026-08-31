import { AXIS, DEV } from './app-constants.js';

export function createDebug(
    { getWindow = () => (typeof window === 'undefined' ? null : window) }:
        { getWindow?: () => any } = {},
) {
    const debugExports: Record<string, any> = {};

    function register(name: string, value: any): void {
        if (!name) return;
        debugExports[name] = value;
    }

    function expose() {
        if (!DEV) return;
        const targetWindow = getWindow();
        if (!targetWindow) return;
        targetWindow.AXIS = AXIS;
        Object.entries(debugExports).forEach(([name, value]) => {
            targetWindow[name] = value;
        });
    }

    return { register, expose };
}
