// Supplemental hints for a level published in the local levels.json corpus (as opposed to a
// Firestore published_levels doc) — see docs/firestore-security-model.md and CLAUDE.md's
// Provenance section. Keyed by the level's fingerprint (domain/level-fingerprint.ts), the same
// identity mechanism already used for submission/publish duplicate detection and Dev-Mode level
// ratings. One Firestore doc per distinct discovered path, under
// artifacts/{appId}/local_level_hints/{fingerprint}/entries/{entryId}.
import { collection, doc, getDocs, getCountFromServer, setDoc, Timestamp } from 'firebase/firestore';
import { toHint, mergeHints, upgradeProvenanceEntry, type Hint, type HintProvenanceEntry } from '../domain/hint-types.js';

const MAX_HINTS_PER_LEVEL = 5000;

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
    const entries = (fingerprint: string) =>
        collection(doc(client.db, 'artifacts', appId), 'local_level_hints', fingerprint, 'entries');

    /** All saved entries for a level, hydrated into canonical Hint[] (one provenance entry per
     *  Firestore doc, grouped by path signature — mirrors how the local per-level hint files
     *  store multiple discovery events for the same path). */
    async function getLocalLevelHints(fingerprint: string): Promise<Hint[]> {
        if (!client.db || !fingerprint) return [];
        const snapshot = await getDocs(entries(fingerprint));
        const hints: Hint[] = [];
        snapshot.forEach((snap: any) => {
            const data = snap.data() || {};
            if (!Array.isArray(data.path) || !data.provenance) return;
            hints.push(toHint(data.path, [upgradeProvenanceEntry(data.provenance)]));
        });
        return mergeHints([], hints);
    }

    /** Saves one newly-discovered path as its own entry, unless it's already known (locally or
     *  here — callers pass `alreadyKnownSignatures` covering both) or the level already has
     *  MAX_HINTS_PER_LEVEL saved. Best-effort, non-atomic count check: a soft cap on puzzle-hint
     *  data, not a security boundary, so a small overshoot under concurrent writes is acceptable
     *  (see docs/firestore-security-model.md). Propagates failures like every other repository
     *  function here — callers driving an invisible background save (rather than a submission
     *  flow already surfacing its own errors) are responsible for catching and reporting rather
     *  than letting a rejected promise go unhandled. */
    async function saveLocalLevelHintIfNovel(
        fingerprint: string,
        path: number[],
        pathSignature: string,
        provenance: HintProvenanceEntry,
        alreadyKnownSignatures: ReadonlySet<string>,
    ): Promise<boolean> {
        if (!client.db || !fingerprint) return false;
        if (alreadyKnownSignatures.has(pathSignature)) return false;
        const count = await getCountFromServer(entries(fingerprint));
        if (count.data().count >= MAX_HINTS_PER_LEVEL) return false;
        const entryId = hashPathSignature(pathSignature);
        await setDoc(doc(entries(fingerprint), entryId), {
            path,
            pathSignature,
            provenance,
            createdAt: Timestamp.now(),
        });
        return true;
    }

    return { getLocalLevelHints, saveLocalLevelHintIfNovel, hashPathSignature, MAX_HINTS_PER_LEVEL };
}
