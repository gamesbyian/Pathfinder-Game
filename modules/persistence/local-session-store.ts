// localStorage session state: current level index and theme.
// Also handles merging of incoming cloud session snapshots with local state.

// themeExists(id) is a validity predicate ("is this a known theme id?"). It is sourced from the
// leaf `data` service (data.getThemes()) rather than the themes registry, so persistence does not
// depend on themes — that's what lets persistence be constructed before themes (no
// themes↔persistence cycle; see app.js stage 2 and ADR 0008).
export function createLocalSessionStore(client: any, { getRawLevels, themeExists, getState }: any) {
    const { appId } = client;

    function sanitizeSessionPayload(raw: any, fallback: any = {}) {
        const levelCount = getRawLevels()?.length || 0;
        const maxIdx = Math.max(0, levelCount - 1);
        const fallbackTheme = (typeof fallback?.currentTheme === 'string' && themeExists(fallback.currentTheme))
            ? fallback.currentTheme
            : (getState().runtime.currentTheme || 'classic');
        const fallbackLevel = Number.isInteger(fallback?.levelIdx) ? Math.max(0, fallback.levelIdx) : 0;

        const safeLevel = Number.isInteger(raw?.levelIdx)
            ? (levelCount > 0 ? Math.max(0, Math.min(raw.levelIdx, maxIdx)) : Math.max(0, raw.levelIdx))
            : fallbackLevel;
        const safeTheme = (typeof raw?.currentTheme === 'string' && themeExists(raw.currentTheme))
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

    function persistSessionState() {
        try {
            const payload = {
                levelIdx:     getState().levelIdx,
                currentTheme: getState().runtime.currentTheme || 'classic',
                updatedAt:    Date.now(),
            };
            localStorage.setItem(`pathfinder_session_${appId}`, JSON.stringify(payload));

            const user = client.auth?.currentUser;
            if (user && client.db) {
                const sessionDoc = client.db
                    .collection('artifacts').doc(appId)
                    .collection('users').doc(user.uid)
                    .collection('data').doc('sessionState');
                sessionDoc.set(payload, { merge: true }).catch((err: any) => {
                    console.warn('[Persistence] cloud session write failed', err);
                });
            }
        } catch (e) {
            console.warn('[Persistence] persistSessionState failed', e);
        }
    }

    function applySessionState() {
        const local = getLocalSessionState();
        return { levelIdx: local.levelIdx, currentTheme: local.currentTheme };
    }

    // Called by progress-store's session snapshot listener to merge
    // incoming cloud state with the current local state.
    function handleCloudSessionSnapshot(data: any) {
        const localSession  = getLocalSessionState();
        const cloudSession  = sanitizeSessionPayload(data, localSession);
        const nextSession   = cloudSession.updatedAt > localSession.updatedAt ? cloudSession : localSession;
        localStorage.setItem(`pathfinder_session_${appId}`, JSON.stringify(nextSession));
    }

    return { getLocalSessionState, persistSessionState, applySessionState, handleCloudSessionSnapshot };
}
