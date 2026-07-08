import { detectArchetype, getNavigableDensity } from './archetype.js';
import { ATTEMPT_CONFIGS, PROFILE_ORDER, TEMPLATE_CONFIG_KEYS, TEMPLATES } from './policy.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { AblationConfig, AttemptConfig, StructuralTemplate } from './types.js';

/**
 * Attempt-policy selection is a **pure function of level features** — never of level identity.
 * The thresholds below name which search strategy suits which feature regime; each carries its
 * rationale. (`check:no-solver-level-numbers` forbids reintroducing level-number-keyed logic or
 * motivation, in code or comments.)
 */
const POLICY = {
    /** reqInt ≥ this needs a wide beam first — DFS can't harvest enough crossings greedily. */
    VERY_HIGH_REQINT: 7,
    /** portal pairs ≥ this → objectiveFirst guides the beam through portal transitions better than pure harvest. */
    PORTAL_DENSE_PAIRS: 2,
    /** navDensity ≥ this is near-Hamiltonian: beams collapse over the long dense walk, so DFS-perimeter leads. */
    NEAR_HAMILTONIAN_DENSITY: 0.82,
    /** reqLen ≥ this is a "long" path (a perimeter beam needs seconds to walk it). */
    LONG_PATH_REQLEN: 90,
    /** gate count ≥ this can starve a long-path beam via per-gate budget division (→ give it a floor). */
    MULTI_GATE: 2,
    /** budget floor for the two perimeter beams on long multi-gate levels so the proven winner completes. */
    LONG_MULTIGATE_BEAM_FLOOR: 0.45,
    /** must-pass count ≥ this: objective-directed profiles must lead (scattered objectives perimeter sweeps miss). */
    OBJECTIVE_HEAVY_MUSTPASS: 3,
    /** reqInt ≤ this (with no must-pass): try a CCW sweep before CW. */
    LOW_REQINT: 4,
    /** must-cross count ≥ this (paired with COMBO_MUSTPASS): beam leads over DFS-perimeter templates. */
    COMBO_MUSTCROSS: 3,
    /** must-pass count paired with COMBO_MUSTCROSS. */
    COMBO_MUSTPASS: 2,
    /** flipping-filter count ≥ this: a progressive diverse-beam ladder is the sole strategy. */
    FLIPPER_HEAVY: 2,
    /** must-cross count ≥ this on a medium-high-int level: plain narrow beams collapse to one
     *  structural mode (all survivors share the same crossing pattern) and the DFS fallbacks
     *  can't thread the weave either — a diverse WIDE beam, bucketed by flipper/must-cross
     *  state and budget-floored against ladder fragmentation, finds the threaded solution
     *  (stress-corpus finding on mechanic-interaction levels). */
    HIGHINT_MC_DIVERSE: 2,
} as const;

/**
 * Beam widths, narrowest→widest. A narrow beam converges fast when the level allows it; the wider
 * tiers are fallbacks that trade time for breadth. The progressive-widening ladder on the hardest
 * flipper+must-cross levels walks WIDE→WIDER→WIDEST, the last with a full-budget floor.
 */
const BEAM = { STANDARD: 2000, WIDE: 5000, WIDER: 15000, WIDEST: 50000 } as const;

/** The level features the attempt policy branches on (extracted once; the policy reads nothing else). */
interface LevelFeatures {
    arch: string;
    navDensity: number;
    reqInt: number;
    reqLen: number;
    gates: number;
    mustPass: number;
    mustCross: number;
    portals: number;
    flippers: number;
}

function extractFeatures(level: NormalizedLevel): LevelFeatures {
    return {
        arch: detectArchetype(level),
        // Walkable density: excludes blocks/geese/false-goals/gates — same formula as detectArchetype.
        navDensity: getNavigableDensity(level),
        reqInt: level.reqInt,
        reqLen: level.reqLen,
        gates: level.gateKeys?.length ?? 0,
        mustPass: level.mustPassKeys.length,
        mustCross: level.mustCrossKeys.length,
        portals: level.portalMap?.size ?? 0,
        flippers: level.flippingFilterMap?.size ?? 0,
    };
}

