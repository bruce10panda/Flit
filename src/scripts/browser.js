const SCROLLBAR_HIDE_CSS = `<style>::-webkit-scrollbar{display:none!important}html,body{scrollbar-width:none;-ms-overflow-style:none}</style>`;

async function fetchPageHTML(url) {
    const attempts = proxySources
        .map(proxy => fetch(proxy + encodeURIComponent(url)))
        .map(p => p.then(r => r.ok ? r : Promise.reject(new Error(`HTTP ${r.status}`))));
    try {
        const response = await Promise.any(attempts);
        return await response.text();
    } catch (err) {
        console.error('Browser: failed to fetch page', err);
        return null;
    }
}

function showIframe(iframe, loading) {
    iframe.classList.add('loaded');
    loading.style.display = 'none';
}

// ── Setup (one-time) ───────────────────────────────────────────────────────

document.getElementById('browser-share')?.addEventListener('click', async () => {
    const url = FlitRouter.getParam('url');
    if (!url) return;
    if (navigator.share) {
        try {
            await navigator.share({ url });
        } catch (e) {
            if (e.name !== 'AbortError') console.error('Share failed:', e);
        }
    } else if (window.__TAURI__) {
        window.__TAURI__.opener.openUrl(url);
    }
});

document.getElementById('browser-open-external')?.addEventListener('click', () => {
    const url = FlitRouter.getParam('url');
    if (!url) return;
    if (window.__TAURI__) {
        window.__TAURI__.opener.openUrl(url);
    } else {
        window.open(url, '_blank');
    }
});

// ── Init (called each time the browser page is navigated to) ──────────────

async function initBrowser(p) {
    await loadAndApplyTheme();

    const url = p?.url || FlitRouter.getParam('url');
    if (!url) return;

    const iframe  = document.getElementById('browser-iframe');
    const loading = document.getElementById('browser-loading');

    // Reset state
    iframe.classList.remove('loaded');
    loading.style.display = '';
    iframe.srcdoc = '';
    iframe.src    = 'about:blank';

    let revealed = false;

    function onLoad() {
        if (revealed) return;
        revealed = true;
        showIframe(iframe, loading);
    }

    iframe.addEventListener('load', onLoad, { once: true });

    const html = await fetchPageHTML(url);

    if (html) {
        const baseTag = `<base href="${url}">`;
        let injected = html.replace(/(<head[^>]*>)/i, `$1${baseTag}${SCROLLBAR_HIDE_CSS}`);
        if (injected === html) injected = baseTag + SCROLLBAR_HIDE_CSS + html;
        iframe.srcdoc = injected;

        setTimeout(() => {
            if (!revealed) {
                revealed = true;
                showIframe(iframe, loading);
            }
        }, 8000);
    } else {
        showIframe(iframe, loading);
    }
}

FlitRouter.register('browser', { init: initBrowser });
