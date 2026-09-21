export const DURABLE_EVIDENCE_BUNDLE_SCHEMA_VERSION = 2;

/**
 * Historical durable bundles predate the authored manifestStoredPath edge. Some later unversioned
 * bundles already carry the field; older ones can only recover it from the retained manifest file
 * record. This compatibility stays here and nowhere in current relation logic.
 */
export function historicalDurableBundleManifestStoredPath(bundle) {
  const explicit = typeof bundle?.manifestStoredPath === 'string' && bundle.manifestStoredPath
    ? bundle.manifestStoredPath
    : null;
  if (explicit) return explicit;
  return (bundle?.files ?? []).find(file => file?.source === 'manifest.json')?.stored ?? null;
}

/**
 * Resolve the authored manifest edge for a persisted durable bundle.
 * v2+ current bundles are strict. Unversioned/v1 inputs are archive reads.
 */
export function durableBundleManifestStoredPath(bundle) {
  const version = bundle?.schemaVersion ?? 1;
  if (version === DURABLE_EVIDENCE_BUNDLE_SCHEMA_VERSION) {
    if (typeof bundle?.manifestStoredPath !== 'string' || !bundle.manifestStoredPath) {
      throw new Error('current durable evidence bundle lacks manifestStoredPath');
    }
    return bundle.manifestStoredPath;
  }
  if (version === 1) {
    const stored = historicalDurableBundleManifestStoredPath(bundle);
    if (!stored) throw new Error('historical durable evidence bundle has no recoverable manifest edge');
    return stored;
  }
  throw new Error(`unsupported durable evidence bundle schemaVersion: ${String(version)}`);
}
