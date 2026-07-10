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
    /** must-cross count ≥ this AND must-pass count ≥ REPAIR_MP_MIN: append the iterated-
     *  local-search repair fallback (repair-search.ts) as a final-resort attempt. Stress-corpus
     *  finding: on this feature regime, DFS/beam's deterministic best-first ordering accumulates
     *  a cumulative discrepancy (witness-trace measured 22–59) far past what any of three
     *  independent admissible-bound tightenings could close — see data/stress/README.md. Purely
     *  additive: it only ever runs after every earlier attempt in the bundle has already failed,
     *  so it cannot turn a currently-solving level into a failure. */
    REPAIR_MC_MIN: 2,
    /** must-pass count paired with REPAIR_MC_MIN. */
    REPAIR_MP_MIN: 3,
} as const;

/**
 * Beam widths, narrowest→widest. A narrow beam converges fast when the level allows it; WIDE is
 * the fallback that trades time for breadth. The must-cross+flipper-heavy rule below used to walk
 * WIDE→WIDER(15000)→WIDEST(50000, full-budget floor), but a dedicated isolated run proved
 * width-50000 *naturally exhausts* (not budget-cut) with zero solves on the exact archetype it
 * was built for (see data/stress/README.md's "beam search cannot solve the S031/S043 archetype at any
 * width" finding) — beam breadth was never the bottleneck for this cluster, and the iterated-
 * local-search repair fallback has since superseded it entirely (now catching every level that
 * currently matches this rule via its own early probe, before the main loop even runs). WIDER/
 * WIDEST were removed: zero attempts across the full stress+published corpora confirmed they
 * never even get reached anymore, and WIDEST's minBudgetFraction:1.0 was starving the two DFS
 * fallbacks that follow it of all their budget on the rare occasion it did run.
 */
const BEAM = { STANDARD: 2000, WIDE: 5000 } as const;

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
    mustTurn: number;
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
        mustTurn: level.mustPassTurnDirs?.size ?? 0,
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

/** See POLICY.REPAIR_MC_MIN/REPAIR_MP_MIN. Orchestration (solveLevel) gives this attempt its
 *  own reserved slice of the level's total time budget rather than the normal per-config even
 *  split, so it isn't diluted to near-nothing by however many attempts precede it.
 *
 *  Second clause (isHighInt + VERY_HIGH_REQINT, no must-pass/must-cross requirement): stress-
 *  corpus finding on mechanism-free high-intersection levels — DFS/beam's deterministic
 *  best-first ordering was the same blocker here as on the must-cross/must-pass cluster (beam
 *  self-terminates at any width without finding the structure; unbounded DFS needs roughly 2x
 *  the available budget to converge), confirmed by repairSearchFromGate solving two previously
 *  ~2x-budget-short mechanism-free levels in under a second each, dramatically faster than DFS's
 *  own ~28-40s. Reuses the same named VERY_HIGH_REQINT threshold the "wide beam first" rule
 *  above already uses for this archetype/difficulty regime — not a threshold invented for these
 *  two levels specifically. Purely additive and risk-free for every other level exactly as the
 *  must-cross/must-pass clause is: repair only ever runs after the entire existing bundle has
 *  already failed, so a level that solves via any earlier attempt is completely unaffected. */
const needsRepairFallback = (f: LevelFeatures): boolean =>
    (f.mustCross >= POLICY.REPAIR_MC_MIN && f.mustPass >= POLICY.REPAIR_MP_MIN)
    || (isHighInt(f) && f.reqInt >= POLICY.VERY_HIGH_REQINT);
const repairAttempt = (): AttemptConfig => ({ profileName: 'repair', template: null, repair: true });
/** A second repair attempt, appended only when the level has must-turn cells (so a level with
 *  none can never reach it) and only ever run after the ordinary repairAttempt above has already
 *  failed — see AttemptConfig.repairMustTurnBiased and data/stress/README.md's S043 writeup. */
