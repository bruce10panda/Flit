const SCROLLBAR_HIDE_CSS = `<style>::-webkit-scrollbar{display:none!important}html,body{scrollbar-width:none;-ms-overflow-style:none}</style>`;

function isProxyError(text) {
    return text.trimStart().startsWith('{"Error"');
}

async function fetchPageHTML(url) {
    const attempts = proxySources.map(proxy =>
        fetch(proxy + encodeURIComponent(url))
            .then(r => r.text())
            .then(text => { if (isProxyError(text)) throw new Error('proxy-error'); return text; })
    );
    try {
        return await Promise.any(attempts);
    } catch (err) {
        console.error('Browser: failed to fetch page', err);
        return null;
    }
}

function showIframe(iframe, loading) {
    iframe.classList.add('loaded');
    loading.style.display = 'none';
}

async function loadBrowser() {
    await loadAndApplyTheme();

    const url = new URLSearchParams(window.location.search).get('url');
    if (!url) return;

    document.getElementById('browser-back').onclick = () => window.history.back();

    document.getElementById('browser-open-external').onclick = () => {
        if (window.__TAURI__) {
            window.__TAURI__.opener.openUrl(url);
        } else {
            window.open(url, '_blank');
        }
    };

    document.getElementById('browser-share').onclick = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ url });
            } catch (e) {
                if (e.name !== 'AbortError') console.error('Share failed:', e);
            }
        } else if (window.__TAURI__) {
            window.__TAURI__.opener.openUrl(url);
        }
    };

    const iframe = document.getElementById('browser-iframe');
    const loading = document.getElementById('browser-loading');

    let revealed = false;
    iframe.addEventListener('load', () => {
        if (revealed) return;
        revealed = true;
        showIframe(iframe, loading);
    });

    const html = await fetchPageHTML(url);

    if (html) {
        const baseTag = `<base href="${url}">`;
        let injected = html.replace(/(<head[^>]*>)/i, `$1${baseTag}${SCROLLBAR_HIDE_CSS}`);
        if (injected === html) injected = baseTag + SCROLLBAR_HIDE_CSS + html;
        iframe.srcdoc = injected;

        // Fallback: if load event doesn't fire within 8s, show iframe anyway
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

document.addEventListener('DOMContentLoaded', loadBrowser);
