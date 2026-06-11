const TEMPLATES = {
    tech: {
        name:  'Tech News',
        emoji: '💻',
        theme: { bg: '#0d1b2a', fg: '#c8dff5' },
        feeds: [
            'https://9to5google.com/feed/',
            'https://www.theverge.com/rss/index.xml',
            'https://www.androidcentral.com/feed',
        ],
    },
    apple: {
        name:  'Apple News',
        emoji: '🍎',
        theme: { bg: '#1c1c1e', fg: '#f5f5f7' },
        feeds: [
            'https://9to5mac.com/feed/',
            'https://feeds.macrumors.com/MacRumors-All',
            'https://www.iculture.nl/feed/',
            '@basicappleguy.com',
        ],
    },
    sports: {
        name:  'Sports',
        emoji: '🏆',
        theme: { bg: '#0a2010', fg: '#d4f0dc' },
        feeds: [
            'https://www.cbssports.com/rss/headlines/',
            'https://feeds.foxsports.com/rss/foxsports-all',
        ],
    },
    world: {
        name:  'World News',
        emoji: '🌍',
        theme: { bg: '#111827', fg: '#d4dff0' },
        feeds: [
            'https://feeds.bbci.co.uk/news/world/rss.xml',
            'https://rss.cnn.com/rss/edition.rss',
            'https://feeds.nos.nl/nosnieuws',
        ],
    },
};

const steps = ['step-welcome', 'step-language', 'step-template', 'step-reader'];
let current = 0;

function goTo(index) {
    const prev = document.getElementById(steps[current]);
    const next = document.getElementById(steps[index]);

    prev.classList.remove('active');
    prev.classList.add('exit-left');

    prev.addEventListener('transitionend', () => {
        prev.classList.remove('exit-left');
    }, { once: true });

    next.style.transform = 'translateX(100%)';
    next.style.opacity = '0';

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            next.classList.add('active');
            next.style.transform = '';
            next.style.opacity = '';
        });
    });

    current = index;
}

function selectOption(el) {
    const group = el.dataset.group;
    document.querySelectorAll(`[data-group="${group}"]`).forEach(opt => opt.classList.remove('selected'));
    el.classList.add('selected');
    if (group === 'lang') window.switchLang(el.dataset.value);
}

async function finish() {
    const lang     = document.querySelector('[data-group="lang"].selected')?.dataset.value || 'en';
    const template = document.querySelector('[data-group="template"].selected')?.dataset.value || 'tech';
    const reader   = document.querySelector('[data-group="reader"].selected')?.dataset.value || 'reader';

    const t = TEMPLATES[template] || TEMPLATES.tech;

    await FlitStorage.updateSpaceOverride(0, {
        extraFeeds: t.feeds,
        name:  t.name,
        emoji: t.emoji,
        theme: t.theme,
    });

    await FlitStorage.updatePreferences({
        language: lang,
        template,
        open_in_reader:      reader === 'reader' || reader === 'clean',
        experimental_reader: reader === 'clean',
        open_in_browser:     reader === 'browser',
        onboarding_done: true,
    });

    window.location.href = 'index.html';
}
