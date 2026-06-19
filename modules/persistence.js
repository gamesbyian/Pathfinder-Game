import { createFirebaseClient }            from './persistence/firebase-client.js';
import { getFirebaseRuntimeConfig }         from './persistence/firebase-runtime-config.js';
import { createLocalSessionStore }         from './persistence/local-session-store.js';
import { createProgressStore }             from './persistence/progress-store.js';
import { createLevelSubmissionRepository } from './persistence/level-submission-repository.js';
import { createReviewRepository }          from './persistence/review-repository.js';
import { createLevelRatingRepository }     from './persistence/level-rating-repository.js';
import { isSameLevelStructure, getLevelFingerprint } from './domain/level-fingerprint.js';

export function createPersistence({
    getState,
    getTheme,
    getRawLevels,
    onProgressChanged,
    firebaseConfigRaw = undefined,
    appId = undefined,
    createClient = createFirebaseClient,
    firebaseClientOptions = {},
    getRuntimeConfig = getFirebaseRuntimeConfig,
}) {
    const runtimeConfig = getRuntimeConfig();
    const resolvedFirebaseConfigRaw = firebaseConfigRaw === undefined ? runtimeConfig.firebaseConfigRaw : firebaseConfigRaw;
    const resolvedAppId = appId === undefined ? runtimeConfig.appId : appId;
    const resolvedClientOptions = {
        initialAuthToken: runtimeConfig.initialAuthToken,
        ...firebaseClientOptions,
    };
    const client         = createClient(resolvedFirebaseConfigRaw, resolvedAppId, resolvedClientOptions);
    const localSession   = createLocalSessionStore(client, { getRawLevels, getTheme, getState });
    const progressStore  = createProgressStore(client, localSession, { getState }, onProgressChanged);
    const submissionRepo = createLevelSubmissionRepository(client, { isSameLevelStructure, getLevelFingerprint });
    const reviewRepo     = createReviewRepository(client, { getLevelFingerprint });
    const ratingRepo     = createLevelRatingRepository(client);

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
        approveHintAddition:   reviewRepo.approveHintAddition,
        rejectSubmission:      reviewRepo.rejectSubmission,
        loadLevelRating:       ratingRepo.loadLevelRating,
        saveLevelRating:       ratingRepo.saveLevelRating,
    };
}
