import { createFirebaseClient }            from './persistence/firebase-client.js';
import { createLocalSessionStore }         from './persistence/local-session-store.js';
import { createProgressStore }             from './persistence/progress-store.js';
import { createLevelSubmissionRepository } from './persistence/level-submission-repository.js';
import { createReviewRepository }          from './persistence/review-repository.js';
import { isSameLevelStructure, getLevelFingerprint } from './domain/level-fingerprint.js';

export function createPersistence({ getState, getTheme, getRawLevels, onProgressChanged }) {
    const firebaseConfigRaw = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
    const appId             = typeof __app_id !== 'undefined' ? __app_id : 'pathfinder-standalone';

    // Thin APP-compatible shim so persistence sub-modules need no signature changes.
    const APP = {
        State:     { get ENGINE() { return getState(); } },
        Themes:    { getTheme: (id) => getTheme(id) },
        LevelUtils: { getRawLevels, isSameLevelStructure, getLevelFingerprint },
    };

    const client         = createFirebaseClient(firebaseConfigRaw, appId);
    const localSession   = createLocalSessionStore(client, APP);
    const progressStore  = createProgressStore(client, localSession, APP, onProgressChanged);
    const submissionRepo = createLevelSubmissionRepository(client, APP);
    const reviewRepo     = createReviewRepository(client, APP);

    return {
        initAuth:              client.initAuth,
        syncProgress:          progressStore.syncProgress,
        markLevelComplete:     progressStore.markLevelComplete,
        hasConfig:             client.hasConfig,
        getCurrentUser:        () => client.auth?.currentUser,
        persistSessionState:   localSession.persistSessionState,
        applySessionState:     localSession.applySessionState,
        submitLevel:           submissionRepo.submitLevel,
        findDuplicateLevel:    submissionRepo.findDuplicateLevel,
        loadPublishedLevels:   submissionRepo.loadPublishedLevels,
        listPublishedLevelDocs:reviewRepo.listPublishedLevelDocs,
        deletePublishedLevels: reviewRepo.deletePublishedLevels,
        initAdminAuth:         reviewRepo.initAdminAuth,
        loadSubmissions:       reviewRepo.loadSubmissions,
        approveSubmission:     reviewRepo.approveSubmission,
        rejectSubmission:      reviewRepo.rejectSubmission,
    };
}
