/**
 * Shared parser for attemptConfigKey()'s canonical string format (see orchestration.ts) back into
 * an AttemptConfig — round-tripped through attemptConfigKey() again to confirm an exact match, so a
 * parser bug that silently builds the WRONG config is never invisible.
 *
 * Extracted from method-probe.mjs (2026-08-19) when scripts/technique-census.mjs needed the exact
 * same parsing — this is real, non-trivial logic (regex parsing + round-trip validation across
 * dfs/beam/repair/ida shapes), so it is a shared module rather than a second hand-maintained copy.
 * method-probe.mjs's own behavior is unchanged; this is a pure code move.
 *
 * Usage:
 *   import { makeAttemptConfigKeyParser } from './attempt-config-key.mjs';
 *   const parseAttemptConfigKey = makeAttemptConfigKeyParser({ TEMPLATES, POLICY_PROFILES, attemptConfigKey });
 *   const config = parseAttemptConfigKey('beam:intersectionHarvest@beam5000(diverse)');
 */

/** Builds the parser, closed over the solver's own template/profile registries and its
 *  attemptConfigKey() re-serializer — passed in rather than imported directly so this module stays
 *  a plain, dependency-free .mjs file callable from either a bundled (Solver.js) or TS-source
 *  import context. */
export function makeAttemptConfigKeyParser({ TEMPLATES, POLICY_PROFILES, attemptConfigKey }) {
    return function parseAttemptConfigKey(key) {
        const idaMatch = /^ida:([A-Za-z]+)(\(lds\))?$/.exec(key);
        if (idaMatch) {
            const [, profileName, ldsMarker] = idaMatch;
            const lds = !!ldsMarker;
            // 'none' is a sentinel, not a POLICY_PROFILES lookup: skips the soft-score tie-break
            // entirely (admissible-order-search.ts's rankByAdmissibleSlack gets tieBreakProfile:
            // null), reproducing the technique's original no-tie-break ordering. See
            // AttemptConfig.admissibleOrderNoTieBreak's own doc for why this exists.
            if (profileName === 'none') {
                const config = { profileName: 'none', template: null, admissibleOrder: true, admissibleOrderNoTieBreak: true, ...(lds ? { admissibleOrderLds: true } : {}) };
                const roundTrip = attemptConfigKey(config);
                if (roundTrip !== key) throw new Error(`"${key}" parsed to a config that re-serializes as "${roundTrip}" — parser/format mismatch, refusing to guess.`);
                return config;
            }
            if (!POLICY_PROFILES[profileName]) throw new Error(`"${key}" references unknown profile "${profileName}" (this selects the soft-score tie-break profile — see admissible-order-search.ts). Run with --list-profiles for the vocabulary, or "ida:none" for no tie-break at all.`);
            const config = { profileName, template: null, admissibleOrder: true, ...(lds ? { admissibleOrderLds: true } : {}) };
            const roundTrip = attemptConfigKey(config);
            if (roundTrip !== key) throw new Error(`"${key}" parsed to a config that re-serializes as "${roundTrip}" — parser/format mismatch, refusing to guess.`);
            return config;
        }
        const m = /^(dfs|beam):([A-Za-z]+)(?:\/([A-Za-z]+))?(?:@beam(\d+))?(\(diverse\))?(:repair)?(\(mustTurnBiased\)|\(turnBiased\))?$/.exec(key);
        if (!m) throw new Error(`"${key}" is not a valid attemptConfigKey format. Run with --list-profiles/--list-templates for the vocabulary.`);
        const [, mode, profileName, templateId, beamWidth, diverse, repairMarker, biased] = m;
        if (mode === 'beam' && !beamWidth) throw new Error(`"${key}" says beam but has no @beamN width.`);
        if (mode === 'dfs' && beamWidth) throw new Error(`"${key}" says dfs but has a @beamN width (that's a beam key).`);
        if (templateId && !TEMPLATES[templateId]) throw new Error(`"${key}" references unknown template "${templateId}".`);
        if (profileName !== 'repair' && (repairMarker || biased)) throw new Error(`"${key}" has a repair marker but profileName isn't "repair".`);
        if (repairMarker === undefined && biased) throw new Error(`"${key}" has a biased marker without ":repair" — not a valid repair config.`);
        const config = {
            profileName,
            template: templateId ? TEMPLATES[templateId] : null,
            ...(beamWidth ? { beamWidth: Number(beamWidth) } : {}),
            ...(diverse ? { diverseBeam: true } : {}),
            ...(repairMarker ? { repair: true } : {}),
            ...(biased === '(mustTurnBiased)' ? { repairMustTurnBiased: true } : {}),
            ...(biased === '(turnBiased)' ? { repairTurnBiased: true } : {}),
        };
        const roundTrip = attemptConfigKey(config);
        if (roundTrip !== key) throw new Error(`"${key}" parsed to a config that re-serializes as "${roundTrip}" — parser/format mismatch, refusing to guess.`);
        return config;
    };
}
