// ── Navigation ─────────────────────────────────────────────────────────────

document.querySelector('#close-sidebar-btn')?.addEventListener('click', () => {
    FlitRouter.back();
});

document.querySelector('#preferences-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    FlitRouter.navigate('preferences');
});

const addBtn = document.querySelector('#add-btn');

addBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    addBtn.classList.toggle('open');
});

addBtn?.querySelectorAll('.add-btn-row').forEach((row, i) => {
    row.addEventListener('click', (e) => {
        if (!addBtn.classList.contains('open')) return;
        e.stopPropagation();
        if (i === 0) FlitRouter.navigate('add-source');
        if (i === 1) FlitRouter.navigate('new-space');
    });
});

document.addEventListener('click', () => {
    addBtn?.classList.remove('open');
});

// ── Init (called every time the sidebar is opened) ─────────────────────────

async function initSidebar() {
    const profile = await loadAndApplyTheme();
    if (!profile) return;

    const activeIndex = await window.FlitStorage.getActiveSpaceIndex();
    const activeSpace = profile.spaces[activeIndex] || profile.spaces[0];
    if (activeSpace) {
        document.querySelector('#page-sidebar h1').textContent = activeSpace.name;
    }

    // Re-render the spaces list from scratch
    const list = document.querySelector('#spaces-list');
    list.innerHTML = '<p>SPACES</p>';

    profile.spaces.forEach((space, i) => {
        const item = document.createElement('div');
        item.className = 'list-option';
        item.innerHTML = `<p>${space.emoji || ''}</p><p>${space.name}</p>`;
        if (i === activeIndex) item.style.opacity = '1';

        item.addEventListener('click', async () => {
            await window.FlitStorage.setActiveSpaceIndex(i);
            FlitRouter.back(); // back to feed; feed's onResume reloads it
        });

        list.appendChild(item);
    });
}

FlitRouter.register('sidebar', {
    init:     initSidebar,
    onResume: initSidebar,  // refresh when returning (e.g. after creating a space)
});
