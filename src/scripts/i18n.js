const TRANSLATIONS = {
    en: {
        // onboarding
        ob_tagline:              'Catch up with stuff that matters.',
        ob_get_started:          'Get started',
        ob_select_language:      'Select a language',
        ob_next:                 'Next',
        ob_pick_template:        'Pick a template',
        ob_pick_template_sub:    'Start reading articles for your favorite categories right now!',
        ob_apple_news:           'Apple News',
        ob_tech_news:            'Tech News',
        ob_sports:               'Sports',
        ob_world_news:           'World News',
        ob_reader_title:         'How would you like to view the articles?',
        ob_reader_builtin:       'Built in Reader',
        ob_reader_builtin_desc:  'Read all articles in our reader. Some articles and unrelated stuff will show up.',
        ob_reader_clean_label:   'Experimental',
        ob_reader_clean:         'Built in Clean Reader',
        ob_reader_clean_desc:    'Read all articles in our reader. Articles will be clean and text/images only. It may remove stuff that was important to the article or cut off too early.',
        ob_reader_browser:       'Built in Browser',
        ob_reader_browser_desc:  'Read all articles in our browser. It will open the article in the app, without going to your external browser. Some sources are not supported.',
        ob_start_reading:        'Start reading',
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
        no_sources:       'No sources added.',
        // sidebar
        home:             'Home',
        add_feed:         'Add Feed',
        new_space:        'New Space',
        spaces:           'SPACES',
    },
    nl: {
        // onboarding
        ob_tagline:              'Blijf op de hoogte van wat ertoe doet.',
        ob_get_started:          'Aan de slag',
        ob_select_language:      'Kies een taal',
        ob_next:                 'Volgende',
        ob_pick_template:        'Kies een sjabloon',
        ob_pick_template_sub:    'Lees direct artikelen over jouw favoriete categorieën!',
        ob_apple_news:           'Apple-nieuws',
        ob_tech_news:            'Technieuws',
        ob_sports:               'Sport',
        ob_world_news:           'Wereldnieuws',
        ob_reader_title:         'Hoe wil je artikelen bekijken?',
        ob_reader_builtin:       'Ingebouwde lezer',
        ob_reader_builtin_desc:  'Lees alle artikelen in onze lezer. Sommige artikelen en ongerelateerde inhoud kunnen verschijnen.',
        ob_reader_clean_label:   'Experimenteel',
        ob_reader_clean:         'Ingebouwde schone lezer',
        ob_reader_clean_desc:    'Lees alle artikelen in onze lezer. Artikelen zijn schoon en bevatten alleen tekst en afbeeldingen. Er kan soms inhoud ontbreken of te vroeg worden afgekapt.',
        ob_reader_browser:       'Ingebouwde browser',
        ob_reader_browser_desc:  'Lees alle artikelen in onze browser. Het artikel opent in de app, zonder je externe browser. Sommige bronnen worden niet ondersteund.',
        ob_start_reading:        'Begin met lezen',
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
        no_sources:       'Geen bronnen toegevoegd.',
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

// Switch language at runtime (used by onboarding).
window.switchLang = function (lang) {
    if (!TRANSLATIONS[lang]) return;
    localStorage.setItem('flit_lang', lang);
    window.flitLang = lang;
    window.t = function (key, vars) {
        const str = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
        if (!vars) return str;
        return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
    };
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = window.t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = window.t(el.dataset.i18nPlaceholder);
    });
};
