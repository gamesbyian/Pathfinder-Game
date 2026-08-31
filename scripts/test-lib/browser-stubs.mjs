// Minimal browser-global stubs for running the solver (and its neighbours) under Node.
//
// The solver core is DOM-free, but a few modules it pulls in at import time probe
// `window`/`document`/`performance`. These CLI harnesses (solver:direct, solver:regression,
// ablation, trap-search, hint calibration/diversification) run outside a browser, so
// they install just enough of those globals to let the modules evaluate.
//
// `__PF_DISABLE_AUTO_PORTAL_VALIDATOR_DIAGNOSTICS__` suppresses the auto portal-validator
// diagnostics that would otherwise fire on import. Each global is only defined if absent,
// so this is safe to call once before dynamically importing the solver.
export function installBrowserStubs() {
    if (typeof globalThis.window === 'undefined')
        globalThis.window = { __PF_DISABLE_AUTO_PORTAL_VALIDATOR_DIAGNOSTICS__: true };
    if (typeof globalThis.document === 'undefined')
        globalThis.document = {
            addEventListener() {}, getElementById: () => null,
            createElement: () => ({ classList: { add() {}, remove() {} }, style: {} }),
        };
    if (typeof globalThis.performance === 'undefined')
        globalThis.performance = { now: () => Date.now() };
}
