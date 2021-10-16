(function () {
    'use strict';

    const BASE_URL = 'plugin/themify/api';

    class Client {
        static getThemeList(opts = {}) {
            return OctoPrint.get(`${BASE_URL}/themes`, opts);
        }

        static getTheme(theme, opts = {}) {
            return OctoPrint.get(`${BASE_URL}/themes/${theme}`, { dataType: 'text', ...opts });
        }

        static deleteTheme(theme, opts = {}) {
            return OctoPrint.delete(`${BASE_URL}/themes/${theme}`, opts);
        }

        static saveTheme(theme, data, opts = {}) {
            return OctoPrint.post(`${BASE_URL}/themes/${theme}`, data, { contentType: 'application/text', ...opts });
        }
    }

    /* global PNotify, showConfirmationDialog */

    const has = Object.prototype.hasOwnProperty;

    const Notify = {
        notice: (options) => new PNotify({ type: 'notice', ...options }),
        info: (options) => new PNotify({ type: 'info', ...options }),
        success: (options) => new PNotify({ type: 'success', ...options }),
        error: (options) => new PNotify({ type: 'error', hide: false, ...options }),
    };

    const Dialog = {
        show: (options) => showConfirmationDialog({ question: ' ', ...options }),
    };

    /**
     * When a function is called as a method of an object, 'this' is set to the object the method is
     * called on. This 'autobind' function is intended to be used within a class constructor to bind
     * all methods to the instance itself. This allows to pass methods as callback functions and be
     * sure that the callback will be invoked with the correct context.
     */
    function autobind() {
        const prototype = Object.getPrototypeOf(this);
        Object.getOwnPropertyNames(prototype).forEach((name) => {
            if (typeof this[name] === 'function' && name !== 'constructor') {
                this[name] = this[name].bind(this);
            }
        });
    }

    /**
     * Sorting function for ascending order which compares two strings in a case insensitive manner.
     */
    function sortStringAsc(a, b) {
        const left = a.toLowerCase();
        const right = b.toLowerCase();
        const maybeSmaller = left < right ? -1 : 1;
        return left === right ? 0 : maybeSmaller;
    }

    class Editor {
        constructor() {
            autobind.call(this);
            this.clear();
        }

        clear() {
            this.theme = undefined;
            this.newFlag = false;

            if (this.content === undefined) {
                this.content = ko.observable('').extend({ dirtyFlag: false });
            } else {
                this.content('');
                this.content.setClean();
            }
        }

        new(name) {
            this.theme = name;
            this.newFlag = true;

            this.content('');
            this.content.setDirty();
        }

        load(name) {
            this.theme = name;
            return Client.getTheme(name)
                .done((response) => {
                    this.content(response);
                    this.content.setClean();
                    this.newFlag = false;
                });
        }

        save() {
            return Client.saveTheme(this.theme, this.content())
                .done(() => {
                    this.content.setClean();
                    this.newFlag = false;
                });
        }

        isNew() {
            return this.newFlag;
        }

        isModified() {
            return this.content.isDirty();
        }

        /**
         * Insert two spaces on tab.
         */
        handleTabKey(data, event) {
            if (event.originalEvent.key !== 'Tab') return true;

            const editor = document.getElementById(event.target.id);
            const content = editor.value;

            const contentBeforeTab = content.slice(0, editor.selectionStart);
            const contentAfterTab = content.slice(editor.selectionEnd, content.length);
            // Where cursor moves after tab - moving forward by two chars
            const cursorPos = editor.selectionEnd + 2;
            this.content(`${contentBeforeTab}  ${contentAfterTab}`); // Add two spaces
            // Move cursor
            editor.selectionStart = cursorPos;
            editor.selectionEnd = cursorPos;

            return false;
        }
    }

    // TODO: Should be a static property once this is supported by eslint's parser
    const THEMES_URL = 'plugin/themify/static/themes';

    class Settings {
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
            this.switchTheme(theme || this.plugin.theme());
            this.editor.load(this.plugin.theme());
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

    /**
     * Knockout extension to validate observables.
     */
    class ObservableValidator {
        /**
         * Must be called on startup before the view models are loaded.
         */
        constructor() {
            ObservableValidator.registerValidatableExtender();
            ObservableValidator.registerValueBindingHandler();
        }

        /**
         * Registers an extender for each defined validation rule.
         */
        registerRuleExtenders(rules) { // eslint-disable-line class-methods-use-this
            Object.entries(rules).forEach(([name, def]) => (
                ObservableValidator.registerRuleExtender(name, def)
            ));
        }

        /**
         * Adds a rule to the given observable and makes the observable validatable.
         */
        static addRuleTo(observable, rule) {
            observable.extend({ validatable: true });
            observable.rules.push(rule);
            return observable;
        }

        /**
         * Registers a rule with the given name.
         */
        static registerRuleExtender(name, rule) {
            if (!ko.extenders[name]) {
                ko.extenders[name] = (observable, param) => (
                    ObservableValidator.addRuleTo(observable, { param, def: rule })
                );
            }
        }

        /**
         * Registers a custom value binding handler which inserts a help-block for the error
         * message, at the end of the '.controls' element and adds bindings for bootstraps
         * error class to the related '.control-group'.
         */
        static registerValueBindingHandler() {
            const { init } = ko.bindingHandlers.value;

            // Override value binding
            ko.bindingHandlers.value.init = (element, valueAccessor, allBindings) => {
                init(element, valueAccessor, allBindings);

                const observable = valueAccessor();
                if (!ObservableValidator.isValidatable(observable)) return;

                // Set error class
                const controlGroup = element.closest('.control-group');
                ko.applyBindingsToNode(controlGroup, { css: { error: observable.hasError } });

                // Insert error message element
                const lastControlsElement = element.closest('.controls').lastElementChild;
                lastControlsElement.insertAdjacentHTML(
                    'afterend', '<span class="help-block"></span>',
                );
                ko.applyBindingsToNode(
                    lastControlsElement.nextSibling,
                    { visible: observable.hasError, text: observable.errorMessage },
                );
            };
        }

        /**
         * Registers a extender that makes a knockout observable validatable. On each update of
         * the rules array or the observables value of an validatable the new value will be
         * checked against all assgned rules.
         */
        static registerValidatableExtender() {
            const message = (rule) => (rule ? rule.def.message.replace('{0}', rule.param) : '');

            ko.extenders.validatable = (observable, enable) => {
                /* eslint no-param-reassign: ["error", { "props": false }] */
                if (enable && !ObservableValidator.isValidatable(observable)) {
                    observable.rules = ko.observableArray([]);
                    observable.errorMessage = ko.observable('');
                    observable.hasError = ko.computed(() => {
                        const error = observable.rules().find((rule) => (
                            !rule.def.validator(observable(), rule.param)
                        ));
                        observable.errorMessage(message(error));
                        return !!error;
                    });
                }
            };
        }

        /**
         * Checks if an observable is validatable.
         */
        static isValidatable(observable) {
            return ko.isObservable(observable)
                && has.call(observable, 'hasError')
                && has.call(observable, 'errorMessage')
                && has.call(observable, 'rules');
        }
    }

    /* eslint no-param-reassign: ["error", { "props": true, "ignorePropertyModificationsFor": ["target"] }] */

    var registerKnockoutExtensions = () => {
        /**
         *  Adds a dirty flag to the observable which is true whenever the observable has changed
         *  since the last setClean(). Note that isDirty() is not subscribable.
         */
        ko.extenders.dirtyFlag = function koExtensionDirtyFlag(target, dirty) {
            let cleanValue = ko.mapping.toJSON(target);
            let dirtyOverride = dirty;

            target.isDirty = () => dirtyOverride || ko.mapping.toJSON(target) !== cleanValue;

            target.setClean = () => {
                cleanValue = ko.mapping.toJSON(target);
                dirtyOverride = false;
            };

            target.setDirty = () => {
                dirtyOverride = true;
            };
        };

        /* Validation rules */

        const validationRules = {};

        validationRules.validFilename = {
            validator: (value, required) => !required || !['/', '\\', ':', '*', '?', '"', '<', '>', '|'].some((char) => (
                value?.includes(char)
            )),
            message: `${gettext('Contains invalid characters:')} / \\ : * ? " < > |`,
        };

        /* Initialize validator extension */

        if (ko.validator === undefined) {
            ko.validator = new ObservableValidator();
        }

        ko.validator.registerRuleExtenders(validationRules);
    };

    class ThemifyPlugin {
        constructor(dependencies) {
            registerKnockoutExtensions();

            this.core = { viewModels: {} };

            [
                this.core.viewModels.settings,
            ] = dependencies;

            this.viewModels = {};
            this.viewModels.settings = new Settings();

            this.addCallbacks([
                'onSettingsShown',
                'onSettingsBeforeSave',
                'onStartupComplete',
            ]);
        }

        callOnAllViewModels(funcName, ...args) {
            Object.keys(this.viewModels).forEach((viewModel) => {
                this.viewModels[viewModel][funcName]?.(...args);
            });
        }

        addCallbacks(callbacks) {
            callbacks.forEach((funcName) => {
                Object.getPrototypeOf(this)[funcName] = (...args) => this.callOnAllViewModels(funcName, ...args);
            });
        }

        // ViewModel callbacks

        onBeforeBinding() {
            // This is the earliest state where settingsViewModels.settings is defined
            this.viewModels.settings.initialize(this.core.viewModels.settings);
            this.callOnAllViewModels('onBeforeBinding');
        }
    }

    OCTOPRINT_VIEWMODELS.push({
        construct: ThemifyPlugin,
        dependencies: [
            'settingsViewModel',
        ],
        elements: [
            '#settings_plugin_themify',
        ],
    });

})();