const repairMustTurnBiasedAttempt = (): AttemptConfig => ({ profileName: 'repair', template: null, repair: true, repairMustTurnBiased: true });

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
        // Must-cross-threaded levels: the diverse beams are the ones that actually solve this
        // archetype (the plain WIDE beams never do — stress-corpus finding, same reasoning as
        // the non-portal sibling rule below) — put them first so the 0.35/0.25 minBudgetFraction
        // floors are computed against the full remaining budget instead of being squeezed by two
        // non-diverse beams that each burn a full even share first. Mirrors the shipped
        // diverse-beam-first reorder for the non-portal rule (see data/stress/README.md's S017
        // writeup); this rule had the same plain-beams-first ordering bug, just undiscovered
        // until a portal-dense + must-cross-threaded stress level (S049) surfaced it. No-op on
        // levels below POLICY.HIGHINT_MC_DIVERSE (mcDiverseThread returns [] there), so their
        // config list — and therefore their timing — is unchanged.
        why: 'very-high reqInt + portal-dense: objectiveFirst beam guides through portal transitions',
        when: f => isHighInt(f) && f.reqInt >= POLICY.VERY_HIGH_REQINT && f.portals >= POLICY.PORTAL_DENSE_PAIRS,
        build: f => [
            ...mcDiverseThread(f),
            beam('objectiveFirst', BEAM.WIDE), beam('intersectionHarvest', BEAM.WIDE),
            dfs('objectiveFirst'), dfs('intersectionHarvest'),
        ],
    },
    {
        // Must-cross-threaded levels: the diverse beams are the ones that actually solve this
        // archetype (the plain WIDE beams never do — stress-corpus finding) — put them first so
        // the 0.35/0.25 minBudgetFraction floors are computed against the full remaining budget
        // instead of being squeezed by two non-diverse beams that each burn a full even share first.
        why: 'very-high reqInt, non-portal: intersectionHarvest beam wins directly, DFS fallbacks follow',
        when: f => isHighInt(f) && f.reqInt >= POLICY.VERY_HIGH_REQINT,
        build: f => [
            ...mcDiverseThread(f),
            beam('intersectionHarvest', BEAM.WIDE), beam('objectiveFirst', BEAM.WIDE),
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
        why: 'must-cross + flipper-heavy with many objectives: diverse beam, then DFS fallbacks (see BEAM comment above — wider tiers removed, proven not to help this archetype)',
        when: f => isMustCross(f) && f.mustPass >= POLICY.OBJECTIVE_HEAVY_MUSTPASS && f.flippers >= POLICY.FLIPPER_HEAVY,
        build: () => [
            // Diverse beam buckets candidates by (flipperUsedMask, mustCrossMask) so all valid flipper
            // orderings stay alive. The repair fallback (attempts.ts's needsRepairFallback, always
            // present here — this rule's predicate implies it) now solves nearly everything in this
            // archetype via its own early probe before this main loop even runs.
            beam('intersectionHarvest', BEAM.WIDE, null, { diverseBeam: true }),
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
    let configs: AttemptConfig[] | null = null;
    for (const rule of ATTEMPT_POLICY) {
        if (rule.when(f)) { configs = rule.build(f); break; }
    }
    // Unreachable: the last rule matches everything. Kept for total-function safety.
    if (!configs) configs = ATTEMPT_POLICY[ATTEMPT_POLICY.length - 1].build(f);
    // Applied centrally (not per-rule) since the feature gate cuts across several archetypes
    // (must-cross-heavy and high-intersection-burden rules both match batch-B cluster levels —
    // see POLICY.REPAIR_MC_MIN/REPAIR_MP_MIN).
    if (!needsRepairFallback(f)) return configs;
    configs = [...configs, repairAttempt()];
    // The biased second attempt only ever runs after the ordinary repair attempt above has
    // already failed, and only exists in the list at all for must-turn levels — see
    // repairMustTurnBiasedAttempt.
    if (f.mustTurn > 0) configs = [...configs, repairMustTurnBiasedAttempt()];
    return configs;
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
        // Repair machinery flags: STRATEGY_REPAIR_FALLBACK drops both repair attempts (and with
        // them the early probe, which iterates the same configs); STRATEGY_REPAIR_MUSTTURN_BIAS
        // drops only the biased second attempt. Checked before the profile filter because the
        // repair profile is deliberately outside PROFILE_ORDER/PROFILE_CONFIG_KEY.
        if (c.repair && 'STRATEGY_REPAIR_FALLBACK' in cfg && !cfg.STRATEGY_REPAIR_FALLBACK) return false;
        if (c.repairMustTurnBiased && 'STRATEGY_REPAIR_MUSTTURN_BIAS' in cfg && !cfg.STRATEGY_REPAIR_MUSTTURN_BIAS) return false;
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
