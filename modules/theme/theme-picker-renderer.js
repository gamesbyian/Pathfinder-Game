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

        const circle = document.createElement('div');
        circle.className = 'w-12 h-12 rounded-full border-4 shadow-md';
        if (key === 'chaos') {
            circle.style.background = 'conic-gradient(red, orange, yellow, green, blue, violet, red)';
            circle.style.borderColor = '#ffffff';
        } else {
            circle.style.backgroundColor = t.headerRight || '#000';
            circle.style.borderColor = t.canvasBg || '#fff';
        }

        const label = document.createElement('span');
        label.className = 'text-[0.65rem] font-black uppercase tracking-widest';
        label.style.color = uniformThemeNameColor;
        label.textContent = key;

        btn.appendChild(circle);
        btn.appendChild(label);
        grid.appendChild(btn);
    });
}
