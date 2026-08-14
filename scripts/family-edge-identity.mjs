const corpusOf = row => row?.parentCorpus ?? row?.corpus ?? null;
const parentOf = row => row?.parentId ?? row?.parentLevelId ?? null;
const variantOf = row => row?.variantId ?? row?.id ?? row?.levelId ?? row?.level;

/** Resolve one family result without allowing a namespaced row to leak across parent edges. */
export function findFamilyResultRow(rows, { parentCorpus = null, parentId, variantId }) {
    const exact = rows.filter(row => String(variantOf(row)) === String(variantId) &&
        String(parentOf(row)) === String(parentId) && String(corpusOf(row) ?? '') === String(parentCorpus ?? ''));
    if (exact.length > 1) throw new Error(`duplicate namespaced family result ${parentCorpus ?? ''}/${parentId}/${variantId}`);
    if (exact.length === 1) return exact[0];
    const legacy = rows.filter(row => String(variantOf(row)) === String(variantId) &&
        parentOf(row) == null && corpusOf(row) == null);
    if (legacy.length > 1) throw new Error(`ambiguous bare variant id ${variantId}`);
    return legacy[0] ?? null;
}
