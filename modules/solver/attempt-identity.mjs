/**
 * Canonical attempt/config identity formatter shared by live AttemptConfig and persisted Attempt
 * consumers. Plain .mjs keeps it importable by both TS/tsx code and plain-node scripts.
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
