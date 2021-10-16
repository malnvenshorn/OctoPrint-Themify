import { has } from '../utils';

/**
 * Knockout extension to validate observables.
 */
export default class ObservableValidator {
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
