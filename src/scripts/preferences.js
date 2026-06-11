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
                        <p>${window.t('edit_space')}</p>
                        <span class="material-symbols-rounded">chevron_right</span>
                    </div>
                    <div class="pref-sub-item" id="delete-sources-${spaceIndex}">
                        <p>${window.t('delete_sources')}</p>
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

function setToggle(id, isOn) {
    document.getElementById(id)?.classList.toggle('on', isOn);
}

async function initReaderToggles(profile) {
    const userData = await window.FlitStorage.getUserData();
    const prefs = { ...profile?.preferences, ...userData.preferences };

    setToggle('toggle-open-reader',  prefs.open_in_reader !== false);
    setToggle('toggle-clean-reader', !!prefs.experimental_reader);

    document.getElementById('toggle-open-reader')?.addEventListener('click', async () => {
        const isOn = !document.getElementById('toggle-open-reader').classList.contains('on');
        setToggle('toggle-open-reader', isOn);
        await window.FlitStorage.updatePreferences({ open_in_reader: isOn });
    });

    document.getElementById('toggle-clean-reader')?.addEventListener('click', async () => {
        const isOn = !document.getElementById('toggle-clean-reader').classList.contains('on');
        setToggle('toggle-clean-reader', isOn);
        await window.FlitStorage.updatePreferences({ experimental_reader: isOn });
    });
}

function initLangSelect() {
    const current = window.flitLang || 'en';
    document.querySelectorAll('.pref-lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === current);
        btn.addEventListener('click', () => {
            const newLang = btn.dataset.lang;
            if (newLang === window.flitLang) return;
            localStorage.setItem('flit_lang', newLang);
            location.reload();
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const profile = await loadAndApplyTheme();
    const container = document.getElementById('pref-spaces');

    const spaces = profile?.spaces || [];
    spaces.forEach((space, i) => container.appendChild(buildSpaceItem(space, i)));

    await initReaderToggles(profile);
    initLangSelect();
});

document.getElementById('back-btn')?.addEventListener('click', () => history.back());
