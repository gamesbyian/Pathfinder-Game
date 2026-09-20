export const TOPOLOGY_GENERATION_SUPPORT = Object.freeze({
  schemaVersion: 1,
  kind: 'pathfinder-generation-support-envelope',
  source: 'topology-composition',
  generatorVersion: '0.1.0',
  gridSizes: Object.freeze([12, 15]),
  topologyGrammar: 'perfect-maze-diameter-compiled-to-3x3-path-modules',
  supportedMechanics: Object.freeze([
    'blocks',
    'must-pass',
    'must-cross',
    'flipping-filter',
    'must-turn',
    'goose',
    'false-goal',
  ]),
  unsupportedMechanics: Object.freeze([
    'portal',
    'static-filter',
    'surround',
    'adjacent-turn',
    'multi-gate',
  ]),
  unsupportedTopologyFamilies: Object.freeze([
    'arbitrary-macro-cycle',
    'competing-macro-routes',
    'open-region',
    'room-corridor',
  ]),
});

export function generationSupportForMechanics(envelope, requiredMechanics = []) {
  const required = [...new Set((requiredMechanics ?? []).map(value => String(value).trim()).filter(Boolean))];
  if (!required.length) return { status: 'supported', requiredMechanics: [], unsupported: [], unknown: [] };
  if (!envelope || typeof envelope !== 'object') {
    return { status: 'unknown', requiredMechanics: required, unsupported: [], unknown: required };
  }
  const supported = new Set(envelope.supportedMechanics ?? []);
  const unsupportedSet = new Set(envelope.unsupportedMechanics ?? []);
  const unsupported = required.filter(mechanic => unsupportedSet.has(mechanic));
  const unknown = required.filter(mechanic => !supported.has(mechanic) && !unsupportedSet.has(mechanic));
  return {
    status: unsupported.length ? 'unsupported' : unknown.length ? 'unknown' : 'supported',
    requiredMechanics: required,
    unsupported,
    unknown,
  };
}
