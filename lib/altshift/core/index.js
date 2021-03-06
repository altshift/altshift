/*jslint nodejs: true, indent:4 */
/**
 * Imports
 */
var base = require('./base'),
    mixin = base.mixin,
    isFunction = base.isFunction;
var klass = require('./class');
var dictionary = require('./dictionary');

mixin(exports, base);

//export class
mixin(exports, klass);

//export dictionary
mixin(exports, dictionary);


/*******************************************************************************
 * Shorcuts
 ******************************************************************************/
/**
 * Shortcut to create new module
 *
 * @param {String} name
 * @param {Object} methods
 * @param {Object} options
 * @return {Module}
 */
var _module = function (name, methods, options) {
    return new klass.Module(name, methods, options);
};

/**
 * Shortcut to create new class
 *
 * @param {String} name
 * @param {Class} parent
 * @param {Object} methods
 * @return {Class}
 */
var _class = function (name, parent, methods) {
    if (! name || typeof(name) !== 'string' || name.length === 0) {
        throw new exports.ValueError({message: '`name` should be a non empty string.'});
    }

    if (parent && !isFunction(parent)) {
        methods = parent;
        parent = Object;
    }
    return new klass.Class(name, parent, methods);
};

/**
 * Shortcut to create new interface
 *
 * @param {String} name
 * @param {Object} methods
 * @return {Interface}
 */
var _interface = function (name, methods) {
    return new klass.Interface(name, methods);
};

/**
 * Shortcut for dictionary creation
 *
 * @param {Dictionary|Object} options
 * @return {Dictionary}
 */
var _dict = function (options) {
    return new dictionary.Dictionary(options);
};

/**
 * Exports
 */
exports.module = _module;
exports.class = _class;
exports.interface = _interface;
