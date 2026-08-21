/**
 * Canonical attempt/config identity string format — the ONE implementation of the
 * `dfs:<profile>/<template>@beam<N>(diverse):repair(mustTurnBiased)` / `ida:<profile>(lds)`
 * grammar every solver-family attempt key uses. `orchestration.ts`'s `attemptConfigKey` (keyed
 * off a live AttemptConfig) and `scripts/portfolio-solve-sweep-lib.mjs`'s `attemptConfigKey`
 * (keyed off a persisted Attempt record) both call `formatAttemptIdentityKey` with their own
 * input normalized to `AttemptIdentityFields` — the string-building logic itself now lives in
 * exactly one place, closing the drift `scripts/portfolio-solve-sweep-lib.mjs`'s own historical
 * comments document (a missing admissibleOrder branch, then a missing repairTurnBiased suffix,
 * each shipped once as a second hand-maintained copy fell out of sync with this file's own).
 *
 * A plain, dependency-free .mjs file (JSDoc-typed, `allowJs`/`checkJs` in tsconfig.json cover it)
 * rather than a .ts source — same reason scripts/attempt-config-key.mjs is plain .mjs: this needs
 * to be importable by its OWN real extension from `scripts/portfolio-solve-sweep-lib.mjs`, which
 * runs under plain `node` in several test:node entries (no tsx/TS-source resolution available
 * there), as well as from orchestration.ts (bundled/tsx-resolved TS source).
 *
 * `scripts/attempt-config-key.mjs`'s parser already treats this format as canonical (round-trips
 * every parse back through `attemptConfigKey` to confirm an exact match) — this module is the
 * producer side of that same contract.
 *
 * @typedef {Object} AttemptIdentityFields
 * @property {string} profileName
 * @property {string | null} templateId
 * @property {number | null} [beamWidth]
 * @property {boolean} [diverseBeam]
 * @property {boolean} [repair]
 * @property {boolean} [repairMustTurnBiased]
 * @property {boolean} [repairTurnBiased]
 * @property {boolean} [admissibleOrder]
 * @property {boolean} [admissibleOrderNoTieBreak]
 * @property {boolean} [admissibleOrderLds]
 */

/** @param {AttemptIdentityFields} fields @returns {string} */
export function formatAttemptIdentityKey(fields) {
    if (fields.admissibleOrder) {
        const base = fields.admissibleOrderNoTieBreak ? 'ida:none' : `ida:${fields.profileName}`;
        return fields.admissibleOrderLds ? `${base}(lds)` : base;
    }
    const mode = fields.beamWidth ? 'beam' : 'dfs';
    const template = fields.templateId ? `/${fields.templateId}` : '';
    const beam = fields.beamWidth ? `@beam${fields.beamWidth}` : '';
    const diverse = fields.diverseBeam ? '(diverse)' : '';
    const repair = fields.repair ? ':repair' : '';
    const biased = fields.repairMustTurnBiased ? '(mustTurnBiased)' : fields.repairTurnBiased ? '(turnBiased)' : '';
    return `${mode}:${fields.profileName}${template}${beam}${diverse}${repair}${biased}`;
}