// ─── Config vocabulary ──────────────────────────────────────────────────────
// dfs(): a DFS attempt (no beamWidth). beam(): a beam attempt of the given width. Both take an
// optional template and extra fields (minBudgetFraction / diverseBeam). These replace the repeated
// inline object literals so each policy bundle reads as intent, not boilerplate.
const dfs = (profileName: string, template: StructuralTemplate | null = null): AttemptConfig => ({ profileName, template });
const beam = (
    profileName: string, beamWidth: number, template: StructuralTemplate | null = null,
    extra: { minBudgetFraction?: number; diverseBeam?: boolean } = {},
): AttemptConfig => ({ profileName, template, beamWidth, ...extra });

const { perimeterCW, perimeterCCW, cornerHarvest, sideCommitment } = TEMPLATES;

/** Lead profiles first, then the rest of PROFILE_ORDER, then the non-null template configs. */
function profilesFirst(lead: string[]): AttemptConfig[] {
    const order = [...lead, ...PROFILE_ORDER.filter(p => !lead.includes(p))];
    return [
        ...order.map(p => dfs(p)),
        ...ATTEMPT_CONFIGS.filter(c => c.template !== null),
    ];
}

/** High-intersection medium-reqInt DFS ordering: objective-directed vs perimeter-first, by feature. */
function mediumHighIntDfsOrder(f: LevelFeatures): AttemptConfig[] {
    if (f.mustPass >= POLICY.OBJECTIVE_HEAVY_MUSTPASS)
        // Scattered objectives perimeter sweeps can't find → objective-directed DFS before perimeter timeouts.
        return [dfs('objectiveFirst'), dfs('intersectionHarvest'), dfs('perimeterSweep', perimeterCW), dfs('perimeterSweep', perimeterCCW), dfs('knotBuilder')];
    if (f.reqInt <= POLICY.LOW_REQINT && f.mustPass === 0)
        // Low reqInt, no must-pass: CCW sweep first (wins on layouts where CW times out).
        return [dfs('perimeterSweep', perimeterCCW), dfs('perimeterSweep', perimeterCW), dfs('objectiveFirst'), dfs('intersectionHarvest'), dfs('knotBuilder')];
    return [dfs('perimeterSweep', perimeterCW), dfs('perimeterSweep', perimeterCCW), dfs('objectiveFirst'), dfs('intersectionHarvest'), dfs('knotBuilder')];
}

const isHighInt = (f: LevelFeatures) => f.arch === 'high-intersection-burden';
const isMustCross = (f: LevelFeatures) => f.arch === 'must-cross-heavy';

/** Diverse WIDE beams for must-cross-threaded high-int levels — see POLICY.HIGHINT_MC_DIVERSE.
 *  Budget floors keep them viable against per-gate/per-config ladder fragmentation. */
const mcDiverseThread = (f: LevelFeatures): AttemptConfig[] => f.mustCross >= POLICY.HIGHINT_MC_DIVERSE ? [
    beam('intersectionHarvest', BEAM.WIDE, null, { diverseBeam: true, minBudgetFraction: 0.35 }),
    beam('objectiveFirst', BEAM.WIDE, null, { diverseBeam: true, minBudgetFraction: 0.25 }),
] : [];

/** One attempt-policy rule: a feature predicate + the config bundle it selects. First match wins. */
interface PolicyRule { when: (f: LevelFeatures) => boolean; build: (f: LevelFeatures) => AttemptConfig[]; why: string; }

/**
 * The attempt policy as ordered, feature-guarded rules — evaluated top-to-bottom, first match wins.
 * Each rule's predicate references only {@link LevelFeatures}; later rules assume earlier ones did
 * not match (e.g. the must-cross rules all sit behind `isMustCross`, ending in a catch-all).
 */
