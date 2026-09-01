// Dev-Mode Play/Edit level-corpus switcher. Lets Dev Mode swap which levels Play/Edit serve —
// the published corpus (default), or either solver stress corpus (data/stress/ — see
// data/stress/README.md) — without ever fetching a stress corpus during normal player boot.
// Review Mode and submission/approval are untouched by this: they read from Firestore
// submissions/published_levels, never from this data service's level list, so switching the
// Play/Edit corpus can never affect what gets reviewed or published.
import { createDefaultHintsSource } from './data-asset-loaders.js';
import type { DataService } from './ports.js';

export interface DevCorpusConfig {
    id: string;
    label: string;
    basePath: string;
    levelsFile: string;
    hasHints: boolean;
    hintsDirName?: string;
}

export const DEV_CORPORA: DevCorpusConfig[] = [
    { id: 'published', label: 'Published', basePath: './data', levelsFile: 'levels.json', hasHints: true },
    { id: 'stress1', label: 'Stress Corpus 1 (hypothesis)', basePath: './data/stress', levelsFile: 'stress-levels.json', hasHints: true },
    // Shares basePath with corpus 1 but numbers levels independently, so its hints live in a
    // sibling `hints-random/` dir rather than colliding with corpus 1's `hints/` (see
    // scripts/level-data-io.mjs's hintsDirFor).
    { id: 'stress2', label: 'Stress Corpus 2 (random)', basePath: './data/stress', levelsFile: 'stress-levels-random.json', hasHints: true, hintsDirName: 'hints-random' },
];

async function fetchCorpusLevels(cfg: DevCorpusConfig, fetchImpl: any): Promise<any[]> {
    const response = await fetchImpl(`${cfg.basePath}/${cfg.levelsFile}`);
    if (!response?.ok) throw new Error(`Failed to load ${cfg.basePath}/${cfg.levelsFile}`);
    const parsed = await response.json();
    const levels = Array.isArray(parsed) ? parsed : parsed?.levels;
    return Array.isArray(levels) ? levels : [];
}

/**
 * Creates the switcher. `data` is the app's single DataService instance — switching re-ingests
 * its level list and repoints its hints source; nothing else in the app needs to know a switch
 * happened (Play/Edit re-read data.getLevels()/getHints() on their own next access).
 *
 * `getLocalLevelHints` (optional — omitted in tests/offline builds) is the Firestore
 * supplemental-hints lookup (modules/persistence/local-level-hints-repository.ts), wired ONLY for
 * the published corpus: the stress corpora aren't real published levels, so they never get a
 * Firestore hints merge regardless of this being provided.
 */
export function createDevCorpusSwitcher({ data, fetchImpl = globalThis?.fetch, getLocalLevelHints }: { data: DataService; fetchImpl?: any; getLocalLevelHints?: ((levelFingerprint: string) => Promise<any[]>) | null }) {
    let current = 'published';
    // Captured lazily, the first time we switch away from 'published' — so switching back
    // restores exactly what boot produced (including any Firestore-published levels already
    // appended this session via data.appendLevels) rather than re-fetching levels.json and
    // losing them.
    let publishedLevelsSnapshot: any[] | null = null;
    const publishedHintsSource = createDefaultHintsSource({ fetchImpl });

    async function switchTo(corpusId: string): Promise<void> {
        if (corpusId === current) return;
        const cfg = DEV_CORPORA.find((c) => c.id === corpusId);
        if (!cfg) throw new Error(`Unknown dev corpus: ${corpusId}`);

        if (current === 'published' && publishedLevelsSnapshot === null) {
            publishedLevelsSnapshot = data.getLevels();
        }

        // ingest() rebuilds its theme map from opts.themes on every call (it doesn't preserve
        // whatever it held before) — omitting it here would wipe themes to {} and crash the
        // renderer's th.canvasBg lookup, so re-supply the current themes on every level-only swap.
        const themes = data.getThemes();
        if (corpusId === 'published') {
            data.ingest({ levels: publishedLevelsSnapshot || [], themes });
            data.setHintsSource(publishedHintsSource);
            data.setFirestoreHintsSource(getLocalLevelHints ?? null);
        } else {
            const levels = await fetchCorpusLevels(cfg, fetchImpl);
            data.ingest({ levels, themes });
            data.setHintsSource(cfg.hasHints ? createDefaultHintsSource({ fetchImpl, basePath: cfg.basePath, hintsDirName: cfg.hintsDirName }) : null);
            data.setFirestoreHintsSource(null);
        }
        current = corpusId;
    }

    return { corpora: DEV_CORPORA, switchTo, getCurrent: () => current };
}
