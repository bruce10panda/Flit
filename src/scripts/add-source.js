// ── Accordion headers ──────────────────────────────────────────────────────

document.querySelectorAll('#page-add-source .source-header').forEach(header => {
    header.addEventListener('click', () => {
        const section = header.closest('.source-section');
        const isOpen = section.classList.contains('open');
        document.querySelectorAll('#page-add-source .source-section').forEach(s => s.classList.remove('open'));
        if (!isOpen) section.classList.add('open');
    });
});

// ── Storage helpers ────────────────────────────────────────────────────────

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
}

function showError(input) {
    input.classList.add('error');
    input.addEventListener('animationend', () => input.classList.remove('error'), { once: true });
}

function showSuccess(row) {
    row.classList.add('success');
    setTimeout(() => FlitRouter.back(), 700);
}

// ── Section refs ───────────────────────────────────────────────────────────

const sections    = document.querySelectorAll('#page-add-source .source-section');
const rssSection  = sections[0];
const bskySection = sections[1];

// ── RSS ────────────────────────────────────────────────────────────────────

const rssInput = rssSection?.querySelector('.source-input');
const rssBtn   = rssSection?.querySelector('.source-add-btn');

async function submitRss() {
    const url = rssInput.value.trim();
    if (!url.match(/^https?:\/\/.+/)) { showError(rssInput); return; }
    await addFeedToStorage(url);
    showSuccess(rssSection.querySelector('.source-input-row'));
}

rssBtn?.addEventListener('click', submitRss);
rssInput?.addEventListener('keydown', e => { if (e.key === 'Enter') submitRss(); });

// ── Bluesky ────────────────────────────────────────────────────────────────

const bskyInput = bskySection?.querySelector('.source-input');
const bskyBtn   = bskySection?.querySelector('.source-add-btn');

async function submitBsky() {
    let handle = bskyInput.value.trim();
    if (!handle) { showError(bskyInput); return; }
    if (!handle.startsWith('@')) handle = '@' + handle;
    if (!handle.slice(1).includes('.')) { showError(bskyInput); return; }
    await addFeedToStorage(handle);
    showSuccess(bskySection.querySelector('.source-input-row'));
}

bskyBtn?.addEventListener('click', submitBsky);
bskyInput?.addEventListener('keydown', e => { if (e.key === 'Enter') submitBsky(); });

// ── Init (called each time the page is opened) ─────────────────────────────

async function initAddSource() {
    await loadAndApplyTheme();
    // Reset inputs and accordion state
    if (rssInput)  rssInput.value  = '';
    if (bskyInput) bskyInput.value = '';
    document.querySelectorAll('#page-add-source .source-section').forEach(s => s.classList.remove('open'));
    document.querySelectorAll('#page-add-source .source-input-row').forEach(r => r.classList.remove('success'));
}

FlitRouter.register('add-source', { init: initAddSource });
