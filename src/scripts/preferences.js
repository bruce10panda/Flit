function buildSpaceItem(space, spaceIndex) {
    const item = document.createElement('div');
    item.className = 'pref-space';

    item.innerHTML = `
        <div class="pref-space-header">
            <div class="pref-space-header-left">
                <span class="pref-space-emoji">${space.emoji || '📰'}</span>
                <p>${space.name}</p>
            </div>
            <span class="material-symbols-rounded pref-chevron">chevron_right</span>
        </div>
        <div class="pref-space-body">
            <div class="pref-sub-items">
                <div class="pref-sub-indicator"></div>
                <div class="pref-sub-content">
                    <div class="pref-sub-item" id="edit-theme-${spaceIndex}">
                        <p>Edit Space</p>
                        <span class="material-symbols-rounded">chevron_right</span>
                    </div>
                    <div class="pref-sub-item" id="delete-sources-${spaceIndex}">
                        <p>Delete Sources</p>
                        <span class="material-symbols-rounded">chevron_right</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    item.querySelector('.pref-space-header').addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.pref-space').forEach(s => s.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
    });

    item.querySelector(`#edit-theme-${spaceIndex}`).addEventListener('click', () => {
        navigate(`new-space.html?edit=${spaceIndex}`);
    });

    item.querySelector(`#delete-sources-${spaceIndex}`).addEventListener('click', () => {
        navigate(`delete-sources.html?space=${spaceIndex}`);
    });

    return item;
}

document.addEventListener('DOMContentLoaded', async () => {
    const profile = await loadAndApplyTheme();
    const container = document.getElementById('pref-spaces');

    const spaces = profile?.spaces || [];
    spaces.forEach((space, i) => container.appendChild(buildSpaceItem(space, i)));
});

document.getElementById('back-btn')?.addEventListener('click', () => history.back());
