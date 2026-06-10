const feedContainer = document.querySelector('.feed');
const INITIAL_BATCH = 3;
const PAGE_SIZE = 10;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let allPosts = [];
let currentOffset = 0;
let sentinel = null;
let observer = null;
let openInReader = true;


async function fetchFeed(url) {
    const allUrls = [url, ...proxySources.map(p => p + encodeURIComponent(url))];
    const controllers = allUrls.map(() => new AbortController());
    const timeoutId = setTimeout(() => controllers.forEach(c => c.abort()), 10000);

    const attempts = allUrls.map((fetchUrl, i) =>
        fetch(fetchUrl, { signal: controllers[i].signal })
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return { r, i }; })
    );

    try {
        const { r, i } = await Promise.any(attempts);
        clearTimeout(timeoutId);
        controllers.forEach((c, j) => { if (j !== i) c.abort(); });
        const text = await r.text();
        return new DOMParser().parseFromString(text, 'application/xml');
    } catch (err) {
        clearTimeout(timeoutId);
        console.error(`Failed to fetch feed: ${url}`, err);
        return null;
    }
}

async function fetchBlueskyFeed(handle) {
    const resolved = handle.includes('.') ? handle : `${handle}.bsky.social`;

    const [feedResult, profileResult] = await Promise.allSettled([
        fetchFeed(`https://bsky.app/profile/${resolved}/rss`),
        fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${resolved}`)
            .then(r => r.json()),
    ]);

    return {
        xmlDoc: feedResult.status === 'fulfilled' ? feedResult.value : null,
        avatar: profileResult.status === 'fulfilled' ? profileResult.value?.avatar ?? null : null,
    };
}

function extractImage(item) {
    const media = item.getElementsByTagNameNS('*', 'thumbnail')[0] ||
                  item.getElementsByTagNameNS('*', 'content')[0];
    if (media?.getAttribute('url')) return media.getAttribute('url');

    const enclosure = item.querySelector('enclosure[type^="image"]');
    if (enclosure?.getAttribute('url')) return enclosure.getAttribute('url');

    const content = item.querySelector('description, content')?.textContent || '';
    const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match ? match[1] : null;
}

function createPostElement(postData) {
    const post = document.createElement('div');
    post.className = 'post overlay';

    if (postData.isBluesky) {
        post.classList.add('bsky-post');
        post.onclick = () => {
            if (window.__TAURI__) {
                window.__TAURI__.opener.openUrl(postData.link);
            } else {
                window.open(postData.link, '_blank');
            }
        };

        post.innerHTML = `
            <div class="source">
                <img src="${postData.feedImage || 'https://www.google.com/s2/favicons?sz=64&domain=bsky.app'}" alt="Avatar" loading="lazy" onerror="this.src='https://www.google.com/s2/favicons?sz=64&domain=bsky.app'">
                <p class="source-name">${postData.feedTitle}</p>
            </div>
            <p class="bsky-body">${postData.title}</p>
            ${postData.externalLink ? `<a class="post-link overlay" href="${postData.externalLink}"><p>link</p></a>` : ''}
            <div class="author-time">
                <p class="time">${getTimeAgo(postData.date)}</p>
            </div>
        `;

        if (postData.externalLink) {
            const linkEl = post.querySelector('.post-link');
            if (linkEl) {
                linkEl.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (window.__TAURI__) {
                        window.__TAURI__.opener.openUrl(postData.externalLink);
                    } else {
                        window.open(postData.externalLink, '_blank');
                    }
                };
            }
        }
    } else {
        post.onclick = () => {
            if (openInReader) {
                sessionStorage.setItem('currentPostData', JSON.stringify(postData));
                window.location.href = `article.html?url=${encodeURIComponent(postData.link)}`;
            } else {
                window.location.href = `browser.html?url=${encodeURIComponent(postData.link)}`;
            }
        };

        post.innerHTML = `
            <div class="source">
                <img src="https://www.google.com/s2/favicons?sz=64&domain=${postData.link}" alt="Source Icon" loading="lazy">
                <p class="source-name">${postData.feedTitle}</p>
            </div>
            ${postData.image ? `<img class="post-image" src="${postData.image}" alt="Post Image" loading="lazy" onerror="this.remove()">` : ''}
            <h2 class="title">${postData.title}</h2>
            <p class="description">${postData.description}</p>
            <div class="author-time">
                <p class="author">${window.t('min_read', { n: postData.readTime })}</p>
                <p class="time">${getTimeAgo(postData.date)}</p>
            </div>
        `;
    }

    return post;
}

function getCachedPosts(key) {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const { posts, ts } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL) return null;
        return posts.map(p => ({ ...p, date: new Date(p.date) }));
    } catch { return null; }
}

function setCachedPosts(key, posts) {
    try {
        sessionStorage.setItem(key, JSON.stringify({
            posts: posts.map(p => ({ ...p, date: p.date instanceof Date ? p.date.toISOString() : p.date })),
            ts: Date.now(),
        }));
    } catch {} // ignore quota errors
}

function schedulePreload() {
    if (!('requestIdleCallback' in window)) return;
    if (navigator.connection?.saveData) return;
    const ect = navigator.connection?.effectiveType;
    if (ect === 'slow-2g' || ect === '2g') return;

    const upcoming = allPosts
        .slice(currentOffset, currentOffset + PAGE_SIZE)
        .filter(p => !p.isBluesky && p.link);

    requestIdleCallback(async () => {
        for (const post of upcoming) {
            const cacheKey = 'flit_preload_' + post.link;
            if (sessionStorage.getItem(cacheKey)) continue;
            try {
                const controller = new AbortController();
                setTimeout(() => controller.abort(), 15000);
                const r = await fetch(proxySources[0] + encodeURIComponent(post.link), { signal: controller.signal });
                if (r.ok) {
                    const html = await r.text();
                    try { sessionStorage.setItem(cacheKey, html); } catch {}
                }
            } catch {} // Silently ignore preload failures
        }
    }, { timeout: 5000 });
}

function appendBatch() {
    const batchSize = currentOffset === 0 ? INITIAL_BATCH : PAGE_SIZE;
    const batch = allPosts.slice(currentOffset, currentOffset + batchSize);
    if (batch.length === 0) return;

    batch.forEach(postData => feedContainer.insertBefore(createPostElement(postData), sentinel));
    currentOffset += batch.length;

    schedulePreload();

    if (currentOffset >= allPosts.length) {
        observer.disconnect();
        sentinel.remove();
        sentinel = null;
    }
}

function renderPosts() {
    feedContainer.innerHTML = `<p class="feed-name">${window.t('recent_updates')}</p>`;
    currentOffset = 0;

    sentinel = document.createElement('div');
    sentinel.className = 'feed-sentinel';
    feedContainer.appendChild(sentinel);

    observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) appendBatch();
    }, { rootMargin: '400px' });

    observer.observe(sentinel);
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!feedContainer) return;

    try {
        const profile = await loadAndApplyTheme();
        if (!profile) throw new Error('Could not load profile.json');

        openInReader = profile.preferences?.open_in_reader !== false;

        const activeIndex = await window.FlitStorage.getActiveSpaceIndex();
        const activeSpace = profile.spaces[activeIndex] || profile.spaces[0];
        if (activeSpace) {
            document.querySelector('h1').textContent = activeSpace.name;
        }

        const cacheKey = 'flit_posts_' + activeIndex;
        const cached = getCachedPosts(cacheKey);
        if (cached) {
            allPosts = cached;
            renderPosts();
            return;
        }

        const feedUrls = activeSpace.feeds || [];
        feedContainer.innerHTML = `<p class="feed-name">${window.t('loading', { name: activeSpace.name })}</p>`;

        const feedPromises = feedUrls.map(async (url) => {
            const isBluesky = url.startsWith('@') || /bsky\.app/i.test(url);

            let xmlDoc;
            let blueskyAvatar = null;
            if (url.startsWith('@')) {
                const result = await fetchBlueskyFeed(url.slice(1));
                xmlDoc = result.xmlDoc;
                blueskyAvatar = result.avatar;
            } else {
                xmlDoc = await fetchFeed(url);
            }
            if (!xmlDoc) return;

            const feedTitle = xmlDoc.querySelector('channel > title, feed > title')?.textContent?.trim() || 'Unknown Source';
            const feedImage = isBluesky
                ? blueskyAvatar
                : (xmlDoc.querySelector('channel > image > url, feed > logo')?.textContent?.trim() ||
                   xmlDoc.querySelector('channel > image')?.getAttribute('url') || null);

            Array.from(xmlDoc.querySelectorAll('item, entry')).forEach(item => {
                const pubDateStr = item.querySelector('pubDate, published, updated')?.textContent?.trim();
                const parsedDate = pubDateStr ? new Date(pubDateStr) : null;
                const postDate = parsedDate && !isNaN(parsedDate) ? parsedDate : new Date(0);
                const authorEl = item.querySelector('dc\\:creator, creator, author > name, author');
                let authorName = authorEl ? authorEl.textContent.trim() : '';

                if (authorName.includes('@') && authorName.includes('(')) {
                    authorName = authorName.match(/\(([^)]+)\)/)?.[1] || authorName;
                }

                const finalAuthor = (authorName && authorName.toLowerCase() !== 'staff' && !authorName.includes('@'))
                    ? authorName
                    : feedTitle;

                const rawDescHtml = item.querySelector('description, summary')?.textContent || '';
                const rawDesc = rawDescHtml.replace(/<[^>]+>/g, '').trim();
                const wordCount = rawDesc.split(/\s+/).filter(Boolean).length;
                const readTime = Math.max(1, Math.round(wordCount / 220));

                const link = item.querySelector('link')?.getAttribute('href') || item.querySelector('link')?.textContent?.trim();
                const rawTitle = item.querySelector('title')?.textContent?.trim();
                const title = isBluesky ? rawDesc : (rawTitle || 'Untitled');

                const urlMatch = isBluesky ? rawDesc.match(/https?:\/\/[^\s)>\]"]+/) : null;
                const externalLink = urlMatch ? urlMatch[0].replace(/[.,;!?]+$/, '') : null;
                const displayTitle = externalLink ? title.replace(urlMatch[0], '').trim() : title;

                allPosts.push({
                    feedTitle,
                    feedImage,
                    title: displayTitle,
                    link,
                    author: finalAuthor,
                    description: rawDesc.slice(0, 150) + (rawDesc.length > 150 ? '...' : ''),
                    image: extractImage(item),
                    date: postDate,
                    readTime,
                    isBluesky,
                    externalLink,
                });
            });
        });

        await Promise.all(feedPromises);
        allPosts.sort((a, b) => b.date - a.date);

        if (allPosts.length > 0) {
            setCachedPosts(cacheKey, allPosts);
            renderPosts();
        } else {
            feedContainer.innerHTML = `<p class="feed-name">${window.t('no_posts')}</p>`;
        }

    } catch (err) {
        console.error("Initialization Error:", err);
        feedContainer.innerHTML = `<p class="feed-name">${window.t('error_loading')}</p>`;
    }
});
