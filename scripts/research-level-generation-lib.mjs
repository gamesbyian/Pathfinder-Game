import path from 'node:path';
import { validateResearchEvaluationEvidenceRole } from './research-evaluation-evidence-role-lib.mjs';
import { TOPOLOGY_GENERATION_SUPPORT, generationSupportForClaim } from './stress/topology-generation-support-lib.mjs';

export const GENERATION_METHODS = Object.freeze({
  targeted: Object.freeze({
    id: 'targeted',
    label: 'hypothesis-driven witness-first',
    script: 'scripts/stress/generate.mjs',
    npmScript: 'stress:generate',
    sourceFamily: 'witness-first-targeted',
    distributionClass: 'witness-first',
    scientificUse: 'development/challenge acquisition when a ranked hypothesis needs solver-relevant structural pressure',
    independenceNote: 'shares witness-first construction machinery with random; do not treat it as distributionally independent from random',
    countMode: 'per-batch',
    batches: 6,
    defaultPrefix: 'S',
    unsupportedCommonFlags: ['append', 'envelopeCaps'],
  }),
  random: Object.freeze({
    id: 'random',
    label: 'solver-blind random witness-first',
    script: 'scripts/stress/generate-random.mjs',
    npmScript: 'stress:generate-random',
    sourceFamily: 'witness-first-random',
    distributionClass: 'witness-first',
    scientificUse: 'sample-independent confirmation, broad solver-blind parent acquisition, and unbiased-with-respect-to-current-policy development blocks',
    independenceNote: 'different selection philosophy from targeted but still witness-first; use topology or human/editor material for distributional transfer',
    countMode: 'exact',
    defaultPrefix: 'R',
    unsupportedCommonFlags: [],
  }),
  topology: Object.freeze({
    id: 'topology',
    label: 'solver-blind topology composition',
    script: 'scripts/stress/generate-topology.mjs',
    npmScript: 'stress:generate-topology',
    sourceFamily: 'topology-composition',
    distributionClass: 'topology-composition',
    scientificUse: 'cross-construction transfer/challenge, topology-sensitive acquisition, and parents whose geometry is not produced by generateWitness()',
    independenceNote: 'materially different construction process from both witness-first generators, subject to its narrower mechanic support',
    countMode: 'exact',
    defaultPrefix: 'T',
    unsupportedCommonFlags: ['append', 'envelopeCaps'],
    supportEnvelope: TOPOLOGY_GENERATION_SUPPORT,
  }),
});

export const GENERATION_SUITES = Object.freeze({
  triangulation: Object.freeze({
    id: 'triangulation',
    methods: ['targeted', 'random', 'topology'],
    use: 'construction-triangulation development: compare a hypothesis-driven source, a solver-blind witness-first source, and an independent topology-composition source without pooling their evidence identities',
    defaultEvidenceRoles: { targeted: 'development', random: 'development', topology: 'development' },
  }),
  'transfer-pair': Object.freeze({
    id: 'transfer-pair',
    methods: ['random', 'topology'],
    use: 'same-question confirmation/transfer pair: solver-blind witness-first material plus a materially different topology-composition challenge source',
    defaultEvidenceRoles: { random: 'confirmation', topology: 'transfer' },
  }),
  'witness-contrast': Object.freeze({
    id: 'witness-contrast',
    methods: ['targeted', 'random'],
    use: 'test whether an apparent effect depends on hypothesis-driven witness/decoration shaping while holding the broad witness-first construction family constant',
    defaultEvidenceRoles: { targeted: 'development', random: 'development' },
  }),
});

export function methodDescriptor(method) {
  const descriptor = GENERATION_METHODS[method];
  if (!descriptor) throw new Error(`unknown generation method: ${method}`);
  return descriptor;
}

export function suiteDescriptor(suite) {
  const descriptor = GENERATION_SUITES[suite];
  if (!descriptor) throw new Error(`unknown generation suite: ${suite}`);
  return descriptor;
}

