/** Offline, nominative cross-experiment response analysis (MO-006). */

const OUTCOME_VALUE = Object.freeze({ gain: 1, loss: -1, unchanged: 0 });

function normalizeExperiment(experiment) {
    if (!experiment?.id || !experiment?.ancestryKey || !Array.isArray(experiment.rows)) {
        throw new Error('each experiment requires id, ancestryKey, and rows');
    }
    const rows = new Map();
    for (const row of experiment.rows) {
        const id = String(row.id ?? row.levelId ?? '');
        if (!id) throw new Error(`${experiment.id}: row missing id`);
        if (!(row.outcome in OUTCOME_VALUE)) throw new Error(`${experiment.id}/${id}: outcome must be gain/loss/unchanged`);
        if (rows.has(id)) throw new Error(`${experiment.id}: duplicate row ${id}`);
        rows.set(id, row.outcome);
    }
    return { ...experiment, rows };
}

export function analyzeExperimentResponseCovariance(experiments, { minShared = 2 } = {}) {
    const normalized = experiments.map(normalizeExperiment);
    const pairs = [];
    for (let i = 0; i < normalized.length; i++) for (let j = i + 1; j < normalized.length; j++) {
        const left = normalized[i], right = normalized[j];
        const shared = [...left.rows.keys()].filter(id => right.rows.has(id));
        const ancestryIndependent = left.ancestryKey !== right.ancestryKey;
        let dot = 0, leftSq = 0, rightSq = 0, exactAgreement = 0;
        for (const id of shared) {
            const a = OUTCOME_VALUE[left.rows.get(id)], b = OUTCOME_VALUE[right.rows.get(id)];
            dot += a * b; leftSq += a * a; rightSq += b * b;
            if (a === b) exactAgreement++;
        }
        const cosine = leftSq && rightSq ? dot / Math.sqrt(leftSq * rightSq) : null;
        pairs.push({
            left: left.id,
            right: right.id,
            sharedRows: shared.length,
            ancestryIndependent,
            exactOutcomeAgreement: shared.length ? exactAgreement / shared.length : null,
            signedResponseCosine: cosine,
            eligibleNomination: ancestryIndependent && shared.length >= minShared && cosine != null,
        });
    }
    return {
        schemaVersion: 1,
        experiments: normalized.map(exp => ({ id: exp.id, ancestryKey: exp.ancestryKey, rows: exp.rows.size })),
        pairs,
        nominations: pairs.filter(pair => pair.eligibleNomination).sort((a, b) =>
            Math.abs(b.signedResponseCosine) - Math.abs(a.signedResponseCosine) || b.sharedRows - a.sharedRows),
        interpretation: 'Nominations are offline similarity signals only; shared ancestry is explicitly ineligible as independent support.',
    };
}
