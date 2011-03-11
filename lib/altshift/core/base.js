/*jslint nodejs: true, indent:4 */

var util = require('util'),
    inspect = util.inspect;

var EMPTY = {};
var FORMAT_ESCAPE = '\\';
var FORMAT_EXPRESSION_START = '{';
var FORMAT_EXPRESSION_STOP = '}';
var FORMAT_EXPRESSION = new RegExp(FORMAT_ESCAPE + FORMAT_EXPRESSION_START + '([^}]*)' + FORMAT_ESCAPE + FORMAT_EXPRESSION_STOP, 'gim');
var FORMAT_SPEC = new RegExp(
    //"^" +
    "(" +
    "([^\\{\\}]?)" + //fill
    "([<>=\\^])" + //align
    ")?" +
    "([\\ +-]?)" + //sign
    "(\\#?)" +
    "(\\0?)" +
    "([0-9]*)" //width
    //"$"
);

function FUNCTION_VOID() {}

function FUNCTION_IDENTITY(o) {
    return o;
}

function lpad(str, length, char) {
    str = '' + str;
    char = char || ' ';
    while (str.length < length) {
        str = char + str;
    }
    return str;
}

function rpad(str, length, char) {
    str = '' + str;
    char = char || ' ';
    while (str.length < length) {
        str = str + char;
    }
    return str;
}

function formatArgGet(args, path) {
    path = ('' + path);

    var i, part,
        length = path.length,
        parts = [],
        token = '',
        bracket = false,
        root = args;

    for (i = 0; i < length; i += 1) {
        part = path[i];

        if (part === '[') {
            if (bracket) {
                token += part;
            } else {
                bracket = true;
            }
        } else if (part === ']') {
            if (!bracket) {
                throw new Error('Parse error : unopened bracket');
            }
            bracket = false;
            parts.push(token);
            token = '';
        } else if (part === '.') {
            if (bracket) {
                token += part;
            } else {
                parts.push(token);
                token = '';
            }
        } else {
            token += part;
        }
    }

    if (token !== '') {
        parts.push(token);
    }

    //
    length = parts.length;
    for (i = 0; i < length; i += 1) {
        part = parts[i];
        root = root[part];

        if (root === undefined) {
            return root;
        }
    }

    return root;
}

function formatValueSpec(value, spec) {
    var parts = spec.match(FORMAT_SPEC),
        fill = parts[2] || ' ',
        align = parts[3],
        width = parts[7];

    switch (align) {
    case '<':
        value = rpad(value, width);
        break;
    case '>':
        value = lpad(value, width);
        break;
    case '^':
        value = lpad(rpad(value, value.length / 2 + width / 2), width);
        break;
    }
    return value;
}

/**
 * Format string with `args`
 *
 * @see http://docs.python.org/release/3.1.3/library/string.html#format-string-syntax
 *
 * @param {string} string
 * @param {Array|Object} args
 * @return {string}
 */
function format(string, args) {
    if (
        string.length === 0 ||
        !args ||
        Object.keys(args).length === 0
    ) {
        return string;
    }
    var matchVar = '[0-9a-zA-Z_$\\.]+',
        matchBrackets = '\\[[^\\]]*\\]',
        matchParsing = new RegExp(
            //"^" +
            "((" + matchVar + "|" + matchBrackets + ")*)" + //Match arg path
            "(!([rsa]))?" + //Conversion
            "(:([^\\?\\!]+))?" //spec
            //"$"
        ),
        matchCount = 0;

    return string.replace(FORMAT_EXPRESSION, function (_, match) {
        var parts = match.match(matchParsing),
            argName = parts[1] || matchCount,
            conversion = parts[4] || 's', //Default is string conversion
            formatSpec = parts[6],
            value = formatArgGet(args, argName);

        matchCount += 1;
        if (value === undefined) {
            return FORMAT_EXPRESSION_START + match + FORMAT_EXPRESSION_STOP;//Replace unchanged
        }

        if (formatSpec && formatSpec.length > 0) {
            value = formatValueSpec(value, formatSpec);
        }

        //Conversion s, r or a
        switch (conversion) {
        case 's':
            return '' + value;
        case 'r':
            return inspect(value);
        case 'a':
            throw new Error('Not yet implemented conversion "' + conversion + '"');
        default:
            throw new Error('Invalid conversion "' + conversion + '"');
        }


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

    //Default implementation
    if (obj.clone) {
        return obj.clone(obj, deep);
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

/**
 * Exports
 */
exports.destroy = destroy;
exports.format = format;
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