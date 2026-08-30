/**
 * Static probe registry for offline-replay-harness.mjs. Probes are imported statically (not
 * dynamically loaded by path at runtime) because the harness runs under scripts/run-bundled.mjs's
 * esbuild bundle (see that file's own doc for why: the solver's hot-path modules run ~5x slower
 * under tsx, so CLI tooling bundles instead) — a runtime `import()` of an arbitrary probe path
 * would resolve its own `.ts` imports against plain node's native loader, which doesn't understand
 * bare `.ts` specifiers and fails outside the bundle. Adding a new probe means adding it here.
 */
import * as separatorResourceProbe from './separator-resource-probe.mjs';
import * as obligationTourProbe from './obligation-tour-probe.mjs';
import * as goalApproachEnvelopeProbe from './goal-approach-envelope-probe.mjs';
import * as mcNeighborBudgetProbe from './mc-neighbor-budget-probe.mjs';

export const PROBE_REGISTRY = new Map([
    [separatorResourceProbe.name, separatorResourceProbe],
    [obligationTourProbe.name, obligationTourProbe],
    [goalApproachEnvelopeProbe.name, goalApproachEnvelopeProbe],
    [mcNeighborBudgetProbe.name, mcNeighborBudgetProbe],
]);
