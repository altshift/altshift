/*jslint indent:4 */
/**
 * Imports
 */
var klass = require('./class');
var dictionary = require('./dictionary');


var EMPTY = {};
/**
 * Mix all props, ... into `obj`
 *
 * @param {Object} obj
 * @param {Object} props
 * @return {Object}
 */
function mixin(obj, props) {
    var argi = 1,
        argc = arguments.length,
        source, property, value;

    if (!obj) {
        obj = {};
    }

    while (argi < argc) {
        source = arguments[argi];
        for (property in source) {
            value = source[property];
            if (
                !(property in obj) ||
                (obj[property] !== value && (!(property in EMPTY) || EMPTY[property] !== value))
            ) {
                obj[property] = value;
            }
        }
        argi += 1;
    }
    return obj; // Object
}

//export class
mixin(exports, klass);

//export dictionary
mixin(exports, dictionary);


/**
 * Return true if `obj` is a string
 *
 * @param {*} obj
 * @return {boolean}
 */
function isString(obj) {
    return (typeof obj === "string" || obj instanceof String);
}

/**
 * Return true if `obj` is an Array
 *
 * @param {*} obj
 * @return {boolean}
 */
function isArray(obj) {
    return obj && (obj instanceof Array || typeof obj === "array");
}

/**
 * Return true if `obj` is a Function
 *
 * @param {*} obj
 * @return {boolean}
 */
function isFunction(obj) {
    return (obj instanceof Function);
}

/**
 * Return true if `obj` is an Object
 *
 * @param {*} obj
 * @return {boolean}
 */
function isObject(obj) {
    return obj !== undefined &&
        (obj === null || typeof obj === "object" || isArray(obj) || isFunction(obj));
}

/**
 * Will destroy object
 *
 * @param {Object} object
 * @return undefined
 */
function destroy(object) {
    if (isObject(object)) {
        if (isFunction(object.finalize)) {
            object.finalize();
        }
        for (var property in object) {
            if (true) {//For lint
                delete object[property];
            }
        }
    }
}

/**
 * Clone an object
 *
 * @param {*} obj
 * @return {*}
 */
function clone(obj, deep) {
    if (!obj || typeof obj !== "object" || isFunction(obj)) {
        // null, undefined, any non-object, or function
        return obj;   // anything
    }
    if (obj instanceof Date) {
        // Date
        return new Date(obj.getTime());   // Date
    }
    var result, index, length, value;
    if (isArray(obj)) {
        // array
        result = [];
        if (deep) {
            for (index = 0, length = obj.length; index < length; index += 1) {
                if (index in obj) {
                    value = obj[index];
                    value = value.clone ? value.clone(true) : clone(value);
                    result.push(clone(value));
                }
            }
        } else {
            for (index = 0, length = obj.length; index < length; index += 1) {
                if (index in obj) {
                    result.push(value);
                }
            }
        }
        return result;
    }

    // generic objects
    result = obj.constructor ? new obj.constructor() : {};

    for (index in obj) {
        value = obj[index];
        if (
            !(index in result) ||
            (result[index] !== value && (!(index in EMPTY) || EMPTY[index] !== value))
        ) {
            result[index] = clone(value);
        }
    }

    return result; // Object
}

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
exports.dict = _dict;
exports.destroy = destroy;

exports.isString = isString;
exports.isArray = isArray;
exports.isFunction = isFunction;
exports.isObject = isObject;

exports.FUNCTION_VOID = function () {};
exports.FUNCTION_IDENTITY = function (o) {
    return o;
};