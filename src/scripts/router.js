// ── FlitRouter ────────────────────────────────────────────────────────────
// Manages sliding page transitions for the SPA.
// Pages slide from the right by default; the sidebar slides from the left.

window.FlitRouter = (() => {
    let activeId = 'page-feed';
    const stack = [];   // [{pageId, pushedTo, scrollTop}]
    const pages = {};   // {pageId: {init(params), onResume()}}
    let params = {};
    let animating = false;

    const EASING = '380ms cubic-bezier(0.4, 0, 0.2, 1)';

    // Stamp the initial history entry so popstate can tell we own it
    history.replaceState({ flitDepth: 0 }, '');

    function setPos(el, transform, animate) {
        el.style.transition = animate ? `transform ${EASING}` : 'none';
        el.style.transform = transform;
    }

    function navigate(pageId, newParams) {
        if (animating) return;
        const toId = 'page-' + pageId;
        if (toId === activeId) return;

        const fromEl = document.getElementById(activeId);
        const toEl   = document.getElementById(toId);
        if (!fromEl || !toEl) return;

        animating = true;
        params = newParams || {};

        const fromLeft = (toId === 'page-sidebar');
        const pushedTo = fromLeft ? 'translateX(100%)' : 'translateX(-100%)';
        const startPos = fromLeft ? 'translateX(-100%)' : 'translateX(100%)';

        stack.push({ pageId: activeId, pushedTo, scrollTop: fromEl.scrollTop });

        // Push a browser history entry so the hardware/browser back button works
        history.pushState({ flitDepth: stack.length }, '');

        // Kick off the page's work immediately so it loads during the animation
        const page = pages[toId];
        if (page?.init) page.init(params);

        // Snap new page to its off-screen start (no animation)
        setPos(toEl, startPos, false);
        toEl.getBoundingClientRect(); // force reflow

        // Animate both pages
        setPos(toEl,   'translateX(0)', true);
        setPos(fromEl, pushedTo,        true);

        activeId = toId;
        setTimeout(() => { animating = false; }, 400);
    }

    // Performs the back animation. Called by popstate so history is already stepped back.
    function _performBack() {
        if (animating || !stack.length) return;
        const { pageId: prevId, pushedTo, scrollTop } = stack.pop();

        const fromEl = document.getElementById(activeId);
        const toEl   = document.getElementById(prevId);
        if (!fromEl || !toEl) return;

        animating = true;

        const exitTo = activeId === 'page-sidebar' ? 'translateX(-100%)' : 'translateX(100%)';

        setPos(toEl,   'translateX(0)', true);
        setPos(fromEl, exitTo,          true);

        toEl.scrollTop = scrollTop || 0;
        activeId = prevId;
        setTimeout(() => { animating = false; }, 400);

        const page = pages[prevId];
        if (page?.onResume) page.onResume();
    }

    // Public back() — delegates to history.back() so browser history stays in sync
    function back() {
        if (animating || !stack.length) return;
        history.back(); // fires popstate → _performBack()
    }

    // Browser/hardware back button: history already stepped back when this fires
    window.addEventListener('popstate', () => {
        if (stack.length > 0) {
            _performBack();
        } else {
            // Nothing in our stack — re-push to keep the user in the app
            history.pushState({ flitDepth: 0 }, '');
        }
    });

    function getParam(key) { return params[key] ?? null; }

    function register(pageId, handlers) {
        pages['page-' + pageId] = handlers;
    }

    // Delegated back-button handler — any element with data-back triggers back()
    document.addEventListener('click', e => {
        if (e.target.closest('[data-back]')) back();
    });

    return { navigate, back, getParam, register };
})();
