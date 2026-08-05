/**
 * Static probe registry for interface-probe-harness.mjs. Probes are imported statically (not
 * dynamically loaded by path at runtime) because the harness runs under scripts/run-bundled.mjs's
 * esbuild bundle (see that file's own doc for why: the solver's hot-path modules run ~5x slower
 * under tsx, so CLI tooling bundles instead) — a runtime `import()` of an arbitrary probe path
 * would resolve its own `.ts` imports against plain node's native loader, which doesn't understand
 * bare `.ts` specifiers and fails outside the bundle. Adding a new probe means adding it here.
 */
import * as separatorResourceProbe from './separator-resource-probe.mjs';

export const PROBE_REGISTRY = new Map([
    [separatorResourceProbe.name, separatorResourceProbe],
]);
