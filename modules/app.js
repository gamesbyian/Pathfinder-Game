import { createSolverV2 }    from '../SolverV2.js';
import { createCore }        from './core.js';
import { createDebug }       from './debug.js';
import { createUI }          from './ui.js';
import { createData }        from './data.js';
import { createLoader }      from './loader.js';
import { createState }       from './state.js';
import { createRenderer }    from './renderer.js';
import { createEngine }      from './engine.js';
import { createEditor }      from './editor.js';
import { createPersistence } from './persistence.js';
import { createLevelUtils }  from './levelutils.js';
import { createThemes }      from './themes.js';
import { createInput }       from './input.js';
import { createBoot, createOnloadHandler } from './boot.js';
import { markDirty } from './state-actions.js';


export function createDefaultDataAssetLoader({ fetchImpl = globalThis?.fetch, basePath = './data' } = {}) {
    return async () => {
        if (typeof fetchImpl !== 'function') return null;
        const [levelsResponse, themesResponse] = await Promise.all([
            fetchImpl(`${basePath}/levels.json`),
            fetchImpl(`${basePath}/themes.json`),
        ]);
        if (!levelsResponse?.ok) throw new Error(`Failed to load ${basePath}/levels.json`);
        if (!themesResponse?.ok) throw new Error(`Failed to load ${basePath}/themes.json`);
        const [levels, themes] = await Promise.all([
            levelsResponse.json(),
            themesResponse.json(),
        ]);
        return { levels, themes };
    };
}

const DEFAULT_FACTORIES = {
    createSolverV2,
    createCore,
    createDebug,
    createUI,
    createData,
    createLoader,
    createState,
    createRenderer,
    createEngine,
    createEditor,
    createPersistence,
    createLevelUtils,
    createThemes,
    createInput,
    createBoot,
};

export function createApp({ factories = {}, dataSources = {}, persistenceSources = {}, dataAssetLoader = createDefaultDataAssetLoader() } = {}) {
    const f = { ...DEFAULT_FACTORIES, ...factories };
    const core  = f.createCore();
    const state = f.createState({ core });

    // Wire muted provider so SOUND_BUS reads the live state flag.
    core.SOUND_BUS.setMutedProvider(() => state.ENGINE.muted);

    const solverV2 = f.createSolverV2();

    // data and themes mutually lazy — themes reads data via getter, data reads
    // themes registry for genre metadata via getter.
    let _themes;
    const data = f.createData({
        deepClone: core.deepClone,
        getThemes: () => _themes?.THEMES,
        ...dataSources,
    });

    // UI needs renderer (via getter) and state.
    let _renderer;
    const ui = f.createUI({
        core,
        getState:    () => state.ENGINE,
        getRenderer: () => _renderer,
    });

    let _persistence;
    _themes = f.createThemes({
        state,
        data,
        getPersistence: () => _persistence,
        getUI:          () => ui,
    });

    _renderer = f.createRenderer({ core, state, ui });

    const debug = f.createDebug({ core });

    let _engine, _editor;
    const levelUtils = f.createLevelUtils({
        core,
        data,
        getState:    () => state.ENGINE,
        getRenderer: () => _renderer,
    });

    _editor = f.createEditor({ core, state, ui, levelUtils, solverV2 });

    _persistence = f.createPersistence({
        getState:          () => state.ENGINE,
        getTheme:          (id) => _themes.getTheme(id),
        getRawLevels:      () => data.getLevels(),
        onProgressChanged: () => markDirty(state),
        ...persistenceSources,
    });

    _engine = f.createEngine({
        core, state, ui,
        renderer: _renderer,
        levelUtils,
        themes: _themes,
        data,
        persistence: _persistence,
        editor: _editor,
    });

    // Break circular dep: give editor access to engine after both are constructed.
    _editor.init({ engine: _engine });

    const input = f.createInput({
        core, state, ui,
        engine: _engine,
        levelUtils,
        editor: _editor,
        renderer: _renderer,
        themes: _themes,
        data,
        solverV2,
        persistence: _persistence,
    });

    const loader = f.createLoader({ ui, data, themes: _themes, core, dataAssetLoader });

    const boot = f.createBoot({
        ui, debug,
        persistence: _persistence,
        loader,
        themes: _themes,
        engine: _engine,
        data,
        core,
        state,
    });

    return {
        core,
        state,
        solverV2,
        data,
        ui,
        themes: _themes,
        renderer: _renderer,
        debug,
        levelUtils,
        editor: _editor,
        persistence: _persistence,
        engine: _engine,
        input,
        loader,
        boot,
    };
}

export function createAppFacade(app) {
    return {
        Core:        app.core,
        State:       { get ENGINE() { return app.state.ENGINE; } },
        Engine:      app.engine,
        Editor:      app.editor,
        LevelUtils:  app.levelUtils,
        Themes:      app.themes,
        SolverV2:    app.solverV2,
        UI:          app.ui,
        Renderer:    app.renderer,
        Persistence: app.persistence,
        Data:        app.data,
        Loader:      app.loader,
        Input:       app.input,
        Boot:        app.boot,
        Debug:       app.debug,
    };
}

export function bootstrapApp() {
    const app = createApp();
    window.onload = createOnloadHandler({ input: app.input, boot: app.boot, ui: app.ui, loader: app.loader });
    // Thin APP compatibility facade (used by browser console / dev tooling).
    window.APP = createAppFacade(app);
    return app;
}
