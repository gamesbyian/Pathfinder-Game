import { detectArchetype, getNavigableDensity } from './archetype.js';
import { ATTEMPT_CONFIGS, PROFILE_ORDER, TEMPLATE_CONFIG_KEYS, TEMPLATES } from './policy.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { AblationConfig, AttemptConfig } from './types.js';

/**
 * Build ordered attempt configs for this level's archetype.
 * Template attempts lead (matches V1's winning strategy for most grid levels).
 */
export function getAttemptConfigs(level: NormalizedLevel): AttemptConfig[] {
    const arch = detectArchetype(level);
    // Walkable density: excludes blocks/geese/false-goals/gates — same formula as detectArchetype.
    const navDensity = getNavigableDensity(level);

    // Near-closure: the path is a near-loop — goal attraction dominates.
    // harvestThenFinish placed 2nd (after nearClosureRescue) to handle single-gate
    // near-closure levels without wasting budget on finishFirst/perimeterSweep.
    if (arch === 'near-closure') {
        const closureFirst = ['nearClosureRescue', 'harvestThenFinish', 'finishFirst', 'perimeterSweep',
            ...PROFILE_ORDER.filter(p => !['nearClosureRescue', 'harvestThenFinish', 'finishFirst', 'perimeterSweep'].includes(p))];
        return [
            ...closureFirst.map(p => ({ profileName: p, template: null })),
            ...ATTEMPT_CONFIGS.filter(c => c.template !== null),
        ];
    }

    // High-intersection: two sub-cases split by reqInt.
    if (arch === 'high-intersection-burden') {
        if (level.reqInt >= 7) {
            // Very high reqInt (≥7).
            // Beam search first for maximum budget; DFS fallbacks for the levels that
            // beam can't find directly (DFS intersectionHarvest can win outright there).
            // Portal-dense levels (≥2 portal pairs): objectiveFirst guides the beam
            // toward portal transitions better than pure intersection harvest.
            // Non-portal levels: intersectionHarvest bw=5000 wins directly.
            if ((level.portalMap?.size || 0) >= 2) {
                return [
                    { profileName: 'objectiveFirst',      template: null, beamWidth: 5000 },
                    { profileName: 'intersectionHarvest', template: null, beamWidth: 5000 },
                    { profileName: 'objectiveFirst',      template: null },
                    { profileName: 'intersectionHarvest', template: null },
                ];
            }
            return [
                { profileName: 'intersectionHarvest', template: null, beamWidth: 5000 },
                { profileName: 'objectiveFirst',      template: null, beamWidth: 5000 },
                { profileName: 'intersectionHarvest', template: null },
                { profileName: 'objectiveFirst',      template: null },
            ];
        }
        // Medium-high reqInt (<7).
        // A perimeter-template DFS (CW or CCW depending on layout) solves many of these
        // quickly. Beam variants are placed first so they receive the larger share of
        // budget; DFS fallbacks cover the cases that already pass via DFS.
        //
        // Long-path multi-gate levels (reqLen≥90 AND ≥2 gates) starve the leading perimeter
        // beam: the gate budget is divided by the gate count, and the even per-config share
        // then divides by the config count, so a winning perimeterCW beam that needs a few
        // seconds to walk a long path gets only ~budget/(gates·9) at the 30s default and
        // times out — even though it solves outright when given room. Give the two perimeter
        // beams a budget floor in this case so the proven winner completes. The floor is
        // gated on reqLen≥90 AND gates≥2 so the single-gate levels in this bucket keep their
        // even-share and their DFS fallbacks are not squeezed.
        const longMultiGate = level.reqLen >= 90 && (level.gateKeys?.length || 0) >= 2;
        const beamFloor = longMultiGate ? 0.45 : 0;

        // Near-Hamiltonian levels (navDensity ≥ 0.82): reqLen fills nearly all walkable
        // cells. Beam search fails to keep the correct path alive at w=2000 over the many
        // steps of densely-constrained space. Skip leading beams; use DFS with perimeter
        // template — both CW and CCW tried so a lucky direction wins quickly without
        // waiting for the other to time out.
        if (navDensity >= 0.82) {
            return [
                { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCW  },
                { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCCW },
                { profileName: 'objectiveFirst',      template: null                   },
                { profileName: 'intersectionHarvest', template: null                   },
                { profileName: 'knotBuilder',         template: null                   },
                { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCW,  beamWidth: 2000 },
                { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCCW, beamWidth: 2000 },
            ];
        }

        // Must-pass-heavy levels (≥3 must-pass): the solution path threads through
        // scattered objectives that perimeter sweeps can't find. Put objectiveFirst and
        // intersectionHarvest DFS before perimeterSweep DFS so the objective-directed
        // profiles get the budget rather than burning it on two perimeter timeouts first.
        const dfsOrder = level.mustPassKeys.length >= 3
            ? [
                { profileName: 'objectiveFirst',      template: null },
                { profileName: 'intersectionHarvest', template: null },
                { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCW  },
                { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCCW },
                { profileName: 'knotBuilder',         template: null },
              ]
            // Low-reqInt (≤4), no must-pass: CCW sweep first (wins on layouts where CW
            // times out; CW is tried second as fallback).
            // Higher reqInt or must-pass: CW first.
            : level.reqInt <= 4 && level.mustPassKeys.length === 0
            ? [
                { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCCW },
                { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCW  },
                { profileName: 'objectiveFirst',      template: null                   },
                { profileName: 'intersectionHarvest', template: null                   },
                { profileName: 'knotBuilder',         template: null                   },
              ]
            : [
                { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCW  },
                { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCCW },
                { profileName: 'objectiveFirst',      template: null                   },
                { profileName: 'intersectionHarvest', template: null                   },
                { profileName: 'knotBuilder',         template: null                   },
              ];

        return [
            { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCW,  beamWidth: 2000, minBudgetFraction: beamFloor },
            { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCCW, beamWidth: 2000, minBudgetFraction: beamFloor },
            { profileName: 'intersectionHarvest', template: null,                   beamWidth: 2000 },
            { profileName: 'objectiveFirst',      template: null,                   beamWidth: 2000 },
            ...dfsOrder,
        ];
    }

    // For portal-heavy levels, lead with portal profiles then templates
    if (arch === 'portal-heavy') {
        const portalFirst = ['portalFirstTransfer', 'portalCommitted',
            ...PROFILE_ORDER.filter(p => p !== 'portalFirstTransfer' && p !== 'portalCommitted')];
        return [
            ...portalFirst.map(p => ({ profileName: p, template: null })),
            ...ATTEMPT_CONFIGS.filter(c => c.template !== null),
        ];
    }

    // Must-cross-heavy: DFS first (corner/perimeter templates and the objective/must-cross
    // profiles solve the simpler MC levels fast). Beam fallbacks for the levels where all
    // DFS attempts fail: mustCrossFirst (strong wmc=2.4 pull toward diagonal MC cells),
    // objectiveFirst, perimeterCW.
    //
    // For levels with many must-pass constraints (≥3) the path is long, so beam sweeps need
    // a few seconds each to complete. With ~8 configs at the 30s budget that is enough for
    // the beam to finish. Beam width 2000: narrow enough for speed while still keeping the
    // correct path alive (flipper approach urgency in scoreMoveV2 makes the correct
    // approach-first path top-ranked).
    if (arch === 'must-cross-heavy') {
        if (level.mustPassKeys.length >= 3) {
            // Flipper-heavy levels (≥2 flipping filters) with many objectives need a wide-beam
            // intersectionHarvest as the sole config so it receives the full time budget.
            // Empirically a wide beam[50000] intersectionHarvest can solve these in ~20s; any
            // split reduces the per-attempt budget below that threshold and the level times out.
            if (level.flippingFilterMap.size >= 2) {
                // Progressive beam widening with diverse-beam selection for flipper-heavy levels
                // (many flippers + must-pass + must-cross). The diverse beam buckets candidates by
                // (flipperUsedMask, mustCrossMask) so all valid flipper orderings stay alive
                // even at narrow widths where a uniform beam would collapse to one mode.
                // bw=5000/15000 diverse: fast probes (~2s/~7s) that may solve outright.
                // bw=50000 fallback: full-budget non-diverse beam, proven to work.
                // DFS fallbacks consume any leftover budget if the beam finishes early.
                return [
                    { profileName: 'intersectionHarvest', template: null, beamWidth:  5000, diverseBeam: true },
                    { profileName: 'intersectionHarvest', template: null, beamWidth: 15000, diverseBeam: true },
                    { profileName: 'intersectionHarvest', template: null, beamWidth: 50000, minBudgetFraction: 1.0 },
                    { profileName: 'objectiveFirst',      template: null },
                    { profileName: 'intersectionHarvest', template: null },
                ];
            }
            return [
                { profileName: 'objectiveFirst',     template: null,                   beamWidth: 2000 },
                { profileName: 'mustCrossFirst',     template: null,                   beamWidth: 2000 },
                { profileName: 'perimeterSweep',     template: TEMPLATES.perimeterCCW, beamWidth: 2000 },
                { profileName: 'intersectionHarvest',template: null,                   beamWidth: 2000 },
                { profileName: 'harvestThenFinish',  template: null,                   beamWidth: 2000 },
                { profileName: 'knotBuilder',        template: null,                   beamWidth: 2000 },
                { profileName: 'objectiveFirst',     template: null },  // DFS fallback
                { profileName: 'intersectionHarvest',template: null },  // DFS fallback
            ];
        }
        // Heavy combined MC+MP burden (≥3 must-cross AND ≥2 must-pass, e.g. diagonal
        // arrangements): DFS perimeter templates fail to thread the combined constraints.
        // Lead with beam so the correct path is found without burning two DFS timeouts first.
        if (level.mustCrossKeys.length >= 3 && level.mustPassKeys.length >= 2) {
            return [
                { profileName: 'mustCrossFirst',    template: null,            beamWidth: 2000 },
                { profileName: 'objectiveFirst',    template: null,            beamWidth: 2000 },
                { profileName: 'perimeterSweep',    template: TEMPLATES.cornerHarvest         },
                { profileName: 'perimeterSweep',    template: TEMPLATES.perimeterCW           },
                { profileName: 'mustCrossFirst',    template: null                            },
                { profileName: 'objectiveFirst',    template: null                            },
                { profileName: 'harvestThenFinish', template: null                            },
                { profileName: 'perimeterSweep',    template: TEMPLATES.perimeterCW, beamWidth: 2000 },
            ];
        }
        // Template DFS first (solves simple MC levels fast: cornerHarvest and perimeterCW
        // templates), then beams before DFS profile attempts.
        return [
            { profileName: 'perimeterSweep',    template: TEMPLATES.cornerHarvest              },
            { profileName: 'perimeterSweep',    template: TEMPLATES.perimeterCW                },
            { profileName: 'mustCrossFirst',    template: null,            beamWidth: 2000 },
            { profileName: 'objectiveFirst',    template: null,            beamWidth: 2000 },
            { profileName: 'mustCrossFirst',    template: null                             },
            { profileName: 'objectiveFirst',    template: null                             },
            { profileName: 'harvestThenFinish', template: null                             },
            { profileName: 'perimeterSweep',    template: TEMPLATES.perimeterCW, beamWidth: 2000 },
        ];
    }

    // Default: template sweep first, then all profiles.
    // No-must-pass levels: CCW before CW (on large open grids CCW often wins where CW
    // times out). Must-pass levels: keep CW before CCW.
    const templateConfigs = level.mustPassKeys.length === 0
        ? [
            { profileName: 'perimeterSweep', template: TEMPLATES.cornerHarvest  },
            { profileName: 'perimeterSweep', template: TEMPLATES.perimeterCCW   },
            { profileName: 'perimeterSweep', template: TEMPLATES.perimeterCW    },
            { profileName: 'perimeterSweep', template: TEMPLATES.sideCommitment },
          ]
        : ATTEMPT_CONFIGS.filter(c => c.template !== null);
    return [
        ...templateConfigs,
        ...PROFILE_ORDER.map(p => ({ profileName: p, template: null })),
    ];
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
