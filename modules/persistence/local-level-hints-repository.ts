// Supplemental hints for a level published in the local levels.json corpus (as opposed to a
// Firestore published_levels doc) — see firestore.rules and CLAUDE.md's
// Provenance section. Keyed by the level's fingerprint (domain/level-fingerprint.ts), the same
// identity mechanism already used for submission/publish duplicate detection and Dev-Mode level
// ratings. One Firestore doc per distinct (path, discovery-event, physical-occurrence set) observation -- see entryIdFor()'s own
// doc comment for why a path can have more than one -- under
// artifacts/{appId}/local_level_hints/{levelFingerprint}/entries/{entryId}.
import { collection, doc, getDocs, getCountFromServer, setDoc, Timestamp } from 'firebase/firestore';
import { toHint, mergeHints, upgradeProvenanceEntry, provenanceEventIdentity, provenanceEventKey, provenanceOccurrenceKey, provenanceEvidenceKeys, hintOccurrenceKey, type Hint, type HintProvenanceEntry } from '../domain/hint-types.js';

const MAX_HINTS_PER_LEVEL = 5000;

/** Bounded execution/run binding (docs/hint-evidence-execution-identity-storage-consolidation-
 *  plan.md section 4/W's Firestore layout item): each entry doc's ID is a composite of the path
 *  signature AND semantic discovery-event identity, plus a physical-occurrence suffix when known.
 *  A genuinely new discovery event for an already-known path gets its own sibling document. The
 *  same semantic event reacquired in a new run/attempt also gets an immutable sibling document for
 *  only that novel occurrence. Reads merge siblings through mergeHints()/dedupeProvenanceEntries(),
 *  so storage remains create-only while semantic event identity and physical occurrence lineage stay
 *  separate and idempotent. */
function entryIdFor(pathSignature: string, entry: HintProvenanceEntry, hash: (s: string) => string): string {
    const occurrenceKeys = (entry.occurrences ?? []).map(hintOccurrenceKey).sort();
    const occurrenceSuffix = occurrenceKeys.length > 0 ? `-${hash(JSON.stringify(occurrenceKeys))}` : '';
    return `${hash(pathSignature)}-${hash(provenanceEventIdentity(entry))}${occurrenceSuffix}`;
}

/** A rediscovery of an already-known PATH is no longer evidence-loss (see entryIdFor's own doc
 *  comment): only a true duplicate -- the exact same discovery EVENT with no new physical occurrence for the
 *  exact same path -- is refused, and it is refused because writing it again would
 *  be redundant, not because this backend structurally cannot represent it. Returning a
 *  discriminated outcome instead of a bare boolean still makes that redundant-duplicate case
 *  distinguishable from a real capacity refusal or a missing connection, rather than three
 *  different "nothing happened" cases collapsing into one false — see
 *  docs/hint-evidence-execution-identity-storage-consolidation-plan.md's Firestore section
 *  ("capacity/duplicate/failure outcomes must be distinguishable"). */
export type SaveLocalLevelHintOutcome =
    | { saved: true }
    | { saved: false; reason: 'no-connection' | 'duplicate-provenance-not-recorded' | 'capacity-reached' };

/** Short, deterministic, Firestore-doc-ID-safe digest of a path signature (FNV-1a, 32-bit,
 *  hex-encoded) — not a security boundary (collisions just produce a redundant-looking entry,
 *  never overwrite one — see firestore.rules), just a stable bucket so every client converges on
 *  the same doc ID for the same path without the ID growing with path length. */
function hashPathSignature(signature: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < signature.length; i++) {
        h ^= signature.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
}

