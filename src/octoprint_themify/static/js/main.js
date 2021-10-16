import Settings from './viewmodels/settings';

import registerKnockoutExtensions from './knockout/extensions';

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