export function normalizeMethodSelection({ method = null, methods = null, suite = null } = {}) {
  const supplied = [method ? 1 : 0, methods?.length ? 1 : 0, suite ? 1 : 0].reduce((a, b) => a + b, 0);
  if (supplied > 1) throw new Error('choose exactly one of --method, --methods, or --suite');
  let selected;
  if (suite) selected = [...suiteDescriptor(suite).methods];
  else if (methods?.length) selected = [...methods];
  else if (method) selected = [method];
  else throw new Error('supply --method=<id>, --methods=<a,b>, or --suite=<id>');
  const seen = new Set();
  const out = [];
  for (const id of selected) {
    methodDescriptor(id);
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export function sanitizeStem(value) {
  return String(value || 'adhoc')
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'adhoc';
}

export function plannedParentCount(method, requestedCount, targetedCountPerBatch = null) {
  const descriptor = methodDescriptor(method);
  if (!Number.isInteger(requestedCount) || requestedCount < 1) throw new Error('--count must be a positive integer');
  if (descriptor.countMode === 'exact') return requestedCount;
  const perBatch = targetedCountPerBatch == null ? Math.ceil(requestedCount / descriptor.batches) : targetedCountPerBatch;
  if (!Number.isInteger(perBatch) || perBatch < 1) throw new Error('--targeted-count-per-batch must be a positive integer');
  return perBatch * descriptor.batches;
}

export function defaultOutputPath({ method, questionId = null, outDir = null } = {}) {
  const stem = sanitizeStem(questionId || 'adhoc');
  const root = outDir || path.posix.join('tmp', 'research-generation', stem);
  return path.posix.join(root, `${method}.json`);
}

export function compileGeneratorInvocation({
  method,
  count,
  masterSeed,
  questionId = null,
  evidenceRole = null,
  blockId = null,
  out = null,
  outDir = null,
  idPrefix = null,
  verbose = false,
  envelopeCaps = false,
  append = false,
  targetedCountPerBatch = null,
  passthrough = [],
} = {}) {
  const descriptor = methodDescriptor(method);
  if (!Number.isFinite(masterSeed)) throw new Error('--master-seed must be numeric');
  if (blockId && !questionId) throw new Error('--block-id requires --question-id');
  if (evidenceRole) validateResearchEvaluationEvidenceRole(evidenceRole, { path: '--evidence-role' });
  if (append && questionId) throw new Error('--append cannot be combined with frozen question-bound generation');
  if (envelopeCaps && descriptor.unsupportedCommonFlags.includes('envelopeCaps')) {
    throw new Error(`--envelope-caps is not supported by ${method}`);
  }
  if (append && descriptor.unsupportedCommonFlags.includes('append')) {
    throw new Error(`--append is not supported by ${method}`);
  }

  const output = out || defaultOutputPath({ method, questionId, outDir });
  const args = [];
  if (descriptor.countMode === 'exact') {
    args.push(`--count=${count}`);
  } else {
    const perBatch = targetedCountPerBatch == null ? Math.ceil(count / descriptor.batches) : targetedCountPerBatch;
    if (!Number.isInteger(perBatch) || perBatch < 1) throw new Error('--targeted-count-per-batch must be a positive integer');
    args.push(`--count-per-batch=${perBatch}`);
  }
  args.push(`--master-seed=${masterSeed}`, `--out=${output}`, `--id-prefix=${idPrefix || descriptor.defaultPrefix}`);
  if (verbose) args.push('--verbose');
  if (envelopeCaps) args.push('--envelope-caps');
  if (append) args.push('--append');
  if (questionId) args.push(`--question-id=${questionId}`);
  if (evidenceRole) args.push(`--evidence-role=${evidenceRole}`);
  if (blockId) args.push(`--block-id=${blockId}`);
  args.push(...passthrough);

  return {
    method,
    script: descriptor.script,
    command: ['node', 'scripts/run-bundled.mjs', descriptor.script, '--', ...args],
    output,
    requestedParentCount: count,
    plannedParentCount: plannedParentCount(method, count, targetedCountPerBatch),
    sourceFamily: descriptor.sourceFamily,
    distributionClass: descriptor.distributionClass,
    supportEnvelope: descriptor.supportEnvelope ?? null,
    args,
  };
}

export function crossConstructionStatus(a, b) {
  const left = methodDescriptor(a);
  const right = methodDescriptor(b);
  return left.distributionClass === right.distributionClass ? 'same-construction-family' : 'cross-construction';
}

export function assessGenerationMethodSupport(method, { requiredMechanics = [] } = {}) {
  const descriptor = methodDescriptor(method);
  return generationSupportForMechanics(descriptor.supportEnvelope ?? null, requiredMechanics);
}

export function hybridGuidance() {
  return [
    {
      id: 'broad-then-family',
      stages: ['generate independent parents', 'freeze/select without solver-outcome acceptance', 'family-generate selected parents'],
      purpose: 'discover broadly, then use controlled descendants as a causal microscope',
      independence: 'parent/family remains the independent unit; descendants do not increase support count',
    },
    {
      id: 'matched-cross-construction',
      stages: ['generate/freeze >=2 source blocks', 'outcome-blind descriptor matching', 'run identical treatment/evaluation'],
      purpose: 'hold ordinary static descriptors near-constant while changing construction history',
      independence: 'keep source blocks and evidence roles separate; matching is selection provenance, not a new source',
    },
    {
      id: 'counterfactual-regeneration',
      stages: ['extract a prespecified structural hypothesis from development evidence', 'instantiate it independently in multiple source regimes', 'evaluate after populations freeze'],
      purpose: 'test whether a mechanism reproduces outside the source that nominated it',
      independence: 'do not filter generated parents by production-solver outcome',
    },
  ];
}
