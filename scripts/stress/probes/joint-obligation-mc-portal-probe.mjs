/**
 * Harness-pluggable wrapper around scripts/stress/lib/joint-obligation-mc-portal.mjs — see that
 * file for the full derivation and soundness argument. This is the observer-only joint-obligation
 * propagation pilot's first concrete obligation-cluster kind (must-cross forced-neighbor x portal
 * terminal), scored against scripts/stress/offline-replay-harness.mjs's oracle-labelled atlas per
 * the same "prototype as a shadow propagator, compare unique catches" discipline used for
 * mc-neighbor-budget-probe.mjs before any hot-path integration.
 */
import { evaluateJointObligationPortalDeadlock } from '../lib/joint-obligation-mc-portal.mjs';

export const name = 'joint-obligation-mc-portal';
export const soundnessClass = 'sound prune (must-cross forced-neighbor obligation coupled with an unconditional portal-terminal no-revisit rule)';

export function evaluate({ level, prep, state, pos }) {
    return evaluateJointObligationPortalDeadlock({ level, prep, state, pos });
}
