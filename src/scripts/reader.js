const feedContainer = document.querySelector('.feed');
const INITIAL_BATCH = 3;
const PAGE_SIZE = 10;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let allPosts = [];
let currentOffset = 0;
let sentinel = null;
let observer = null;

async function fetchFeed(url) {
    const allUrls = [url, ...proxySources.map(p => p + encodeURIComponent(url))];
    const controllers = allUrls.map(() => new AbortController());
    const timeoutId = setTimeout(() => controllers.forEach(c => c.abort()), 10000);

    const attempts = allUrls.map((fetchUrl, i) =>
        fetch(fetchUrl, { signal: controllers[i].signal })
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
            .then(text => { if (text.trimStart().startsWith('{"Error"')) throw new Error('proxy-error'); return { text, i }; })
    );

    try {
        const { text, i } = await Promise.any(attempts);
        clearTimeout(timeoutId);
        controllers.forEach((c, j) => { if (j !== i) c.abort(); });
        return new DOMParser().parseFromString(text, 'application/xml');
    } catch (err) {
        clearTimeout(timeoutId);
        console.error(`Failed to fetch feed: ${url}`, err);
        return null;
    }
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

    post.onclick = () => {
        sessionStorage.setItem('currentPostData', JSON.stringify(postData));
        navigate(`article.html?url=${encodeURIComponent(postData.link)}`);
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
            <p class="author">${postData.readTime} min read</p>
            <p class="time">${getTimeAgo(postData.date)}</p>
        </div>
    `;

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

    const upcoming = allPosts.slice(currentOffset, currentOffset + PAGE_SIZE).filter(p => p.link);

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
            } catch {}
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
    feedContainer.innerHTML = `<p class="feed-name">Recent Updates</p>`;
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
        feedContainer.innerHTML = `<p class="feed-name">Loading ${activeSpace.name}...</p>`;

        const feedPromises = feedUrls.map(async (url) => {
            const xmlDoc = await fetchFeed(url);
            if (!xmlDoc) return;

            const feedTitle = xmlDoc.querySelector('channel > title, feed > title')?.textContent?.trim() || 'Unknown Source';

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

                allPosts.push({
                    feedTitle,
                    title: item.querySelector('title')?.textContent?.trim() || 'Untitled',
                    link,
                    author: finalAuthor,
                    description: rawDesc.slice(0, 150) + (rawDesc.length > 150 ? '...' : ''),
                    image: extractImage(item),
                    date: postDate,
                    readTime,
                });
            });
        });

        await Promise.all(feedPromises);
        allPosts.sort((a, b) => b.date - a.date);

        if (allPosts.length > 0) {
            setCachedPosts(cacheKey, allPosts);
            renderPosts();
        } else {
            feedContainer.innerHTML = `<p class="feed-name">No posts found.</p>`;
        }

    } catch (err) {
        console.error('Initialization Error:', err);
        feedContainer.innerHTML = `<p class="feed-name">Error loading profile.</p>`;
    }
});
