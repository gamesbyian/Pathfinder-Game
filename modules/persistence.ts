import { createFirebaseClient }            from './persistence/firebase-client.js';
import { getFirebaseRuntimeConfig }         from './persistence/firebase-runtime-config.js';
import { createLocalSessionStore }         from './persistence/local-session-store.js';
import { createProgressStore }             from './persistence/progress-store.js';
import { createLevelSubmissionRepository } from './persistence/level-submission-repository.js';
import { createReviewRepository }          from './persistence/review-repository.js';
import { createLevelRatingRepository }     from './persistence/level-rating-repository.js';
import { createLocalLevelHintsRepository } from './persistence/local-level-hints-repository.js';
import { isSameLevelStructure, getLevelFingerprint } from './domain/level-fingerprint.js';
import { defaultReportError } from './error-reporting.js';

export function createPersistence({
    getState,
    themeExists,
    getRawLevels,
    onProgressChanged,
    firebaseConfigRaw = undefined,
    appId = undefined,
    createClient = createFirebaseClient,
    firebaseClientOptions = {},
    getRuntimeConfig = getFirebaseRuntimeConfig,
    reportError = defaultReportError,
}: any) {
    const runtimeConfig = getRuntimeConfig();
    const resolvedFirebaseConfigRaw = firebaseConfigRaw === undefined ? runtimeConfig.firebaseConfigRaw : firebaseConfigRaw;
    const resolvedAppId = appId === undefined ? runtimeConfig.appId : appId;
    const resolvedClientOptions = {
        initialAuthToken: runtimeConfig.initialAuthToken,
        reportError,
        ...firebaseClientOptions,
    };
    const client         = createClient(resolvedFirebaseConfigRaw, resolvedAppId, resolvedClientOptions);
    const localSession   = createLocalSessionStore(client, { getRawLevels, themeExists, getState, reportError });
    const progressStore  = createProgressStore(client, localSession, { getState, reportError }, onProgressChanged);
    const submissionRepo = createLevelSubmissionRepository(client, { isSameLevelStructure, getLevelFingerprint, reportError });
    const ratingRepo     = createLevelRatingRepository(client);
    const localHintsRepo = createLocalLevelHintsRepository(client);
    const reviewRepo     = createReviewRepository(client, {
        getLevelFingerprint, reportError,
        getLocalLevelHints: localHintsRepo.getLocalLevelHints,
        saveLocalLevelHintIfNovel: localHintsRepo.saveLocalLevelHintIfNovel,
    });

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
        approveLocalHintAddition: reviewRepo.approveLocalHintAddition,
        rejectSubmission:      reviewRepo.rejectSubmission,
        loadLevelRating:       ratingRepo.loadLevelRating,
        saveLevelRating:       ratingRepo.saveLevelRating,
        getLocalLevelHints:       localHintsRepo.getLocalLevelHints,
        saveLocalLevelHintIfNovel: localHintsRepo.saveLocalLevelHintIfNovel,
    };
}
