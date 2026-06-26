export function getFirebaseRuntimeConfig({ getGlobal = () => globalThis }: { getGlobal?: () => any } = {}) {
    const root: any = getGlobal?.() || {};
    const firebaseConfigRaw = root.__firebase_config ?? null;
    const appId = root.__app_id || 'pathfinder-standalone';
    const adminUid = root.__admin_uid || null;
    const initialAuthToken = root.__initial_auth_token || null;
    return Object.freeze({ firebaseConfigRaw, appId, adminUid, initialAuthToken });
}