const ATTEMPT_POLICY: PolicyRule[] = [
    {
        why: 'near-closure: near-loop, goal attraction dominates — closure/harvest profiles first',
        when: f => f.arch === 'near-closure',
        build: () => profilesFirst(['nearClosureRescue', 'harvestThenFinish', 'finishFirst', 'perimeterSweep']),
    },
    {
        why: 'very-high reqInt + portal-dense: objectiveFirst beam guides through portal transitions',
        when: f => isHighInt(f) && f.reqInt >= POLICY.VERY_HIGH_REQINT && f.portals >= POLICY.PORTAL_DENSE_PAIRS,
        build: f => [
            beam('objectiveFirst', BEAM.WIDE), beam('intersectionHarvest', BEAM.WIDE),
            ...mcDiverseThread(f),
            dfs('objectiveFirst'), dfs('intersectionHarvest'),
        ],
    },
    {
        why: 'very-high reqInt, non-portal: intersectionHarvest beam wins directly, DFS fallbacks follow',
        when: f => isHighInt(f) && f.reqInt >= POLICY.VERY_HIGH_REQINT,
        build: f => [
            beam('intersectionHarvest', BEAM.WIDE), beam('objectiveFirst', BEAM.WIDE),
            ...mcDiverseThread(f),
            dfs('intersectionHarvest'), dfs('objectiveFirst'),
        ],
    },
    {
        why: 'near-Hamiltonian: beams collapse over the long dense walk — DFS perimeter (both directions) leads',
        when: f => isHighInt(f) && f.navDensity >= POLICY.NEAR_HAMILTONIAN_DENSITY,
        build: () => [
            dfs('perimeterSweep', perimeterCW), dfs('perimeterSweep', perimeterCCW),
            dfs('objectiveFirst'), dfs('intersectionHarvest'), dfs('knotBuilder'),
            beam('perimeterSweep', BEAM.STANDARD, perimeterCW), beam('perimeterSweep', BEAM.STANDARD, perimeterCCW),
        ],
    },
    {
        why: 'medium-high reqInt: perimeter/objective beams first (budget-floored on long multi-gate levels), then feature-ordered DFS',
        when: isHighInt,
        build: f => {
            // Long multi-gate levels starve the leading perimeter beam (gate budget ÷ gates ÷ configs);
            // floor the two perimeter beams so the proven winner completes without squeezing DFS fallbacks.
            const beamFloor = (f.reqLen >= POLICY.LONG_PATH_REQLEN && f.gates >= POLICY.MULTI_GATE) ? POLICY.LONG_MULTIGATE_BEAM_FLOOR : 0;
            return [
                beam('perimeterSweep', BEAM.STANDARD, perimeterCW, { minBudgetFraction: beamFloor }),
                beam('perimeterSweep', BEAM.STANDARD, perimeterCCW, { minBudgetFraction: beamFloor }),
                // Must-cross-threaded: diverse WIDE beams right after the proven perimeter winners.
                ...mcDiverseThread(f),
                beam('intersectionHarvest', BEAM.STANDARD),
                beam('objectiveFirst', BEAM.STANDARD),
                ...mediumHighIntDfsOrder(f),
            ];
        },
    },
    {
        why: 'portal-heavy: portal-transfer profiles first, then templates',
        when: f => f.arch === 'portal-heavy',
        build: () => profilesFirst(['portalFirstTransfer', 'portalCommitted']),
    },
    {
        why: 'must-cross + flipper-heavy with many objectives: progressive diverse-beam ladder is the sole strategy',
        when: f => isMustCross(f) && f.mustPass >= POLICY.OBJECTIVE_HEAVY_MUSTPASS && f.flippers >= POLICY.FLIPPER_HEAVY,
        build: () => [
            // Diverse beam buckets candidates by (flipperUsedMask, mustCrossMask) so all valid flipper
            // orderings stay alive at narrow widths; the wide bw=50000 fallback gets the full budget.
            beam('intersectionHarvest', BEAM.WIDE, null, { diverseBeam: true }),
            beam('intersectionHarvest', BEAM.WIDER, null, { diverseBeam: true }),
            beam('intersectionHarvest', BEAM.WIDEST, null, { minBudgetFraction: 1.0 }),
            dfs('objectiveFirst'), dfs('intersectionHarvest'),
        ],
    },
    {
        why: 'must-cross, must-pass-heavy: objective/must-cross beams lead, DFS fallbacks follow',
        when: f => isMustCross(f) && f.mustPass >= POLICY.OBJECTIVE_HEAVY_MUSTPASS,
        build: () => [
            beam('objectiveFirst', BEAM.STANDARD), beam('mustCrossFirst', BEAM.STANDARD),
            beam('perimeterSweep', BEAM.STANDARD, perimeterCCW), beam('intersectionHarvest', BEAM.STANDARD),
            beam('harvestThenFinish', BEAM.STANDARD), beam('knotBuilder', BEAM.STANDARD),
            dfs('objectiveFirst'), dfs('intersectionHarvest'),
        ],
    },
    {
        why: 'heavy combined must-cross + must-pass: beam leads so the threaded path is found without two DFS timeouts',
        when: f => isMustCross(f) && f.mustCross >= POLICY.COMBO_MUSTCROSS && f.mustPass >= POLICY.COMBO_MUSTPASS,
        build: () => [
            beam('mustCrossFirst', BEAM.STANDARD), beam('objectiveFirst', BEAM.STANDARD),
            dfs('perimeterSweep', cornerHarvest), dfs('perimeterSweep', perimeterCW),
            dfs('mustCrossFirst'), dfs('objectiveFirst'), dfs('harvestThenFinish'),
            beam('perimeterSweep', BEAM.STANDARD, perimeterCW),
        ],
    },
    {
        why: 'must-cross default: template DFS solves simple MC levels fast, then beams, then DFS profiles',
        when: isMustCross,
        build: () => [
            dfs('perimeterSweep', cornerHarvest), dfs('perimeterSweep', perimeterCW),
            beam('mustCrossFirst', BEAM.STANDARD), beam('objectiveFirst', BEAM.STANDARD),
            dfs('mustCrossFirst'), dfs('objectiveFirst'), dfs('harvestThenFinish'),
            beam('perimeterSweep', BEAM.STANDARD, perimeterCW),
        ],
    },
    {
        why: 'default, no must-pass: CCW template before CW (open grids where CW times out), then profiles',
        when: f => f.mustPass === 0,
        build: () => [
            dfs('perimeterSweep', cornerHarvest), dfs('perimeterSweep', perimeterCCW),
            dfs('perimeterSweep', perimeterCW), dfs('perimeterSweep', sideCommitment),
            ...PROFILE_ORDER.map(p => dfs(p)),
        ],
    },
    {
        why: 'default: standard template sweep, then all profiles',
        when: () => true,
        build: () => [
            ...ATTEMPT_CONFIGS.filter(c => c.template !== null),
            ...PROFILE_ORDER.map(p => dfs(p)),
        ],
    },
];

