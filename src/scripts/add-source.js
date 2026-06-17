document.addEventListener('DOMContentLoaded', async () => {
    await loadAndApplyTheme();
});

document.querySelector('#back-btn')?.addEventListener('click', () => {
    history.back();
});

document.querySelectorAll('.source-header').forEach(header => {
    header.addEventListener('click', () => {
        const section = header.closest('.source-section');
        const isOpen = section.classList.contains('open');
        document.querySelectorAll('.source-section').forEach(s => s.classList.remove('open'));
        if (!isOpen) section.classList.add('open');
    });
});

async function addFeedToStorage(feedUrl) {
    const spaceIndex = await window.FlitStorage.getActiveSpaceIndex();
    const baseRes = await fetch('profile.json');
    const baseProfile = await baseRes.json();
    const baseCount = baseProfile.spaces?.length || 0;

    if (spaceIndex < baseCount) {
        await window.FlitStorage.addExtraFeed(spaceIndex, feedUrl);
    } else {
        const customIndex = spaceIndex - baseCount;
        const userData = await window.FlitStorage.getUserData();
        const space = userData.customSpaces[customIndex];
        if (space) {
            const feeds = [...(space.feeds || [])];
            if (!feeds.includes(feedUrl)) {
                feeds.push(feedUrl);
                await window.FlitStorage.updateCustomSpace(customIndex, { feeds });
            }
        }
    }
    sessionStorage.removeItem('flit_posts_' + spaceIndex);
}

function showError(input) {
    input.classList.add('error');
    input.addEventListener('animationend', () => input.classList.remove('error'), { once: true });
}

function showSuccess(row) {
    row.classList.add('success');
    setTimeout(() => history.back(), 700);
}

const rssSection = document.querySelector('.source-section');
const rssInput   = rssSection?.querySelector('.source-input');
const rssBtn     = rssSection?.querySelector('.source-add-btn');

async function submitRss() {
    const url = rssInput.value.trim();
    if (!url.match(/^https?:\/\/.+/)) { showError(rssInput); return; }
    await addFeedToStorage(url);
    showSuccess(rssSection.querySelector('.source-input-row'));
}

rssBtn?.addEventListener('click', submitRss);
rssInput?.addEventListener('keydown', e => { if (e.key === 'Enter') submitRss(); });
