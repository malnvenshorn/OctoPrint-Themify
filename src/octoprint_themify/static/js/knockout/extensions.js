/* eslint no-param-reassign: ["error", { "props": true, "ignorePropertyModificationsFor": ["target"] }] */

import ObservableValidator from './validator';

export default () => {
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
