export const TOPOLOGY_GENERATION_SUPPORT = Object.freeze({
  schemaVersion: 1,
  kind: 'pathfinder-generation-support-envelope',
  source: 'topology-composition',
  generatorVersion: '0.1.0',
  gridSizes: Object.freeze([12, 15]),
  topologyGrammar: 'perfect-maze-diameter-compiled-to-3x3-path-modules',
  supportedTopologyFamilies: Object.freeze(['perfect-maze-diameter']),
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

function classifyRequiredValues(requiredValues, supportedValues, unsupportedValues = []) {
  const required = [...new Set((requiredValues ?? []).map(value => String(value).trim()).filter(Boolean))];
  if (!required.length) return { status: 'supported', required: [], unsupported: [], unknown: [] };
  const supported = new Set((supportedValues ?? []).map(String));
  const unsupportedSet = new Set((unsupportedValues ?? []).map(String));
  const unsupported = required.filter(value => unsupportedSet.has(value));
  const unknown = required.filter(value => !supported.has(value) && !unsupportedSet.has(value));
  return {
    status: unsupported.length ? 'unsupported' : unknown.length ? 'unknown' : 'supported',
    required,
    unsupported,
    unknown,
  };
}

export function generationSupportForClaim(envelope, {
  requiredMechanics = [],
  requiredGridSizes = [],
  requiredTopologyFamilies = [],
} = {}) {
  if (!envelope || typeof envelope !== 'object') {
    const mechanics = classifyRequiredValues(requiredMechanics, []);
    const gridSizes = classifyRequiredValues(requiredGridSizes, []);
    const topologyFamilies = classifyRequiredValues(requiredTopologyFamilies, []);
    return {
      status: [mechanics, gridSizes, topologyFamilies].some(row => row.required.length) ? 'unknown' : 'supported',
      mechanics,
      gridSizes,
      topologyFamilies,
    };
  }

  const mechanics = classifyRequiredValues(
    requiredMechanics,
    envelope.supportedMechanics,
    envelope.unsupportedMechanics,
  );
  const gridSizes = classifyRequiredValues(
    requiredGridSizes,
    envelope.gridSizes,
  );
  const topologyFamilies = classifyRequiredValues(
    requiredTopologyFamilies,
    envelope.supportedTopologyFamilies,
    envelope.unsupportedTopologyFamilies,
  );
  const dimensions = [mechanics, gridSizes, topologyFamilies];
  return {
    status: dimensions.some(row => row.status === 'unsupported')
      ? 'unsupported'
      : dimensions.some(row => row.status === 'unknown')
        ? 'unknown'
        : 'supported',
    mechanics,
    gridSizes,
    topologyFamilies,
  };
}

export function generationSupportForMechanics(envelope, requiredMechanics = []) {
  const result = generationSupportForClaim(envelope, { requiredMechanics });
  return {
    status: result.status,
    requiredMechanics: result.mechanics.required,
    unsupported: result.mechanics.unsupported,
    unknown: result.mechanics.unknown,
  };
}
