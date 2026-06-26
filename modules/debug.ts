export function createDebug(
    { core, getWindow = () => (typeof window === 'undefined' ? null : window) }:
        { core: any, getWindow?: () => any },
) {
    const debugExports: Record<string, any> = {};

    function register(name: string, value: any): void {
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
