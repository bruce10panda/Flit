const TRANSLATIONS = {
    en: {
        // add-source
        add_a_source:     'Add a Source',
        rss_feed:         'RSS Feed',
        bluesky:          'Bluesky',
        rss_placeholder:  'https://flit.news/rss',
        bsky_placeholder: '@flit.news',
        // new-space
        add_a_space:      'Add a Space',
        edit_a_space_title: 'Edit a Space',
        name_your_space:  'Name your space',
        space_name_placeholder: 'Space Name',
        edit_theme:       'Edit theme',
        create_your_space: 'Create your Space',
        save_changes:     'Save Changes',
        // feed / reader
        recent_updates:   'Recent Updates',
        loading:          'Loading {name}...',
        no_posts:         'No posts found.',
        error_loading:    'Error loading profile.',
        min_read:         '{n} min read',
        // time
        just_now:         'Just now',
        hr_suffix:        'H',
        day_suffix:       'D',
        // article
        loading_article:  'Loading...',
        open_on:          'Open on {domain}',
        open_source:      'Open Original Source',
        // preferences
        preferences:      'Preferences',
        edit_a_space:     'Edit a Space',
        reader_settings:  'Reader Settings',
        use_builtin_reader: 'Use Built-in Reader',
        use_clean_reader: 'Use Clean Reader',
        app_settings:     'App Settings',
        language:         'Language',
        edit_space:       'Edit Space',
        delete_sources:   'Delete Sources',
        // sidebar
        home:             'Home',
        add_feed:         'Add Feed',
        new_space:        'New Space',
        spaces:           'SPACES',
    },
    nl: {
        // add-source
        add_a_source:     'Bron toevoegen',
        rss_feed:         'RSS-feed',
        bluesky:          'Bluesky',
        rss_placeholder:  'https://flit.news/rss',
        bsky_placeholder: '@flit.news',
        // new-space
        add_a_space:      'Space toevoegen',
        edit_a_space_title: 'Space bewerken',
        name_your_space:  'Benoem je space',
        space_name_placeholder: 'Spacenaam',
        edit_theme:       'Thema bewerken',
        create_your_space: 'Space aanmaken',
        save_changes:     'Wijzigingen opslaan',
        // feed / reader
        recent_updates:   'Recente updates',
        loading:          '{name} laden…',
        no_posts:         'Geen berichten gevonden.',
        error_loading:    'Fout bij laden van profiel.',
        min_read:         '{n} min lezen',
        // time
        just_now:         'Zojuist',
        hr_suffix:        'u',
        day_suffix:       'd',
        // article
        loading_article:  'Laden…',
        open_on:          'Openen op {domain}',
        open_source:      'Originele bron openen',
        // preferences
        preferences:      'Voorkeuren',
        edit_a_space:     'Space bewerken',
        reader_settings:  'Lezersinstelling',
        use_builtin_reader: 'Ingebouwde lezer gebruiken',
        use_clean_reader: 'Schone lezer gebruiken',
        app_settings:     'App-instellingen',
        language:         'Taal',
        edit_space:       'Space bewerken',
        delete_sources:   'Bronnen verwijderen',
        // sidebar
        home:             'Home',
        add_feed:         'Feed toevoegen',
        new_space:        'Nieuwe space',
        spaces:           'SPACES',
    },
};

const _lang = localStorage.getItem('flit_lang') || 'en';

window.flitLang = _lang;

window.t = function (key, vars) {
    const str = TRANSLATIONS[_lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
};

// Apply data-i18n attributes as soon as the DOM is ready.
// Scripts are at the bottom of <body> so the DOM is already parsed.
function _applyTranslations() {
    document.documentElement.lang = _lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = window.t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = window.t(el.dataset.i18nPlaceholder);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _applyTranslations);
} else {
    _applyTranslations();
}
