// Renders the theme selection grid inside the options panel.
// Owns only DOM construction — no state, no CSS variable writes.

// Player-facing names. Anything not listed falls back to title-cased key.
const THEME_DISPLAY_NAMES = {
    classic: 'Classic',
    glf: 'GLF',
    lcars: 'LCARS',
    usa: 'USA',
    roygbiv: 'ROYGBIV',
    paddys_day: "Paddy's Day",
    hello_kitty: 'Hello Kitty',
    candy_apple: 'Candy Apple',
    black_tie: 'Black Tie',
    ketchup_mustard: 'Ketchup & Mustard',
    so_purple: 'So Purple',
    sock_hop: 'Sock Hop',
    cozy_cottage: 'Cozy Cottage',
    chaos: 'Chaos',
};

export function themeDisplayName(key) {
    if (THEME_DISPLAY_NAMES[key]) return THEME_DISPLAY_NAMES[key];
    return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Mini-board swatch: paper, two grid lines each way, a path stroke, and the
// gate/goal dots — enough to judge a theme before applying it.
function buildSwatchSvg(t) {
    const surface = t.canvasBg || '#ffffff';
    const grid    = t.grid || '#94a3b8';
    const border  = (t.layout && t.layout.border) || grid;
    const gate    = (t.colors && t.colors.gate) || '#2563eb';
    const goal    = (t.colors && t.colors.goal) || '#dc2626';
    const isRainbow = t.path === 'rainbow';
    const path    = isRainbow ? 'url(#swatch-rainbow)' : (t.path || gate);
    const rainbowDef = isRainbow
        ? '<defs><linearGradient id="swatch-rainbow" x1="0" y1="0" x2="1" y2="1">'
          + '<stop offset="0" stop-color="#ff0000"/><stop offset="0.25" stop-color="#ff7f00"/>'
          + '<stop offset="0.5" stop-color="#00c000"/><stop offset="0.75" stop-color="#0000ff"/>'
          + '<stop offset="1" stop-color="#9400d3"/>'
          + '</linearGradient></defs>'
        : '';
    return `<svg viewBox="0 0 48 48" class="w-full h-full" aria-hidden="true">${rainbowDef}`
        + `<rect x="1" y="1" width="46" height="46" rx="7" fill="${surface}" stroke="${border}" stroke-width="2"/>`
        + `<g stroke="${grid}" stroke-width="1"><line x1="16" y1="6" x2="16" y2="42"/><line x1="32" y1="6" x2="32" y2="42"/>`
        + `<line x1="6" y1="16" x2="42" y2="16"/><line x1="6" y1="32" x2="42" y2="32"/></g>`
        + `<path d="M12 36 H32 V12 H20 V28" fill="none" stroke="${path}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`
        + `<circle cx="12" cy="36" r="3.2" fill="${gate}"/><circle cx="20" cy="28" r="3.2" fill="${goal}"/>`
        + `</svg>`;
}

export function populateThemePicker({ clearElement }, themes, currentThemeKey, applyThemeFn) {
    const grid = document.getElementById('themeGrid');
    clearElement('themeGrid');

    const currentTheme = themes[currentThemeKey] || themes.classic || {};
    const uniformThemeNameColor = (currentTheme.text && (currentTheme.text.themeName || currentTheme.text.modal)) || '#000000';

    const otherKeys = Object.keys(themes).filter(key => key !== 'classic' && key !== 'chaos');
    const themeKeys = ['classic', ...otherKeys, 'chaos'];

    themeKeys.forEach(key => {
        const t = themes[key] || themes.classic;
        const btn = document.createElement('div');
        btn.className = 'flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95 p-1';
        btn.onclick = () => {
            applyThemeFn(key);
            const label = document.getElementById('currentThemeOptionLabel');
            if (label) label.textContent = themeDisplayName(key);
            document.getElementById('optionsPanelTrack')?.classList.remove('show-theme-page');
        };

        const swatch = document.createElement('div');
        swatch.className = 'w-14 h-14';
        if (key === 'chaos') {
            swatch.className = 'w-12 h-12 rounded-full border-4 shadow-md';
            swatch.style.background = 'conic-gradient(red, orange, yellow, green, blue, violet, red)';
            swatch.style.borderColor = '#ffffff';
        } else {
            swatch.innerHTML = buildSwatchSvg(t);
        }

        const label = document.createElement('span');
        label.className = 'text-[length:var(--type-caption)] font-bold uppercase tracking-widest text-center leading-tight';
        label.style.color = uniformThemeNameColor;
        label.innerText = themeDisplayName(key);

        btn.appendChild(swatch);
        btn.appendChild(label);
        grid.appendChild(btn);
    });
}
