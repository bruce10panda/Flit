function buildItem(feed, onDelete) {
    const item = document.createElement('div');
    item.className = 'ds-item';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'ds-item-icon';
    iconWrap.innerHTML = '<span class="material-symbols-rounded">rss_feed</span>';

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
        list.innerHTML = `<p class="ds-empty">No sources added.</p>`;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(location.search);
    const spaceIndex = parseInt(params.get('space') ?? '0', 10);
    const list = document.getElementById('ds-list');

    const profile = await loadAndApplyTheme();
    if (!profile) return;

    const userData = await window.FlitStorage.getUserData();
    const profileSpaceCount = (profile.spaces?.length || 0) - (userData.customSpaces?.length || 0);
    const isCustom = spaceIndex >= profileSpaceCount;

    // All feeds already merged (base - excluded + extra) by loadAndApplyTheme
    const feeds = profile.spaces?.[spaceIndex]?.feeds || [];

    if (feeds.length === 0) {
        list.innerHTML = `<p class="ds-empty">No sources added.</p>`;
        return;
    }

    if (isCustom) {
        const customIndex = spaceIndex - profileSpaceCount;
        feeds.forEach(feed => {
            list.appendChild(buildItem(feed, async (f) => {
                const custom = userData.customSpaces[customIndex];
                custom.feeds = custom.feeds.filter(x => x !== f);
                await window.FlitStorage.updateCustomSpace(customIndex, custom);
                sessionStorage.removeItem('flit_posts_' + spaceIndex);
            }));
        });
    } else {
        const baseRes = await fetch('profile.json');
        const baseProfile = await baseRes.json();
        const baseFeeds = new Set(baseProfile.spaces?.[spaceIndex]?.feeds || []);
        const extraFeeds = new Set(userData.spaceOverrides?.[spaceIndex]?.extraFeeds || []);

        feeds.forEach(feed => {
            list.appendChild(buildItem(feed, async (f) => {
                if (extraFeeds.has(f)) {
                    await window.FlitStorage.removeExtraFeed(spaceIndex, f);
                } else if (baseFeeds.has(f)) {
                    await window.FlitStorage.excludeBaseFeed(spaceIndex, f);
                }
                sessionStorage.removeItem('flit_posts_' + spaceIndex);
            }));
        });
    }
});

document.getElementById('back-btn')?.addEventListener('click', () => history.back());
