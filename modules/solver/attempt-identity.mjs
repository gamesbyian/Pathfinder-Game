/**
 * Canonical solver identity formatters shared by live AttemptConfig and persisted Attempt consumers.
 * Plain .mjs keeps them importable by both TS/tsx code and plain-node scripts.
 *
 * `formatAttemptIdentityKey` is deliberately CONFIGURATION identity only. It stays stable and
 * parseable for existing tooling: profile/template/width/search-mode flags, but not ladder stage,
 * gate, budget, or repair PRNG seed.
 *
 * `formatAttemptActionKey` is the research/scheduler identity layered on top of that config key.
 * A stage can materially change the action's semantics (retry-stage ablation overrides and budget
 * policy), and repair seed salts are genuine deterministic search actions: R01936's salt-1 probe
 * solves where salt 0 does not. Gate and resource envelope remain separate telemetry dimensions,
 * rather than exploding the stable action vocabulary with level-specific gate keys or continuous
 * budget values.
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
 *
 * @typedef {AttemptIdentityFields & {stageId: string, seedSalt?: number}} AttemptActionIdentityFields
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

/**
 * Stable scheduler/research action identity. Budget envelope and gate are intentionally separate:
 * the same action can be measured at multiple work tranches and on multiple gates without being
 * mistaken for a different search behavior. Repair seed 0 is explicit so salt-0 and salt-1 rows
 * can never collapse merely because the historical Attempt convention omitted `seedSalt` for 0.
 *
 * @param {AttemptActionIdentityFields} fields
 * @returns {string}
 */
export function formatAttemptActionKey(fields) {
    if (!fields.stageId) throw new Error('formatAttemptActionKey requires stageId');
    const configKey = formatAttemptIdentityKey(fields);
    const seed = fields.repair ? `|seedSalt=${Number.isFinite(fields.seedSalt) ? Number(fields.seedSalt) : 0}` : '';
    return `${fields.stageId}|${configKey}${seed}`;
}
