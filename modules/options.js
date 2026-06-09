export function installOptions(APP) {
    APP.Options = (() => {
        const defaults = { muted: true, removeGeese: false, removeFalseGoals: false, removeDeadGates: false };
        let settings = { ...defaults };
        const storageKey = () => `pathfinder_options_${typeof __app_id !== 'undefined' ? __app_id : 'pathfinder-standalone'}`;
        const readSettingsFromStorage = () => {
            try {
                const raw = localStorage.getItem(storageKey());
                const parsed = raw ? JSON.parse(raw) : {};
                settings = { ...defaults, ...Object.fromEntries(Object.keys(defaults).map(k => [k, !!parsed?.[k]])) };
            } catch (_) { settings = { ...defaults }; }
            APP.State.ENGINE.muted = settings.muted;
            return settings;
        };
        const writeSettingsToStorage = () => {
            try { localStorage.setItem(storageKey(), JSON.stringify(settings)); } catch (_) {}
        };
        const getSettings = () => ({ ...settings });
        const applySettingsToControls = () => {
            const map = { optMuteToggle: 'muted', optRemoveGeese: 'removeGeese', optRemoveFalseGoals: 'removeFalseGoals', optRemoveDeadGates: 'removeDeadGates' };
            Object.entries(map).forEach(([id, key]) => { const el = document.getElementById(id); if (el) el.checked = !!settings[key]; });
            const slash = document.getElementById('muteSlash');
            if (slash) slash.style.display = settings.muted ? 'block' : 'none';
        };
        const reloadPlayLevelIfNeeded = () => {
            if (APP.State.ENGINE.mode === APP.Core.PLAY && APP.State.ENGINE.level) APP.Engine.loadLevel(APP.State.ENGINE.levelIdx, { keepVariant: true });
        };
        const setSetting = (key, value, { reload = true } = {}) => {
            if (!(key in defaults)) return;
            settings[key] = !!value;
            if (key === 'muted') APP.State.ENGINE.muted = settings.muted;
            writeSettingsToStorage();
            applySettingsToControls();
            if (reload && key !== 'muted') reloadPlayLevelIfNeeded();
        };
        const applyPlayModeLevelFilters = (level) => {
            const l = APP.LevelUtils.deepCloneLevel(level);
            if (settings.removeGeese) l.gooseSet = new Set();
            if (settings.removeFalseGoals) l.falseGoalKeys = new Set();
            if (settings.removeDeadGates) {
                const dead = APP.LevelUtils.getParityInvalidGateKeys(l);
                const original = l.gateKeys.slice();
                const filtered = original.filter(k => !dead.has(k));
                l.gateKeys = filtered.length ? filtered : original;
            }
            return l;
        };
        const init = () => {
            readSettingsFromStorage();
            ['optMuteToggle','optRemoveGeese','optRemoveFalseGoals','optRemoveDeadGates'].forEach(id => {
                const el = document.getElementById(id); if (!el) return;
                const key = { optMuteToggle:'muted', optRemoveGeese:'removeGeese', optRemoveFalseGoals:'removeFalseGoals', optRemoveDeadGates:'removeDeadGates' }[id];
                el.addEventListener('change', () => setSetting(key, el.checked));
            });
            applySettingsToControls();
        };
        return { init, getSettings, setSetting, applySettingsToControls, readSettingsFromStorage, writeSettingsToStorage, applyPlayModeLevelFilters };
    })();
}
