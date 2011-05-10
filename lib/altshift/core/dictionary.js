/*jslint nodejs: true, indent:4 */
var klass = require('./class');
var FUNCTION_VOID = function () {};

/*******************************************************************************
 * Dictionary class
 *
 * Usage:
 *
 * <pre>
 * var hash = new Dictionary({foo: 'some text', bar: 'fdjsklj'});
 *
 * hash.update({foo: 'new text', baz: 'new key'})
 * hash.forEach(function (value, key) {
 *   //...some code here
 * });
 * </pre>
 ******************************************************************************/
var Dictionary = new klass.Class('Dictionary', {
    /**
     * Dictionary constructor
     *
     * @constructor
     * @param {Object} data
     */
    initialize: function (data) {
        this.update(data);
        Object.defineProperty(this, 'length', {
            enumerable: false,
            get: this.count,
            set: FUNCTION_VOID
        });
    },

    /**
     * Return true if
     *
     * @param {*} other
     * @return {boolean}
     */
    equals: function (other) {
        if (!(other instanceof this.klass)) {
            return false;
        }

        if (this === other) {
            return true;
        }

        var myKeys, otherKeys, key, i;

        try {
            myKeys = this.keys();
            otherKeys = other.keys();
        } catch (e) {//happens when one is a string literal and the other isn't
            return false;
        }

        // having the same number of owned properties (keys incorporates hasOwnProperty)
        if (myKeys.length !== otherKeys.length) {
            return false;
        }

        //the same set of keys (although not necessarily the same order),
        myKeys.sort();
        otherKeys.sort();
        //~~~cheap key test
        i = myKeys.length;
        while (i > 0) {
            i -= 1;
            if (myKeys[i] !== otherKeys[i]) {
                return false;
            }
        }

        //equivalent values for every corresponding key, and
        //~~~possibly expensive deep test
        i = myKeys.length;
        while (i) {
            i -= 1;
            key = myKeys[i];

            if (this[key].equals instanceof Function && !this[key].equals(other[key])) {
                return false;
            }

            if (this[key] !== other[key]) {
                return false;
            }
        }
        return true;
    },

    /**
     * Return a hash string of this object
     *
     * @return {String}
     */
    hash: function () {
        var hashes = [],
            value, key, hashKey, hashValue;

        for (key in this) {
            if (this.hasOwnProperty(key)) {
                value = this[key];
                hashKey = String(key);
                hashValue = (value.hash instanceof Function) ? value.hash() : value.toString();
                hashValue = (hashKey > hashValue) ? hashValue + hashKey : hashKey + hashValue;
                hashes.push(hashValue);
            }
        }

        return hashes.sort().join('');
    },

    /**
     * Create a copy of this object
     *
     * @return {Dictionary} the new Dictionary
     */
    clone: function (deep) {
        if (deep) {
            var clone = function (obj) {
                var clonedObj, key;

                if (obj === null) {
                    return null;
                }

                if (typeof(obj) !== 'object' && typeof(obj) !== 'array') {
                    return obj;
                }

                if (Array.isArray(obj)) {
                    return obj.slice();
                }

                clonedObj = Object.create(Object.getPrototypeOf(obj));

                for (key in obj) {
                    if (obj[key] !== undefined && obj.hasOwnProperty(key)) {
                        clonedObj[key] = obj[key].clone ? obj[key].clone(true) : clone(obj[key]);
                    }
                }

                return clonedObj;
            };
            return clone(this);
        } else {
            return (new this.klass()).update(this);
        }
    },

    /**
     * Merge all the objectExtension into hash data
     *
     * @param {Object} objectExtension
     * @return this
     */
    update: function (objectExtension) {
        var dataKey, dataValue;

        if (objectExtension) {
            for (dataKey in objectExtension) {
                if (objectExtension.hasOwnProperty(dataKey)) {
                    if (this[dataKey] !== undefined && !this.hasOwnProperty(dataKey)) {
                        throw new Error('Property "' + dataKey + '" is internal and could not be set');
                    }
                    this[dataKey] = objectExtension[dataKey];
                }
            }
        }
        return this;
    },

    /**
     * Traverse all Dictionary data calling iterator(value, key)
     *
     * @param {Function} iterator
     * @param {*} thisp
     * @return this
     */
    forEach: function (iterator, thisp) {
        if (! (iterator instanceof Function)) {
            throw new TypeError('iterator should be a Function');
        }
        var key;

        for (key in this) {
            if (this.hasOwnProperty(key)) {
                iterator.call(thisp, this[key], key, this);
            }
        }
        return this;
    },

    /**
     * Filter all
     *
     * @param {Function} iterator
     * @return this
     */
    filter: function (iterator) {
        if (!(iterator instanceof Function)) {
            throw new TypeError('first argument should be a function.');
        }

        var key, value, thisp, result;

        result = new this.klass();

        thisp = arguments[1];
        for (key in this) {
            if (this.hasOwnProperty(key)) {
                value = this[key];
                if (iterator.call(thisp, value, key, this)) {
                    result[key] = value;
                }
            }
        }

        return result;
    },

    /**
     * Return true if data[key] is set
     *
     * @param {string} key
     * @return {boolean}
     */
    isset: function (key) {
        return (this[key] !== undefined && this.hasOwnProperty(key));
    },

    /**
     * Return the data[key] value or defaultValue if not set
     *
     * @param {string|int} key
     * @param {*} defaultValue
     * @return {*}
     */
    get: function (key, defaultValue) {
        var value = this[key];
        return value !== undefined && this.hasOwnProperty(key) ? value : defaultValue;
    },

    /**
     * Set the data[key] to value. If key is an object, set all the values.
     *
     * @param {string|int} key
     * @param {*} value
     * @return this
     */
    set: function (key, value) {
        if (typeof (key) === 'object') {
            this.update(key);
        } else if (value !== undefined) {
            if (this[key] !== undefined && !this.hasOwnProperty(key)) {
                throw new Error('Property "' + key + '" is internal could not be set');
            }
            this[key] = value;
        } else {
            this.unset(key);
        }

        return this;
    },

    /**
     * Return data[key] or defaultValue (and delete it)
     *
     * @param {string|int} key
     * @param {*} defaultValue
     * @return
     */
    unset: function (key, defaultValue) {
        var value = this[key];
        if (value !== undefined) {
            if (!this.hasOwnProperty(key)) {
                throw new Error('Property "' + key + '" is internal and could not be unset');
            }
            delete this[key];
            return value;
        }

        return defaultValue;
    },

    /**
     * Return the first key found for `value`
     *
     * @param {*} value
     * @return {string|int}
     */
    key: function (value) {
        var thisKey, thisValue;
        for (thisKey in this) {
            if (this.hasOwnProperty(thisKey)) {
                thisValue = this[thisKey];
                if (thisValue === value || (thisValue.equals instanceof Function && thisValue.equals(value))) {
                    thisValue = this[thisKey];
                    return thisKey;
                }
            }
        }
        return undefined;
    },

    /**
     * Return Array containing all keys
     *
     * @return {Array}
     */
    keys: function () {
        return Object.keys(this);
    },

    /**
     * Return Array containing all values
     *
     * @return {Array}
     */
    values: function () {
        var values, key;
        values = [];
        for (key in this) {
            if (this.hasOwnProperty(key)) {
                values.push(this[key]);
            }
        }
        return values;
    },

    /**
     * Return the key count
     *
     * @return {int}
     */
    count: function (iterator, thisp) {
        if (!iterator) {
            return this.keys().length;
        } else {
            if (!(iterator instanceof Function)) {
                throw new TypeError('first argument should be a function.');
            }

            var key, value, result;

            result = 0;
            for (key in this) {
                if (this.hasOwnProperty(key)) {
                    value = this[key];
                    if (iterator.call(thisp, value, key, this)) {
                        result += 1;
                    }
                }
            }
            return result;
        }
    },

    /**
     * Empty the hash
     *
     * @return this
     */
    clear: function () {
        var key;
        for (key in this) {
            if (this.hasOwnProperty(key)) {
                delete this[key];
            }
        }
        return this;
    },

    /**
     * Create a new dictionary calling iterator on every value. Iterator must retun a [key, value] array.
     *
     * @param {Function} iterator will be called as iterator(value, key, dictionary)
     * @param {Object=} thisp
     * @return {Dictionary}
     */
    map: function (iterator, thisp) {
        if (!(iterator instanceof Function)) {
            throw new TypeError('first argument should be a function.');
        }

        var result = new this.klass(), property, keyValue, key, value;
        for (property in this) {
            if (this.hasOwnProperty(property)) {
                keyValue = iterator.call(thisp, this[property], property, this);
                if (keyValue) {
                    if (!(keyValue instanceof Array)) {
                        throw new TypeError(keyValue + 'iterator() result should return a [key, value] object');
                    }
                    key = keyValue[0];
                    value = keyValue[1];
                    result[key] = value;
                }
            }
        }
        return result;
    }
});

/**
 * Exports
 */
exports.Dictionary = Dictionary;