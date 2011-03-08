/*jslint nodejs: true, indent:4 */

var EMPTY = {};

function FUNCTION_VOID() {}

function FUNCTION_IDENTITY(o) {
    return o;
}

/**
 * Format string with `args`
 *
 * @param {string} string
 * @param {Array|Object} args
 * @return {string}
 */
var FORMAT_EXPRESSION = new RegExp('\\{([^}]+)\\}', 'gim');
function format(string, args) {
    return string.replace(FORMAT_EXPRESSION, function (_, match) {
        return args[match];
    });
}

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
            if (source.hasOwnProperty(property)) {
                value = source[property];
                if (obj[property] !== value) {
                    obj[property] = value;
                }
            }
        }
        argi += 1;
    }
    return obj; // Object
}

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
    return !!obj && (obj instanceof Array || typeof obj === "array");
}

/**
 * Return true if `obj` is a Function
 *
 * @param {*} obj
 * @return {boolean}
 */
function isFunction(obj) {
    return !!obj && Object.prototype.toString.call(obj) ===  "[object Function]";
}

/**
 * Return true if `obj` is an Object
 *
 * @param {*} obj
 * @return {boolean}
 */
function isObject(obj) {
    return obj !== undefined &&
        (obj === null || typeof obj === "object" ||
         typeof obj === "array" || obj instanceof Array ||
         Object.prototype.toString.call(obj) ===  "[object Function]"
    );
}

/**
 * Return true if `obj` is a scalar
 *
 * @param {*} obj
 * @return {boolean}
 */
function isScalar(obj) {
    var type = typeof obj;
    return (type !== 'undefined' && (
        obj === null ||
        type === 'string' ||
        type === 'number' ||
        type === 'boolean'
    ));
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
        if (true) {//jslint validation
            value = obj[index];
            if (
                !(index in result) ||
                (result[index] !== value && (!(index in EMPTY) || EMPTY[index] !== value))
            ) {
                result[index] = clone(value);
            }
        }
    }

    return result; // Object
}

/**
 * Iterate on object
 *
 * @param {*} object
 * @param {Function} iterator
 * @param {*} thisp
 * @return undefined
 */
function forEach(object, iterator, thisp) {
    if (object) {
        if (object.forEach) {
            object.forEach(iterator, thisp);
            return;
        }
        //Default implementation
        if (! (iterator instanceof Function)) {
            throw new TypeError('iterator should be a Function');
        }

        var key, length;

        if (isString(object)) {
            length = object.length;
            for (key = 0; key < length; key += 1) {
                iterator.call(thisp, object[key], key, object);
            }
            return;
        }

        for (key in object) {
            if (object.hasOwnProperty(key)) {
                iterator.call(thisp, object[key], key, object);
            }
        }
    }
}

/**
 * Return a hash string for the object
 *
 * @param {*} object
 * @return {String}
 */
function hash(object) {
    if (object && isFunction(object.hash)) {
        return object.hash();
    }


    if (isScalar(object)) {
        return '' + object;
    }

    //Default implementation
    var hashes = [];

    forEach(object, function (value, key) {
        var hashKey = String(key),
            hashValue = hash(value);

        hashes.push([hashKey, hashValue].sort().join(''));
    });

    return hashes.sort().join('');
}

exports.destroy = destroy;
exports.forEach = forEach;
exports.hash = hash;
exports.mixin = mixin;
exports.isString = isString;
exports.isScalar = isScalar;
exports.isArray = isArray;
exports.isFunction = isFunction;
exports.isObject = isObject;

exports.FUNCTION_VOID = FUNCTION_VOID;
exports.FUNCTION_IDENTITY = FUNCTION_IDENTITY;