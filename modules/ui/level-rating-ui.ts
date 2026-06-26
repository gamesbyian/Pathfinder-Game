export function renderLevelRatingPane(draft: any = {}) {
    const tags = draft.tags instanceof Set ? draft.tags : new Set(draft.tags || []);
    (document.querySelectorAll('#levelRatingPane .rating-tag-btn[data-tag]') as any).forEach((btn: any) => {
        btn.classList.toggle('selected', tags.has(btn.dataset.tag));
    });
    ['difficulty', 'fun'].forEach((scale: any) => {
        const value = draft[scale] || 0;
        (document.querySelectorAll(`#levelRatingPane .rating-scale-buttons[data-scale="${scale}"] button[data-value]`) as any).forEach((btn: any) => {
            btn.classList.toggle('selected', Number(btn.dataset.value) === value);
        });
    });
    const list = (document.getElementById('levelRatingCustomTagList') as any);
    if (list) {
        const chips = (draft.customTags || []).map((tag: any) => {
            const chip = document.createElement('span');
            chip.className = 'rating-custom-tag-chip type-2xs';
            chip.dataset.tag = tag;
            const label = document.createElement('span');
            label.textContent = tag;
            const removeBtn = document.createElement('button');
            removeBtn.className = 'rating-custom-tag-remove-btn';
            removeBtn.textContent = '×';
            removeBtn.dataset.tag = tag;
            chip.append(label, removeBtn);
            return chip;
        });
        list.replaceChildren(...chips);
    }
}
