// Renders the theme selection grid inside the options panel.
// Owns only DOM construction — no state, no CSS variable writes.

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
        btn.className = 'flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95 p-1 bg-transparent border-0 shadow-none rounded-none';
        btn.style.background = 'transparent';
        btn.style.border = '0';
        btn.style.boxShadow = 'none';
        btn.style.borderRadius = '0';
        btn.onclick = () => {
            applyThemeFn(key);
            const label = document.getElementById('currentThemeOptionLabel');
            if (label) label.textContent = key;
            document.getElementById('optionsPanelTrack')?.classList.remove('show-theme-page');
        };

        const swatch = document.createElement('div');
        swatch.className = 'theme-map-swatch';
        swatch.style.background = key === 'chaos'
            ? 'conic-gradient(from 180deg, #fee2e2, #fef3c7, #dcfce7, #dbeafe, #f5d0fe, #fee2e2)'
            : (t.canvasBg || '#fff');
        swatch.style.borderColor = t.palette?.itemBorder || t.grid || '#cbd5e1';
        swatch.style.setProperty('--swatch-path', key === 'chaos' ? '#d946ef' : (t.path || t.headerRight || '#2563eb'));

        const gate = document.createElement('span');
        gate.className = 'theme-map-pin theme-map-gate';
        gate.style.backgroundColor = key === 'chaos' ? '#3b82f6' : (t.colors?.gate || t.headerRight || '#2563eb');
        swatch.appendChild(gate);

        const goal = document.createElement('span');
        goal.className = 'theme-map-pin theme-map-goal';
        goal.style.backgroundColor = key === 'chaos' ? '#ef4444' : (t.colors?.goal || t.headerLeft || '#ef4444');
        swatch.appendChild(goal);

        const label = document.createElement('span');
        label.className = 'text-[0.65rem] font-black uppercase tracking-widest';
        label.style.color = uniformThemeNameColor;
        label.innerText = key;

        btn.appendChild(swatch);
        btn.appendChild(label);
        grid.appendChild(btn);
    });
}
