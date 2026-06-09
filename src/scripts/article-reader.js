const imageBlacklist = [
    'google-preferred-source',
    'follow-us-on-google-news',
    'badge',
    'social-share',
    'subscribe-button',
    'newsletter-signup',
    'download-on-the-app-store',
    'get-it-on-google-play',
    'facebook-icon',
    'twitter-icon',
    'author', 'avatar', 'headshot', 'profile', 'byline',
    'contributor', 'journalist', 'reporter', 'staff',
    'mugshot', 'bio-img', 'bio-image', 'writer',
];

const cutoffPhrases = [
    'popular stories', 'recommended for you', 'what do you think',
    'leave a comment', 'sponsored content', 'advertisement',
    'more from', 'share this', 'related articles', 'related stories',
    'you might also like', 'follow us on', 'join the conversation',
    'subscribe', 'sign up', 'get updates', 'download our app',
    'connect with us', 'stay informed', 'about the author',
    'original article', 'source:', 'share your thoughts',
    'google-preferred-source', 'know in the comments',
    'follow topics and authors', 'receive email updates',
    'most read', 'trending now', "editor's picks", 'also on',
    'comments', 'have a tip', 'corrections', 'disclosure',
    'terms of use', 'privacy policy', 'auto affiliate links',
];

const blockedLinkDomains = [
    'news.google.com', 'facebook.com/sharer', 'twitter.com/intent',
    'linkedin.com/share', 'reddit.com/submit', 'whatsapp.com',
    'telegram.me', 't.me',
];

function normalizeSrc(src) {
    if (!src) return '';
    try {
        const filename = src.split('?')[0].split('/').pop();
        return filename.toLowerCase();
    } catch (e) {
        return src.toLowerCase();
    }
}

async function fetchArticleHTML(url) {
    const attempts = proxySources
        .map(proxy => fetch(proxy + encodeURIComponent(url)))
        .map(p => p.then(r => r.ok ? r : Promise.reject(new Error(`HTTP ${r.status}`))));
    try {
        const response = await Promise.any(attempts);
        return await response.text();
    } catch (err) {
        console.error("Failed to fetch article content:", err);
        return null;
    }
}

function isBlockedImage(img) {
    const src = (img.src || img.getAttribute('src') || '').toLowerCase();
    const alt = (img.alt || '').toLowerCase();
    const classList = (img.className || '').toLowerCase();
    const id = (img.id || '').toLowerCase();
    const combined = `${src} ${alt} ${classList} ${id}`;

    if (imageBlacklist.some(term => combined.includes(term))) return true;

    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    if (w > 0 && h > 0) {
        const ratio = w / h;
        if (ratio >= 0.8 && ratio <= 1.25 && w <= 120 && h <= 120) return true;
    }

    const parent = img.closest('[class],[id]');
    if (parent) {
        const parentCtx = `${parent.className || ''} ${parent.id || ''}`.toLowerCase();
        if (imageBlacklist.some(term => parentCtx.includes(term))) return true;
    }

    return false;
}

function hasBlockedLink(el) {
    const links = el.tagName === 'A' ? [el] : Array.from(el.querySelectorAll('a'));
    return links.some(link => blockedLinkDomains.some(domain => (link.href || '').toLowerCase().includes(domain)));
}

function matchesCutoff(el) {
    const text = el.textContent.trim().toLowerCase();
    if (!text) return false;

    return cutoffPhrases.some(phrase =>
        text === phrase ||
        text.startsWith(phrase + ':') ||
        text.startsWith(phrase + ' ') ||
        (text.length <= 200 && text.includes(phrase))
    );
}

function stripBoilerplate(container) {
    const elements = Array.from(
        container.querySelectorAll('p, h1, h2, h3, h4, ul, ol, blockquote, div, section, hr, footer, aside, figure, table')
    );

    let cutoffReached = false;

    for (const el of elements) {
        if (!container.contains(el)) continue;

        if (cutoffReached || matchesCutoff(el)) {
            cutoffReached = true;
            el.remove();
            continue;
        }

        if (hasBlockedLink(el)) el.remove();
    }
}

// ── Init (called when navigating to the article page) ─────────────────────
// Starts fetching immediately so content loads during the slide animation.

