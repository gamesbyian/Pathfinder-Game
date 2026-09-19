/**
 * Canonical derived termination/censoring classes for hint discovery provenance.
 *
 * Hint provenance stores a free-form historical termination string. This helper harmonizes the
 * censoring cases with compact failure evidence without rewriting stored events. The historical
 * exhaustive marker remains a successful completed-enumeration state, not an exhausted-negative
 * failure.
 */

export const HINT_TERMINATION_CLASSES = Object.freeze([
    'solved',
    'complete-enumeration',
    'node-limited',
    'work-limited',
    'deadline-truncated',
    'error',
    'unknown',
]);

export function classifyHintTermination(entryOrTermination) {
    const raw = typeof entryOrTermination === 'string'
        ? entryOrTermination
        : entryOrTermination?.search?.termination;
    const value = String(raw ?? '').trim().toLowerCase();

    if (!value || value === 'unknown') return 'unknown';
    if (value === 'exhaustive' || /complete[-_ ]?enumerat/u.test(value)) return 'complete-enumeration';
    if (value === 'solved' || value === 'success') return 'solved';
    if (/node[-_ ]?(limit|limited|budget|cap|capped|exhaust)/u.test(value)) return 'node-limited';
    if (/work[-_ ]?(limit|limited|budget|cap|capped|exhaust)/u.test(value)) return 'work-limited';
    if (/deadline|timeout|timed[-_ ]?out|wall[-_ ]?(limit|deadline)/u.test(value)) return 'deadline-truncated';
    if (/error|crash|exception|harness/u.test(value)) return 'error';
    return 'unknown';
}

export function summarizeHintTerminationClasses(hints) {
    const counts = Object.fromEntries(HINT_TERMINATION_CLASSES.map(value => [value, 0]));
    let events = 0;
    for (const hint of hints ?? []) {
        for (const entry of hint?.provenance ?? []) {
            events += 1;
            counts[classifyHintTermination(entry)] += 1;
        }
    }
    return { events, counts };
}
