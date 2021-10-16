/* global PNotify, showConfirmationDialog */

export const has = Object.prototype.hasOwnProperty;

export const Notify = {
    notice: (options) => new PNotify({ type: 'notice', ...options }),
    info: (options) => new PNotify({ type: 'info', ...options }),
    success: (options) => new PNotify({ type: 'success', ...options }),
    error: (options) => new PNotify({ type: 'error', hide: false, ...options }),
};

export const Dialog = {
    show: (options) => showConfirmationDialog({ question: ' ', ...options }),
};

/**
 * When a function is called as a method of an object, 'this' is set to the object the method is
 * called on. This 'autobind' function is intended to be used within a class constructor to bind
 * all methods to the instance itself. This allows to pass methods as callback functions and be
 * sure that the callback will be invoked with the correct context.
 */
export function autobind() {
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
export function sortStringAsc(a, b) {
    const left = a.toLowerCase();
    const right = b.toLowerCase();
    const maybeSmaller = left < right ? -1 : 1;
    return left === right ? 0 : maybeSmaller;
}
