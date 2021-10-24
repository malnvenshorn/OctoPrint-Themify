import Editor from './editor';
import Client from '../client';

import {
    Notify,
    Dialog,
    autobind,
    sortStringAsc,
} from '../utils';

// TODO: Should be a static property once this is supported by eslint's parser
const THEMES_URL = 'plugin/themify/static/themes';

export default class Settings {
    constructor() {
        autobind.call(this);

        this.global = undefined;
        this.plugin = undefined;

        this.themeList = ko.observableArray([]);
        this.newThemeName = ko.observable().extend({ validFilename: true });

        this.editor = new Editor();
    }

    // ViewModel callbacks

    onBeforeBinding() {
        // Populate the list with the current theme, otherwise the theme would be set to undefined
        this.themeList([this.plugin.theme()]);

        // Theme enable toggled
        this.plugin.enable.subscribe((enable) => {
            if (enable && !this.editor.isNew()) {
                Settings.enableTheme(this.plugin.theme());
            } else {
                Settings.disableTheme();
            }
        });

        // Selected theme has changed
        this.plugin.theme.subscribe((theme) => {
            this.switchThemeSafe(theme);
        });
    }

    onStartupComplete() {
        // Apply theme, either from URL parameter or settings
        const url = new URL(window.location.href);
        const theme = url.searchParams.get('theme');
        // Load theme list, so we can check whether or not the selected theme exists. If the theme dosn't exist
        // the current theme will be 'undefined' and therefore not loaded.
        Client.getThemeList().done((response) => {
            this.themeList(response);
            this.switchTheme(theme || this.plugin.theme());
        });
    }

    onSettingsShown() {
        // Update list of themes
        Client.getThemeList().done((response) => {
            if (this.editor.isNew()) {
                // A new theme is unsaved and won't be returned therefore we have to manually add the entry.
                response.push(this.editor.theme);
                response.sort(sortStringAsc);
            }
            this.themeList(response);
        });
    }

    onSettingsBeforeSave() {
        if (!this.plugin.theme()) return;
        this.editor.save()
            // Enable theme again to apply changes
            .done(() => Settings.enableTheme(this.plugin.theme()))
            // Show error message
            .fail((response) => {
                Notify.error({
                    title: gettext('Failed to save theme'),
                    text: response.responseJSON.description,
                });
            });
    }

    // Class methods

    initialize(settings) {
        this.global = settings;
        this.plugin = this.global.settings.plugins.themify;
    }

    openDeleteThemeDialog() {
        const theme = this.plugin.theme();
        if (!theme || this.editor.isNew()) return;
        Dialog.show({
            title: gettext('Delete theme?'),
            message: gettext(`This will remove your <strong>${theme}</strong> theme.`),
            cancel: gettext('Cancel'),
            proceed: gettext('Delete'),
            onproceed: () => this.deleteTheme(theme),
        });
    }

    openDiscardChangesDialog({ discard, cancel }) {
        Dialog.show({
            title: gettext('Discard changes?'),
            message: gettext(`There are unsaved changes. You will lose all changes made to the <strong>${this.editor.theme}</strong> theme if you continue.`),
            cancel: gettext('Cancel'),
            proceed: gettext('Discard'),
            onproceed: discard,
            oncancel: cancel,
            noclose: true,
        });
    }

    deleteTheme(theme) {
        if (!theme) return;
        this.editor.clear();
        const updatedThemeList = this.themeList().filter((entry) => entry !== theme);
        this.themeList(updatedThemeList);
        Client.deleteTheme(theme)
            .fail((response) => {
                Notify.error({
                    title: gettext('Failed to delete theme'),
                    text: response.responseJSON.description,
                });
            });
    }

    switchThemeSafe(theme) {
        if (this.editor.isModified()) {
            if (theme !== this.editor.theme) {
                this.openDiscardChangesDialog({
                    discard: () => {
                        if (this.editor.isNew()) this.themeList.remove(this.editor.theme);
                        this.switchTheme(this.plugin.theme());
                    },
                    cancel: () => this.plugin.theme(this.editor.theme),
                });
            }
        } else {
            this.switchTheme(theme);
        }
    }

    switchTheme(theme) {
        if (theme) {
            this.editor.load(theme);
            if (this.plugin.enable()) {
                Settings.enableTheme(theme);
            }
        } else {
            this.editor.clear();
            Settings.disableTheme();
        }
    }

    addNewThemeSafe() {
        if (!this.newThemeName()?.trim().length > 0 || this.newThemeName.hasError()) return;
        if (this.editor.isModified()) {
            this.openDiscardChangesDialog({
                discard: () => {
                    // If current theme is new and therefore unsaved remove it from the list. It is removed after
                    // the new theme is added to prevent the dialog from popping up again, because otherwise we
                    // are triggering a theme change while the editor is still in a modified state.
                    const theme = this.editor.isNew() ? this.editor.theme : undefined;
                    this.addNewTheme();
                    if (theme) this.themeList.remove(theme);
                },
            });
        } else {
            this.addNewTheme();
        }
    }

    addNewTheme() {
        this.editor.new(this.newThemeName());
        this.themeList.push(this.newThemeName());
        this.plugin.theme(this.newThemeName());
        this.newThemeName(undefined);
        Settings.disableTheme();
        this.themeList.sort(sortStringAsc);
    }

    static enableTheme(theme) {
        Settings.disableTheme();
        if (!theme) return;
        const headNode = document.querySelector('head');
        const linkTag = document.createElement('link');
        linkTag.href = `${THEMES_URL}/${theme}.css`;
        linkTag.setAttribute('rel', 'stylesheet');
        headNode.appendChild(linkTag);
    }

    static disableTheme() {
        document.querySelector(`link[href^="${THEMES_URL}"]`)?.remove();
    }
}
