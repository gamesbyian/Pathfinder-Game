// Canonical shape for a level's own provenance record: an append-only history of every known
// origin/modification event, plus a derived summary. Lives directly on the level object
// (alongside grid/requiredLength/hints) rather than in a side document, so it travels with the level
// through editor -> submission -> review -> publish the same way the level's own data does.
//
// Mirrors hint-types.ts's design language deliberately: an append-only entry list (never
// overwritten — "a human edited an AI-generated level" is two entries, not a relabeled one),
// explicit values over omission (an unknown actor/method is the literal string 'unknown'/null,
// never a missing key that could be misread as "not applicable").

/** Who/what produced one entry in a level's provenance history. */
export type LevelProvenanceActor = 'human' | 'ai' | 'procedural' | 'unknown';

/** Summary origin across a whole history — 'hybrid' when more than one actor appears. */
export type LevelProvenanceOrigin = 'human' | 'ai' | 'procedural' | 'hybrid' | 'unknown';

export type LevelProvenanceConfidence = 'certain' | 'likely' | 'unverified';

export interface LevelProvenanceEntry {
    actor: LevelProvenanceActor;
    /** e.g. 'authored', 'edited', 'generated', 'submitted', 'reviewed-approved', 'rotated', 'mirrored'. */
    action: string;
    /** Generator/tool identifier, e.g. 'stress-witness-generator'; null for a human actor or when unknown. */
    method: string | null;
    /** Free-form extra context — e.g. a stress-corpus level's generation batch/theory/seed. */
    detail: Record<string, unknown> | null;
    /** ISO 8601 timestamp of this entry. */
    timestamp: string;
}

export interface LevelProvenance {
    /** Oldest first. Never rewritten — a later event is always appended, never replaces an earlier one. */
    history: LevelProvenanceEntry[];
    /** Derived from history: the origin entry's actor, or 'hybrid' if more than one distinct actor
     *  appears anywhere in history, or 'unknown' if history is empty. */
    origin: LevelProvenanceOrigin;
    confidence: LevelProvenanceConfidence;
}

export function makeProvenanceEntry(
    actor: LevelProvenanceActor,
    action: string,
    opts: { method?: string | null; detail?: Record<string, unknown> | null; timestamp?: string } = {},
): LevelProvenanceEntry {
    return {
        actor,
        action,
        method: opts.method ?? null,
        detail: opts.detail ?? null,
        timestamp: opts.timestamp ?? new Date().toISOString(),
    };
}

/** Derives origin from a history array: the first entry's actor, or 'hybrid' if later entries
 *  introduce a different actor, or 'unknown' if history is empty. */
export function deriveOrigin(history: LevelProvenanceEntry[]): LevelProvenanceOrigin {
    if (!history.length) return 'unknown';
    const actors = new Set(history.map(e => e.actor));
    if (actors.size === 1) return history[0].actor;
    return 'hybrid';
}

export function makeLevelProvenance(
    history: LevelProvenanceEntry[],
    confidence: LevelProvenanceConfidence = 'certain',
): LevelProvenance {
    return { history, origin: deriveOrigin(history), confidence };
}

/** Appends a new entry to an existing (or absent) provenance record, re-deriving origin. Never
 *  mutates the input — a fresh object is always returned, and the input's history is copied.
 *  A genuinely missing `existing` (every real level should already carry one per the provenance
 *  invariant — see CLAUDE.md's "Provenance" section) is treated as unverified, not 'certain': we
 *  only actually know about the single entry being appended here, nothing about what came before
 *  it, so claiming certainty would overstate what this call site can actually attest to. */
export function appendProvenanceEntry(existing: LevelProvenance | null | undefined, entry: LevelProvenanceEntry): LevelProvenance {
    const history = [...(existing?.history ?? []), entry];
    return { history, origin: deriveOrigin(history), confidence: existing ? existing.confidence : 'unverified' };
}

/** A level with no known provenance at all (e.g. very old data pre-dating this schema). Explicit
 *  'unknown'/'unverified' rather than omitting the field, so "we don't know" is never confused
 *  with "not yet checked". */
export function unknownLevelProvenance(): LevelProvenance {
    return { history: [], origin: 'unknown', confidence: 'unverified' };
}
