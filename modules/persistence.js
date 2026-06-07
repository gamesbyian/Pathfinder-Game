export function installPersistence(APP) {
    APP.Persistence = (() => {
        const firebaseConfigRaw = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
        let auth = null;
        let db = null;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'pathfinder-standalone';
        let activeSyncUid = null;
        let cloudSyncUnsubs = [];
        let syncGeneration = 0;

        if (firebaseConfigRaw) {
            try {
                const config = JSON.parse(firebaseConfigRaw);
                firebase.initializeApp(config);
                auth = firebase.auth();
                db = firebase.firestore();
                db.settings({ experimentalAutoDetectLongPolling: true, merge: true });
            } catch (e) {
                console.warn('[Persistence] Firebase init failed; running in local-only mode.', e);
                auth = null;
                db = null;
            }
        }

        async function initAuth() {
            if (!auth) return;
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await auth.signInWithCustomToken(__initial_auth_token);
                } else {
                    await auth.signInAnonymously();
                }
            } catch (e) {
                console.warn('[Persistence] Auth sign-in failed; cloud sync disabled.', e);
            }
        }

        function sanitizeSessionPayload(raw, fallback = {}) {
            const levelCount = APP.LevelUtils.getRawLevels()?.length || 0;
            const maxIdx = Math.max(0, levelCount - 1);
            const fallbackTheme = (typeof fallback?.currentTheme === 'string' && APP.Themes.getTheme(fallback.currentTheme))
                ? fallback.currentTheme
                : (APP.State.ENGINE.runtime.currentTheme || 'classic');
            const fallbackLevel = Number.isInteger(fallback?.levelIdx) ? Math.max(0, fallback.levelIdx) : 0;

            const safeLevel = Number.isInteger(raw?.levelIdx)
                ? (levelCount > 0 ? Math.max(0, Math.min(raw.levelIdx, maxIdx)) : Math.max(0, raw.levelIdx))
                : fallbackLevel;
            const safeTheme = (typeof raw?.currentTheme === 'string' && APP.Themes.getTheme(raw.currentTheme))
                ? raw.currentTheme
                : fallbackTheme;
            const updatedAt = Number.isFinite(raw?.updatedAt) ? Math.max(0, Math.floor(raw.updatedAt)) : 0;
            return { levelIdx: safeLevel, currentTheme: safeTheme, updatedAt };
        }

        function getLocalSessionState() {
            try {
                const raw = localStorage.getItem(`pathfinder_session_${appId}`);
                if (!raw) return sanitizeSessionPayload({}, {});
                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                    console.warn('[Persistence] session payload is not an object, resetting.');
                    return sanitizeSessionPayload({}, {});
                }
                return sanitizeSessionPayload(parsed, {});
            } catch (e) {
                console.warn('[Persistence] Could not parse session state from localStorage; resetting.', e);
                return sanitizeSessionPayload({}, {});
            }
        }

        function clearCloudSyncListeners() {
            syncGeneration++;
            if (!cloudSyncUnsubs.length) return;
            for (const unsub of cloudSyncUnsubs) {
                try { if (typeof unsub === 'function') unsub(); } catch (e) {
                    console.warn('[Persistence] error tearing down cloud sync listener', e);
                }
            }
            cloudSyncUnsubs = [];
            activeSyncUid = null;
        }

        function syncProgress() {
            const localData = localStorage.getItem(`pathfinder_progress_${appId}`);
            if (localData) {
                try {
                    const parsed = JSON.parse(localData);
                    if (!Array.isArray(parsed)) throw new Error('progress payload is not an array');
                    APP.State.ENGINE.progressSet = new Set(parsed.filter(n => Number.isInteger(n) && n >= 0));
                    APP.Persistence.updateCompletionUI();
                } catch (e) {
                    console.warn('[Persistence] Could not parse local progress; starting fresh.', e);
                    APP.State.ENGINE.progressSet = new Set();
                    APP.Persistence.updateCompletionUI();
                }
            }

            const user = auth?.currentUser;
            if (!user || !db) {
                clearCloudSyncListeners();
                return;
            }

            if (activeSyncUid === user.uid && cloudSyncUnsubs.length > 0) return;
            clearCloudSyncListeners();

            const generation = ++syncGeneration;
            const userDataCollection = db.collection('artifacts').doc(appId).collection('users').doc(user.uid).collection('data');
            const progressDoc = userDataCollection.doc('levelProgress');
            const progressUnsub = progressDoc.onSnapshot((doc) => {
                if (generation !== syncGeneration) return;
                if (doc.exists) {
                    const data = doc.data();
                    const cloudSet = new Set(data.completedLevels || []);
                    APP.State.ENGINE.progressSet = new Set([...APP.State.ENGINE.progressSet, ...cloudSet]);
                    APP.Persistence.updateCompletionUI();
                    localStorage.setItem(`pathfinder_progress_${appId}`, JSON.stringify(Array.from(APP.State.ENGINE.progressSet)));
                }
            }, (err) => { console.warn('[Persistence] progress snapshot error', err); });

            const sessionDoc = userDataCollection.doc('sessionState');
            const sessionUnsub = sessionDoc.onSnapshot((doc) => {
                if (generation !== syncGeneration) return;
                if (!doc.exists) return;
                const data = doc.data() || {};
                const localSession = getLocalSessionState();
                const cloudSession = sanitizeSessionPayload(data, localSession);
                const nextSession = cloudSession.updatedAt > localSession.updatedAt ? cloudSession : localSession;
                localStorage.setItem(`pathfinder_session_${appId}`, JSON.stringify(nextSession));
            }, (err) => { console.warn('[Persistence] session snapshot error', err); });

            cloudSyncUnsubs = [progressUnsub, sessionUnsub].filter(fn => typeof fn === 'function');
            activeSyncUid = user.uid;
        }

        async function markLevelComplete(idx) {
            APP.State.ENGINE.progressSet.add(idx);
            APP.Persistence.updateCompletionUI();
            localStorage.setItem(`pathfinder_progress_${appId}`, JSON.stringify(Array.from(APP.State.ENGINE.progressSet)));

            const user = auth?.currentUser;
            if (user && db) {
                const progressDoc = db.collection('artifacts').doc(appId).collection('users').doc(user.uid).collection('data').doc('levelProgress');
                await progressDoc.set({ completedLevels: Array.from(APP.State.ENGINE.progressSet) }, { merge: true });
            }
        }

        function persistSessionState() {
            try {
                const payload = {
                    levelIdx: APP.State.ENGINE.levelIdx,
                    currentTheme: APP.State.ENGINE.runtime.currentTheme || 'classic',
                    updatedAt: Date.now()
                };
                localStorage.setItem(`pathfinder_session_${appId}`, JSON.stringify(payload));

                const user = auth?.currentUser;
                if (user && db) {
                    const sessionDoc = db.collection('artifacts').doc(appId).collection('users').doc(user.uid).collection('data').doc('sessionState');
                    sessionDoc.set(payload, { merge: true }).catch(err => {
                        console.warn('[Persistence] cloud session write failed', err);
                    });
                }
            } catch (e) {
                console.warn('[Persistence] persistSessionState failed', e);
            }
        }

        function applySessionState() {
            const localSession = getLocalSessionState();
            return { levelIdx: localSession.levelIdx, currentTheme: localSession.currentTheme };
        }

        function updateCompletionUI() {
            const isComplete = APP.State.ENGINE.progressSet.has(APP.State.ENGINE.levelIdx);
            const isPlayMode = APP.State.ENGINE.mode === APP.Core.PLAY;
            const isReview = APP.State.ENGINE.mode === APP.Core.REVIEW;
            let reviewDisplay = null;
            if (isReview) {
                const subs = APP.State.ENGINE.review.submissions;
                const idx = APP.State.ENGINE.review.currentIdx;
                reviewDisplay = subs.length > 0 ? `${idx + 1}/${subs.length}` : '0/0';
            }
            APP.UI.updateLevelDisplay(APP.State.ENGINE.levelIdx, isComplete && isPlayMode, reviewDisplay);
        }

        function waitForUser(timeoutMs = 8000) {
            if (!auth) return Promise.resolve(null);
            if (auth.currentUser) return Promise.resolve(auth.currentUser);
            return new Promise((resolve) => {
                const timer = setTimeout(() => { unsub(); resolve(null); }, timeoutMs);
                const unsub = auth.onAuthStateChanged((user) => {
                    if (!user) return; // keep waiting — sign-in still in progress
                    clearTimeout(timer);
                    unsub();
                    resolve(user);
                });
            });
        }

        // Firestore doesn't support nested arrays; encode each hint path as a JSON string.
        function encodeHints(levelData) {
            if (!Array.isArray(levelData?.hints) || !levelData.hints.length) return levelData;
            return { ...levelData, hints: levelData.hints.map(h => JSON.stringify(h)) };
        }

        function decodeHints(levelData) {
            if (!Array.isArray(levelData?.hints) || !levelData.hints.length) return levelData;
            return { ...levelData, hints: levelData.hints.map(h => typeof h === 'string' ? JSON.parse(h) : h) };
        }

        async function withTimeout(promise, timeoutMs, message) {
            return Promise.race([
                promise,
                new Promise((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs))
            ]);
        }

        function duplicateMatchFromDoc(doc, levelData, fingerprint, source) {
            const data = doc.data() || {};
            if (data.levelFingerprint === fingerprint) return { source, id: doc.id, fingerprint };
            const existingLevelData = decodeHints(data.levelData || {});
            if (existingLevelData && APP.LevelUtils.isSameLevelStructure(existingLevelData, levelData)) {
                return { source, id: doc.id, fingerprint };
            }
            return null;
        }

        async function findDuplicateLevel(levelData, options = {}) {
            if (!db) throw new Error('No Firebase connection');
            const { includePending = true } = options;
            const fingerprint = await APP.LevelUtils.getLevelFingerprint(levelData);
            const root = db.collection('artifacts').doc(appId);
            const warnings = [];
            const checkCollection = async (collectionName, source, canWarn = true) => {
                const collection = root.collection(collectionName);
                try {
                    const indexedSnapshot = await withTimeout(
                        collection.where('levelFingerprint', '==', fingerprint).limit(1).get(),
                        15000,
                        `Duplicate ${source} fingerprint query timed out`
                    );
                    for (const doc of indexedSnapshot.docs) {
                        const match = duplicateMatchFromDoc(doc, levelData, fingerprint, source);
                        if (match) return match;
                    }

                    const fullSnapshot = await withTimeout(
                        collection.get(),
                        15000,
                        `Duplicate ${source} legacy scan timed out`
                    );
                    for (const doc of fullSnapshot.docs) {
                        const match = duplicateMatchFromDoc(doc, levelData, fingerprint, source);
                        if (match) return match;
                    }
                } catch (e) {
                    console.warn(`[Persistence] duplicate ${source} check failed`, e);
                    if (canWarn) warnings.push(source);
                }
                return null;
            };

            if (includePending) {
                const pendingMatch = await checkCollection('submissions', 'pending');
                if (pendingMatch) return { duplicate: pendingMatch, fingerprint, warnings, checkedPending: true };
            }
            const approvedMatch = await checkCollection('published_levels', 'approved');
            if (approvedMatch) return { duplicate: approvedMatch, fingerprint, warnings, checkedPending: includePending };
            return { duplicate: null, fingerprint, warnings, checkedPending: includePending };
        }

        async function submitLevel(levelData, options = {}) {
            if (!db) throw new Error('No Firebase connection');
            const user = await waitForUser();
            if (!user) throw new Error('Not signed in');
            let levelFingerprint = options.levelFingerprint || await APP.LevelUtils.getLevelFingerprint(levelData);
            if (!options.skipDuplicateCheck) {
                const duplicateCheck = await findDuplicateLevel(levelData, { includePending: options.includePending !== false });
                levelFingerprint = duplicateCheck.fingerprint || levelFingerprint;
                if (duplicateCheck.duplicate) {
                    const sourceLabel = duplicateCheck.duplicate.source === 'approved' ? 'approved levels' : 'pending submissions';
                    const err = new Error(`Duplicate level found in ${sourceLabel}`);
                    err.code = 'duplicate-level';
                    err.duplicate = duplicateCheck.duplicate;
                    throw err;
                }
            }
            console.log('[Submit] Writing to Firestore as uid:', user.uid);
            const col = db.collection('artifacts').doc(appId).collection('submissions');
            await withTimeout(
                col.add({
                    levelData: encodeHints(levelData),
                    levelFingerprint,
                    fingerprintVersion: 1,
                    submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    submittedBy: user.uid
                }),
                20000,
                'Firestore write timed out after 20s — check network or Firebase rules'
            );
            console.log('[Submit] Firestore write acknowledged.');
        }

        async function loadPublishedLevels() {
            if (!db) return [];
            try {
                const snapshot = await Promise.race([
                    db.collection('artifacts').doc(appId).collection('published_levels')
                        .orderBy('sortOrder')
                        .get(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
                ]);
                return snapshot.docs.map(doc => decodeHints(doc.data().levelData)).filter(Boolean);
            } catch (e) {
                console.warn('[Persistence] loadPublishedLevels failed', e);
                return [];
            }
        }

        async function initAdminAuth() {
            if (!auth) throw new Error('No Firebase connection');
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            await auth.signInWithPopup(provider);
            const user = auth.currentUser;
            if (!user || user.email !== 'ianmakesjokes@gmail.com') {
                await auth.signOut();
                throw new Error('Access denied for ' + (user?.email || 'unknown account'));
            }
            return user;
        }

        async function loadSubmissions() {
            if (!db) return [];
            try {
                const snapshot = await db.collection('artifacts').doc(appId)
                    .collection('submissions')
                    .orderBy('submittedAt', 'asc')
                    .get();
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    levelData: decodeHints(doc.data().levelData || {}),
                    levelFingerprint: doc.data().levelFingerprint || null,
                    submittedAt: doc.data().submittedAt,
                    submittedBy: doc.data().submittedBy
                }));
            } catch (e) {
                console.warn('[Persistence] loadSubmissions failed', e);
                throw e;
            }
        }

        async function approveSubmission(submissionId, levelData, sortOrder) {
            if (!db) throw new Error('No Firebase connection');
            const levelFingerprint = await APP.LevelUtils.getLevelFingerprint(levelData);
            const batch = db.batch();
            const publishRef = db.collection('artifacts').doc(appId).collection('published_levels').doc();
            batch.set(publishRef, {
                levelData: encodeHints(levelData),
                levelFingerprint,
                fingerprintVersion: 1,
                approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                sortOrder
            });
            const subRef = db.collection('artifacts').doc(appId).collection('submissions').doc(submissionId);
            batch.delete(subRef);
            await batch.commit();
        }

        async function rejectSubmission(submissionId) {
            if (!db) throw new Error('No Firebase connection');
            await db.collection('artifacts').doc(appId).collection('submissions').doc(submissionId).delete();
        }

        return {
            initAuth,
            syncProgress,
            markLevelComplete,
            updateCompletionUI,
            hasConfig: !!firebaseConfigRaw,
            getCurrentUser: () => auth?.currentUser,
            persistSessionState,
            applySessionState,
            submitLevel,
            findDuplicateLevel,
            loadPublishedLevels,
            initAdminAuth,
            loadSubmissions,
            approveSubmission,
            rejectSubmission
        };
    })();
}
