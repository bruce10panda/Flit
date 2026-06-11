function isBluesky(feed) {
    return feed.startsWith('@') || feed.includes('.bsky.social');
}

function buildItem(feed, onDelete) {
    const item = document.createElement('div');
    item.className = 'ds-item';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'ds-item-icon';
    if (isBluesky(feed)) {
        const bsky = document.createElement('span');
        bsky.className = 'ds-item-icon--bluesky';
        iconWrap.appendChild(bsky);
    } else {
        iconWrap.innerHTML = '<span class="material-symbols-rounded">rss_feed</span>';
    }

    const label = document.createElement('span');
    label.className = 'ds-item-label';
    label.textContent = feed;

    const btn = document.createElement('button');
    btn.className = 'ds-delete-btn';
    btn.innerHTML = '<span class="material-symbols-rounded">delete</span>';
    btn.addEventListener('click', () => {
        item.classList.add('removing');
        item.addEventListener('animationend', () => {
            item.remove();
            checkEmpty();
        }, { once: true });
        onDelete(feed);
    });

    item.appendChild(iconWrap);
    item.appendChild(label);
    item.appendChild(btn);
    return item;
}

function checkEmpty() {
    const list = document.getElementById('ds-list');
    if (list && list.querySelectorAll('.ds-item').length === 0) {
        list.innerHTML = `<p class="ds-empty">${window.t('no_sources')}</p>`;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(location.search);
    const spaceIndex = parseInt(params.get('space') ?? '0', 10);
    const list = document.getElementById('ds-list');

    const profile = await loadAndApplyTheme();
    if (!profile) return;
    // profile.spaces already includes custom spaces appended by loadAndApplyTheme.
    // Re-fetch raw userData to access spaceOverrides / customSpaces directly.
    const userData = await window.FlitStorage.getUserData();
    const profileSpaceCount = (profile.spaces?.length || 0) - (userData.customSpaces?.length || 0);

    const isCustom = spaceIndex >= profileSpaceCount;
    let feeds = [];

    if (isCustom) {
        const customIndex = spaceIndex - profileSpaceCount;
        feeds = userData.customSpaces?.[customIndex]?.feeds || [];

        feeds.forEach(feed => {
            list.appendChild(buildItem(feed, async (f) => {
                const custom = userData.customSpaces[customIndex];
                custom.feeds = custom.feeds.filter(x => x !== f);
                await window.FlitStorage.updateCustomSpace(customIndex, custom);
                sessionStorage.removeItem('flit_posts_' + spaceIndex);
            }));
        });
    } else {
        feeds = userData.spaceOverrides?.[spaceIndex]?.extraFeeds || [];

        feeds.forEach(feed => {
            list.appendChild(buildItem(feed, async (f) => {
                const override = userData.spaceOverrides[spaceIndex];
                override.extraFeeds = override.extraFeeds.filter(x => x !== f);
                await window.FlitStorage.updateSpaceOverride(spaceIndex, override);
                sessionStorage.removeItem('flit_posts_' + spaceIndex);
            }));
        });
    }

    if (feeds.length === 0) {
        list.innerHTML = `<p class="ds-empty">${window.t('no_sources')}</p>`;
    }
});

document.getElementById('back-btn')?.addEventListener('click', () => history.back());