export function createLocalLevelHintsRepository(client: any) {
    const { appId } = client;
    const entries = (levelFingerprint: string) =>
        collection(doc(client.db, 'artifacts', appId), 'local_level_hints', levelFingerprint, 'entries');

    /** All saved entries for a level, hydrated into canonical Hint[] (one provenance entry per
     *  Firestore doc; multiple docs may share the same path when more than one discovery event was
     *  recorded for it — mergeHints()/dedupeProvenanceEntries() already group those into one Hint
     *  with a combined, deduped provenance array, the same machinery every other multi-event
     *  provenance source in this codebase already relies on). */
    async function getLocalLevelHints(levelFingerprint: string): Promise<Hint[]> {
        if (!client.db || !levelFingerprint) return [];
        const snapshot = await getDocs(entries(levelFingerprint));
        const hints: Hint[] = [];
        snapshot.forEach((snap: any) => {
            const data = snap.data() || {};
            if (!Array.isArray(data.path) || !data.provenance) return;
            hints.push(toHint(data.path, [upgradeProvenanceEntry(data.provenance)]));
        });
        return mergeHints([], hints);
    }

    /** Saves one newly-observed path/event/occurrence payload as its own immutable entry. Callers
     *  pass `alreadyKnownEvidenceKeys`, containing the semantic event key plus any known atomic
     *  occurrence keys. Occurrence-bearing input is filtered to novel runId+runAttempt acquisitions;
     *  occurrence-less input dedupes at semantic-event grain. The level still has the
     *  MAX_HINTS_PER_LEVEL soft document cap; see SaveLocalLevelHintOutcome for why the "unless" cases return a distinguishable
     *  reason rather than a bare false. A NEW discovery event for an already-known path is not
     *  "already known" here — see entryIdFor()'s own doc comment. Best-effort, non-atomic count
     *  check: a soft cap on puzzle-hint data, not a security boundary, so a small overshoot under
     *  concurrent writes is acceptable (see firestore.rules). Propagates failures
     *  like every other repository function here — callers driving an invisible background save
     *  (rather than a submission flow already surfacing its own errors) are responsible for
     *  catching and reporting rather than letting a rejected promise go unhandled. */
    async function saveLocalLevelHintIfNovel(
        levelFingerprint: string,
        path: number[],
        pathSignature: string,
        provenance: HintProvenanceEntry,
        alreadyKnownEvidenceKeys: ReadonlySet<string>,
    ): Promise<SaveLocalLevelHintOutcome> {
        if (!client.db || !levelFingerprint) return { saved: false, reason: 'no-connection' };

        const eventKey = provenanceEventKey(pathSignature, provenance);
        const occurrences = provenance.occurrences ?? [];
        let provenanceToPersist = provenance;

        if (occurrences.length === 0) {
            if (alreadyKnownEvidenceKeys.has(eventKey)) {
                return { saved: false, reason: 'duplicate-provenance-not-recorded' };
            }
        } else {
            const novelOccurrences = occurrences.filter(
                occurrence => !alreadyKnownEvidenceKeys.has(provenanceOccurrenceKey(pathSignature, provenance, occurrence)),
            );
            if (novelOccurrences.length === 0) {
                return { saved: false, reason: 'duplicate-provenance-not-recorded' };
            }
            provenanceToPersist = { ...provenance, occurrences: novelOccurrences };
        }

        const count = await getCountFromServer(entries(levelFingerprint));
        if (count.data().count >= MAX_HINTS_PER_LEVEL) return { saved: false, reason: 'capacity-reached' };
        const entryId = entryIdFor(pathSignature, provenanceToPersist, hashPathSignature);
        await setDoc(doc(entries(levelFingerprint), entryId), {
            path,
            pathSignature,
            provenance: provenanceToPersist,
            createdAt: Timestamp.now(),
        });
        return { saved: true };
    }

    /** Exposed so callers (and this module's own emulator-backed boundary test) can independently
     *  compute the exact doc ID a save will use, without a second copy of entryIdFor's format. */
    const localHintEntryId = (pathSignature: string, provenance: HintProvenanceEntry) =>
        entryIdFor(pathSignature, provenance, hashPathSignature);

    const localHintEvidenceKeys = (pathSignature: string, provenance: HintProvenanceEntry) =>
        provenanceEvidenceKeys(pathSignature, provenance);

    return { getLocalLevelHints, saveLocalLevelHintIfNovel, hashPathSignature, localHintEntryId, localHintEvidenceKeys, MAX_HINTS_PER_LEVEL };
}
