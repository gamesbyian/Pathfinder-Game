/** Pure reducers for bounded solver work-ladder experiments (MO-004). */

function solvedSet(cell) {
    return new Set((cell.rows ?? cell.levels ?? []).filter(row => row.ok === true).map(row => String(row.id ?? row.levelId)));
}

export function analyzeWorkLadder(cells) {
    if (!Array.isArray(cells) || cells.length < 2) throw new Error('work ladder requires at least two cells');
    const sorted = [...cells].sort((a, b) => a.workBudget - b.workBudget);
    const budgets = sorted.map(cell => cell.workBudget);
    if (budgets.some(value => !Number.isFinite(value) || value <= 0) || new Set(budgets).size !== budgets.length) {
        throw new Error('work ladder budgets must be unique positive numbers');
    }
    const rowIds = sorted.map(cell => {
        const rows = cell.rows ?? cell.levels ?? [];
        const ids = rows.map(row => String(row.id ?? row.levelId));
        if (ids.some(id => id === 'undefined')) throw new Error('work ladder rows require id or levelId');
        if (new Set(ids).size !== ids.length) throw new Error('work ladder cells cannot contain duplicate row ids');
        return new Set(ids);
    });
    const referenceIds = rowIds[0];
    for (let index = 1; index < rowIds.length; index++) {
        const current = rowIds[index];
        if (current.size !== referenceIds.size
            || [...referenceIds].some(id => !current.has(id))) {
            throw new Error('work ladder cells must contain the identical row population at every budget');
        }
    }
    const sets = sorted.map(solvedSet);
    const steps = sorted.map((cell, index) => {
        if (index === 0) return {
            workBudget: cell.workBudget, solved: sets[index].size, gainedFromPrevious: null, lostFromPrevious: null,
        };
        const prior = sets[index - 1], current = sets[index];
        return {
            workBudget: cell.workBudget,
            solved: current.size,
            gainedFromPrevious: [...current].filter(id => !prior.has(id)).sort(),
            lostFromPrevious: [...prior].filter(id => !current.has(id)).sort(),
        };
    });
    const allIds = new Set(sorted.flatMap(cell => (cell.rows ?? cell.levels ?? []).map(row => String(row.id ?? row.levelId))));
    const perLevel = [...allIds].sort().map(id => {
        const outcomes = sorted.map((cell, index) => ({
            workBudget: cell.workBudget,
            solved: sets[index].has(id),
        }));
        const firstSolved = outcomes.find(row => row.solved)?.workBudget ?? null;
        const monotone = outcomes.every((row, index) => index === 0 || !outcomes[index - 1].solved || row.solved);
        return { id, outcomes, firstSolvedWorkBudget: firstSolved, monotone };
    });
    return {
        schemaVersion: 1,
        budgets,
        steps,
        perLevel,
        nonMonotoneLevels: perLevel.filter(row => !row.monotone).map(row => row.id),
    };
}