/**
 * Build ordered attempt configs for this level, selected purely from level *features*
 * (see {@link ATTEMPT_POLICY}). First matching rule wins.
 */
export function getAttemptConfigs(level: NormalizedLevel): AttemptConfig[] {
    const f = extractFeatures(level);
    for (const rule of ATTEMPT_POLICY) if (rule.when(f)) return rule.build(f);
    // Unreachable: the last rule matches everything. Kept for total-function safety.
    return ATTEMPT_POLICY[ATTEMPT_POLICY.length - 1].build(f);
}


function shuffleAttemptConfigs(configs: AttemptConfig[], seed = 42): AttemptConfig[] {
    let state = (Number(seed) >>> 0) || 42;
    const out = [...configs];
    for (let i = out.length - 1; i > 0; i--) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        const j = state % (i + 1);
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

export function applyAttemptConfigOptions(baseConfigs: AttemptConfig[], cfg: AblationConfig | null = null): AttemptConfig[] {
    if (!cfg) return baseConfigs;
    const filtered = baseConfigs.filter(c => {
        if (c.template && c.template.id) {
            const tKey = TEMPLATE_CONFIG_KEYS[c.template.id];
            if (tKey && tKey in cfg && !cfg[tKey]) return false;
        }
        const pKey = `PROFILE_${c.profileName}`;
        if (pKey in cfg && !cfg[pKey]) return false;
        return true;
    });
    let configs = filtered.length > 0 ? filtered : baseConfigs;
    if (cfg.ATTEMPT_ORDER === 'reverse') {
        configs = [...configs].reverse();
    } else if (cfg.ATTEMPT_ORDER === 'random') {
        configs = shuffleAttemptConfigs(configs, cfg._randomSeed ?? 42);
    } else if (cfg.ATTEMPT_ORDER === 'profile-grouped') {
        configs = [
            ...configs.filter(c => !c.template && !c.beamWidth),
            ...configs.filter(c => !!c.template),
            ...configs.filter(c => c.beamWidth && !c.template),
        ];
    }
    return configs;
}

export function getConfiguredAttemptConfigs(level: NormalizedLevel, cfg: AblationConfig | null = null): AttemptConfig[] {
    return applyAttemptConfigOptions(getAttemptConfigs(level), cfg);
}
