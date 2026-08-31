import { AXIS, DEV } from './app-constants.js';

export function createDebug(
    {
        isDevMode = DEV,
        axis = AXIS,
        getWindow = () => (typeof window === 'undefined' ? null : window),
    }: {
        isDevMode?: boolean;
        axis?: typeof AXIS | Record<string, any>;
        getWindow?: () => any;
    } = {},
) {
    const debugExports: Record<string, any> = {};

    function register(name: string, value: any): void {
        if (!name) return;
        debugExports[name] = value;
    }

    function expose() {
        if (!isDevMode) return;
        const targetWindow = getWindow();
        if (!targetWindow) return;
        targetWindow.AXIS = axis;
        Object.entries(debugExports).forEach(([name, value]) => {
            targetWindow[name] = value;
        });
    }

    return { register, expose };
}
