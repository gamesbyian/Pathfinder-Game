import { createFirebaseClient }            from './persistence/firebase-client.js';
import { createLocalSessionStore }         from './persistence/local-session-store.js';
import { createProgressStore }             from './persistence/progress-store.js';
import { createLevelSubmissionRepository } from './persistence/level-submission-repository.js';
import { createReviewRepository }          from './persistence/review-repository.js';

export function installPersistence(APP) {
    APP.Persistence = (() => {
        const firebaseConfigRaw = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
        const appId             = typeof __app_id !== 'undefined' ? __app_id : 'pathfinder-standalone';

        const client         = createFirebaseClient(firebaseConfigRaw, appId);
        const localSession   = createLocalSessionStore(client, APP);
        const progressStore  = createProgressStore(client, localSession, APP, () => updateCompletionUI());
        const submissionRepo = createLevelSubmissionRepository(client, APP);
        const reviewRepo     = createReviewRepository(client, APP);

        function updateCompletionUI() {
            const isComplete = APP.State.ENGINE.progressSet.has(APP.State.ENGINE.levelIdx);
            const isPlayMode = APP.State.ENGINE.mode === APP.Core.PLAY;
            const isReview   = APP.State.ENGINE.mode === APP.Core.REVIEW;
            let reviewDisplay = null;
            if (isReview) {
                const subs = APP.State.ENGINE.review.submissions;
                const idx  = APP.State.ENGINE.review.currentIdx;
                reviewDisplay = subs.length > 0 ? `${idx + 1}/${subs.length}` : '0/0';
            }
            APP.UI.updateLevelDisplay(APP.State.ENGINE.levelIdx, isComplete && isPlayMode, reviewDisplay);
        }

        return {
            initAuth:              client.initAuth,
            syncProgress:          progressStore.syncProgress,
            markLevelComplete:     progressStore.markLevelComplete,
            updateCompletionUI,
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
    })();
}
