// Persistent storage for Flit.
// When running inside Tauri, data is written to the app's data directory
// (survives app restarts on Android). Falls back to localStorage in a browser.

const DEFAULT_DATA = {
    activeSpaceIndex: 0,
    spaceOverrides: [],  // indexed by profile.json space index: { extraFeeds[], theme }
    customSpaces: [],    // user-created spaces: { name, emoji, theme, feeds[] }
    preferences: {},     // user preference overrides: { open_in_reader, experimental_reader, … }
};

let _cache = null;

function _isTauri() {
    return typeof window.__TAURI__ !== 'undefined';
}

async function _loadRaw() {
    if (_isTauri()) {
        try {
            const json = await window.__TAURI__.core.invoke('load_user_data');
            return JSON.parse(json || '{}');
        } catch (e) {
            console.error('FlitStorage: load failed', e);
            return {};
        }
    }
    const stored = localStorage.getItem('flitUserData');
    return stored ? JSON.parse(stored) : {};
}

async function _saveRaw(data) {
    if (_isTauri()) {
        await window.__TAURI__.core.invoke('save_user_data', { data: JSON.stringify(data) });
    } else {
        localStorage.setItem('flitUserData', JSON.stringify(data));
    }
}

async function getUserData() {
    if (_cache) return _cache;
    const raw = await _loadRaw();
    _cache = { ...DEFAULT_DATA, ...raw };
    return _cache;
}

async function _save() {
    await _saveRaw(_cache);
}

async function getActiveSpaceIndex() {
    const data = await getUserData();
    return data.activeSpaceIndex || 0;
}

async function setActiveSpaceIndex(index) {
    const data = await getUserData();
    data.activeSpaceIndex = index;
    await _save();
}

async function getExtraFeeds(spaceIndex) {
    const data = await getUserData();
    return data.spaceOverrides?.[spaceIndex]?.extraFeeds || [];
}

async function addExtraFeed(spaceIndex, feedUrl) {
    const data = await getUserData();
    while (data.spaceOverrides.length <= spaceIndex) {
        data.spaceOverrides.push({ extraFeeds: [], theme: null });
    }
    const feeds = data.spaceOverrides[spaceIndex].extraFeeds;
    if (!feeds.includes(feedUrl)) {
        feeds.push(feedUrl);
        await _save();
    }
}

async function addCustomSpace(space) {
    const data = await getUserData();
    data.customSpaces.push(space);
    await _save();
}

async function updateSpaceOverride(profileIndex, overrides) {
    const data = await getUserData();
    while (data.spaceOverrides.length <= profileIndex) {
        data.spaceOverrides.push({ extraFeeds: [], theme: null });
    }
    data.spaceOverrides[profileIndex] = { ...data.spaceOverrides[profileIndex], ...overrides };
    await _save();
}

async function updateCustomSpace(customIndex, space) {
    const data = await getUserData();
    if (customIndex >= 0 && customIndex < data.customSpaces.length) {
        data.customSpaces[customIndex] = { ...data.customSpaces[customIndex], ...space };
        await _save();
    }
}

async function updatePreferences(prefs) {
    const data = await getUserData();
    data.preferences = { ...data.preferences, ...prefs };
    await _save();
}

window.FlitStorage = {
    getUserData,
    getActiveSpaceIndex,
    setActiveSpaceIndex,
    getExtraFeeds,
    addExtraFeed,
    addCustomSpace,
    updateSpaceOverride,
    updateCustomSpace,
    updatePreferences,
};
