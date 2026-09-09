/**
 * Compatibility import for tooling that historically owned the discovery-event identity rule.
 *
 * The canonical implementation now lives at the hint persistence boundary so mergeHints(),
 * reconcileHints(), capture guards, artifact mergers, and the offline cleaner cannot drift apart.
 */
export { provenanceEventIdentity } from '../modules/domain/hint-runtime.mjs';