async function loadArticle(p) {
    const articlePage = document.getElementById('page-article');

    // Scope all queries to the article page to avoid conflicts with feed posts
    const postContainer = articlePage.querySelector('.post');
    const titleEl       = articlePage.querySelector('.title');
    const sourceNameEl  = articlePage.querySelector('.source-name');
    const sourceImgEl   = articlePage.querySelector('.source-info img');
    const authorEl      = articlePage.querySelector('.author');
    const timeEl        = articlePage.querySelector('.time');

    // Reset previous article
    articlePage.querySelector('.article-content')?.remove();
    articlePage.querySelector('.main-article-img')?.remove();
    articlePage.querySelector('.post-image')?.remove();
    titleEl.textContent      = 'Loading…';
    sourceNameEl.textContent = '';
    authorEl.textContent     = '';
    timeEl.textContent       = '';
    if (sourceImgEl) sourceImgEl.src = '';

    let experimentalReaderEnabled = false;

    try {
        const profile = await loadAndApplyTheme();
        experimentalReaderEnabled = profile?.preferences?.experimental_reader || false;
    } catch (e) {
        console.error("Reader: Profile fetch failed", e);
    }

    const articleUrl = p?.url || FlitRouter.getParam('url');
    const savedData  = JSON.parse(sessionStorage.getItem('currentPostData'));

    if (!articleUrl) return;

    if (savedData) {
        titleEl.textContent      = savedData.title;
        sourceNameEl.textContent = savedData.feedTitle;
        authorEl.textContent     = savedData.author;
        timeEl.textContent       = getTimeAgo(savedData.date);
        sourceImgEl.src          = savedData.feedImage || `https://www.google.com/s2/favicons?sz=64&domain=${articleUrl}`;

        const actionBtn = articlePage.querySelector('.open-source');
        const btnText   = actionBtn?.querySelector('p');

        if (actionBtn) {
            try {
                const domain = new URL(articleUrl).hostname.replace('www.', '');
                if (btnText) btnText.textContent = `Open on ${domain}`;
                actionBtn.onclick = () => {
                    if (window.__TAURI__) {
                        window.__TAURI__.opener.openUrl(articleUrl);
                    } else {
                        window.open(articleUrl, '_blank');
                    }
                };
            } catch (e) {
                if (btnText) btnText.textContent = 'Open Original Source';
            }
        }

        if (savedData.image) {
            const firstImg = document.createElement('img');
            firstImg.className = 'post-image main-article-img';
            firstImg.src = savedData.image;
            titleEl.parentNode.insertBefore(firstImg, titleEl);
        }
    } else {
        titleEl.textContent = 'Loading…';
    }

    const html = await fetchArticleHTML(articleUrl);

    if (html) {
        const doc     = new DOMParser().parseFromString(html, 'text/html');
        const article = new Readability(doc).parse();

        if (article) {
            titleEl.textContent = article.title;

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = article.content;

            const topImageSrc = savedData?.image ? normalizeSrc(savedData.image) : null;
            const seenImages  = new Set();

            tempDiv.querySelectorAll('img').forEach(img => {
                const imgSrc = normalizeSrc(img.src || img.getAttribute('src') || '');

                if (!imgSrc || imgSrc === topImageSrc || seenImages.has(imgSrc)) {
                    img.remove();
                    return;
                }

                if (experimentalReaderEnabled && isBlockedImage(img)) {
                    img.remove();
                    return;
                }

                seenImages.add(imgSrc);
                img.alt = img.alt || 'Article image';
            });

            if (experimentalReaderEnabled) stripBoilerplate(tempDiv);

            const contentDiv = document.createElement('div');
            contentDiv.className = 'article-content';
            contentDiv.innerHTML = tempDiv.innerHTML;
            postContainer.appendChild(contentDiv);

            contentDiv.addEventListener('click', (e) => {
                const link = e.target.closest('a[href]');
                if (!link) return;
                e.preventDefault();
                const href = link.href;
                if (window.__TAURI__) {
                    window.__TAURI__.opener.openUrl(href);
                } else {
                    window.open(href, '_blank');
                }
            });

            window.processArticleContent?.(contentDiv);
        }
    }
}

FlitRouter.register('article', { init: loadArticle });
