/*jslint indent:4 */
/**
 * Imports
 */
var jsclass = require('../../js-class');
exports = jsclass;
module.exports = exports;
var NativeError = Error;

/**
 * Clone
 */
Object.displayName = 'Object';

function cloneObject(obj, deep) {
    var clonedObj, key, property;

    if (obj === null) {
        return null;
    }

    if (typeof(obj) !== 'object' && typeof(obj) !== 'array') {
        return obj;
    }

    if (deep) {
        clonedObj = (typeof(obj) !== 'array' && obj.constructor !== Array) ? Object.create(Object.getPrototypeOf(obj)) : new Array(obj.length);
        for (key in obj) {
            if (obj[key] !== undefined && obj.hasOwnProperty(key)) {
                clonedObj[key] = obj[key].clone ? obj[key].clone(true) : cloneObject(obj[key]);
            }
        }
    } else {
        clonedObj = Object.create(Object.getPrototypeOf(obj));
        for (property in obj) {
            if (obj.hasOwnProperty(property)) {
                clonedObj[property] = obj[property];
            }
        }
    }
    return clonedObj;
}

//Extend Kernel (for all Class objects)
jsclass.Kernel.include({
    clone: function (deep) {
        return cloneObject(this, deep);
    },
    toString: function () {
        switch (typeof(this)) {
        case 'object':
            return '<object ' + this.klass.displayName + '>';
        case 'function':
            return '<class ' + this.displayName + '>';
        }
    }
});

//Extend Class
jsclass.Class.include({
    clone: function (object, deep) {
        return cloneObject(object, deep);
    },
    export: function (_module) {
        if (! this.displayName || this.displayName.length === 0) {
            throw new exports.ValueError({message: 'class name is empty and could not be exported'});
        }

        var _exports = _module.exports || _module;
        _exports[this.displayName] = this;
        return this;
    }
});

/*******************************************************************************
 * Interface Class
 *
 * Usage:
 *
 * <pre>
 * </pre>
 *
 ******************************************************************************/
jsclass.Interface = new jsclass.Class('Interface', jsclass.Interface, {
    /**
     * Interface constructor
     *
     * @constructor
     * @param {String} name
     * @param {Array} methods
     */
    initialize: function (name, methods) {
        //this.callSuper(methods);
        this.name = name;
        this.methods = {};

        if (methods) {
            var n;
            //Add methods
            n = methods.length;
            while (n > 0) {
                n -= 1;
                this.methods[methods[n]] = true;
            }
        }
    },
    /**
     * Throw error if object does not have all methods
     *
     * @param {Object} object
     * @return this
     */
    assert: function (object) {
        var methodName;

        methodName = this.test(object, true);
        if (methodName !== true) {
            throw new exports.NotImplementedError({
                code: 'interface',
                message: 'Object %(object) does not implement %(interface)#%(method)()',

                //Additional information
                interface: this.name,
                object: object,
                method: methodName
            });
        }
        return this;
    },

    /**
     * Return false or the missing method name in object if method is missing in object
     *
     * @param {Object} object
     * @param {boolean} returnName
     * @return {boolean|string}
     */
    test: function (object, returnName) {
        var methodName;
        for (methodName in this.methods) {
            if (!(object[methodName] instanceof Function)) {
                return returnName ? methodName : false;
            }
        }
        return true;
    },

    /**
     * Export this interface into _exports
     *
     * @return this
     */
    export: function (_module) {
        if (! this.name) {
            throw new exports.ValueError({message: 'name is empty'});
        }
        var _exports = _module.exports || _module;
        _exports[this.name] = this;
        return this;
    }
});

/*******************************************************************************
 * BaseException Class
 *
 * Usage:
 *
 * <pre>
 * </pre>
 *
 ******************************************************************************/
var BaseException = new jsclass.Class('BaseException', {
    //include: [jsclass.ConstantScope],
    code: 'default',
    message: '',

    /**
     * @constructor
     */
    initialize: function (options) {
        var self = this, i, length, stackCallMatch, pattern, optionKey;

        this.name = this.constructor.displayName;

        options = options || {};
        if (typeof(options) === 'string') {
            options = {message: options};
        }

        //code
        this.code = options.code || this.code;

        //message
        Object.defineProperties(this, {
            __message__: {
                value: options.__message__ || options.message || this.message,
                enumerable: false,
                writable: true
            },
            message: {
                set: function (value) {
                    this.__message__ = value;
                },
                get: function () {
                    return self.getMessage();
                },
                enumerable: true
            }

        });
        if (options.message !== undefined) {
            this.message = options.message;
            delete options.message;
        }

        //Parse stack
        this.stack = (new NativeError()).stack.split("\n");

        //shift 4 first lines
        this.stack.shift();
        this.stack.shift();
        this.stack.shift();
        this.stack.shift();

        for (i = 0, length = this.stack.length; i < length; i += 1) {
            pattern = new RegExp(' at (.*) \\((.*):(\\d+):(\\d+)\\)$');
            stackCallMatch = this.stack[i].match(pattern);

            if (!stackCallMatch) {
                pattern = new RegExp('at ()(.*):(\\d+):(\\d+)$');
                stackCallMatch = this.stack[i].match(pattern);
            }

            if (stackCallMatch) {
                this.stack[i] = {
                    callback: stackCallMatch[1],
                    fileName: stackCallMatch[2],
                    line: parseInt(stackCallMatch[3], 10),
                    char: parseInt(stackCallMatch[4], 10)
                };
            } else {


                this.stack[i] = {
                    callback: '#ERROR_CALLBACK',
                    fileName: '#ERROR_FILENAME',
                    line: Number.NaN,
                    char: Number.NaN
                };
            }
        }

        this.stack.toString = function () {
            var output = '';

            output += self.toString() + '\n';
            this.forEach(function (row) {
                output += '    at ' + row.callback + ' (' +  row.fileName + ':' +  row.line + ':' + row.char + ')\n';
            });

            return output;
        }.bind(this.stack);

        //data
        this.data = {};
        for (optionKey in options) {
            if (options.hasOwnProperty(optionKey) && !this.data[optionKey]) {
                this.data[optionKey] = options[optionKey];
            }
        }
    },

    /**
     * Return JSON formatted Exception
     *
     * @return {string}
     */
    toJSON: function () {
        var json = {}, property;
        for (property in this) {
            if (this.hasOwnProperty(property)) {
                json[property] = this[property];
            }
        }
        return json;
    },

    /**
     * Return formatted message
     *
     * @return {string}
     */
    getMessage: function () {
        var prefix = '%(',
            suffix = ')',
            data = this.data,
            output = '',
            dataKey;

        output = this.__message__;
        for (dataKey in data) {

            if (data.hasOwnProperty(dataKey)) {
                output = output.replace(prefix + dataKey + suffix, '' + data[dataKey]);
            }
        }
        output = output.replace(prefix + 'code' + suffix, '' + this.code);
        output = output.replace(prefix + 'name' + suffix, '' + this.name);

        return output;
    },

    /**
     * Return string formatted representation
     *
     * @param {boolean} full
     * @return {string}
     */
    toString: function (full) {
        var output, data;

        output = this.name + '[' + this.code + ']: ';
        output += this.message;
        if (full) {
            output += '\n';
            output += this.stack.toString();
        }
        return output;
    }
}).export(module);



/*******************************************************************************
 * Native Error Class
 ******************************************************************************/
exports.NativeError = NativeError;

/*******************************************************************************
 * SystemExit Class
 ******************************************************************************/
var SystemExit = new jsclass.Class('SystemExit', BaseException, {
    code: 'exit',
    message: 'System exit with code %(code)'
}).export(module);

/*******************************************************************************
 * KeyboardInterrupt Class
 ******************************************************************************/
var KeyboardInterrupt = new jsclass.Class('KeyboardInterrupt', BaseException, {
    code: 'keyboard',
    message: 'Keyboard interruption received'
}).export(module);



/*******************************************************************************
 * Exception Class
 ******************************************************************************/
var Exception = new jsclass.Class('Exception', BaseException, {
    code: 'exception',
    message: 'Exception throwed'
}).export(module);

/*******************************************************************************
 * StopIteration Class
 ******************************************************************************/
var StopIteration = new jsclass.Class('StopIteration', BaseException, {
    code: 'iteration',
    message: 'Iteration stopped'
}).export(module);

/*******************************************************************************
 * Error Class
 ******************************************************************************/
exports.Error = new jsclass.Class('Error', Exception, {
    code: 'error',
    message: 'Error throwed'
}).export(module);

/*******************************************************************************
 * AssertionError Class
 ******************************************************************************/
var AssertionError = new jsclass.Class('AssertionError', exports.Error, {
    code: 'assertion',
    message: 'Assertion Error'
}).export(module);

/*******************************************************************************
 * RuntimeError Class
 ******************************************************************************/
var RuntimeError = new jsclass.Class('RuntimeError', exports.Error, {
    code: 'runtime',
    message: 'Error during execution'
}).export(module);

/*******************************************************************************
 * NotImplementedError Class
 ******************************************************************************/
var NotImplementedError = new jsclass.Class('NotImplementedError', RuntimeError, {
    code: 'implementation',
    message: '%(method) not implemented'
}).export(module);

/*******************************************************************************
 * SystemError Class
 ******************************************************************************/
var SystemError = new jsclass.Class('SystemError', exports.Error, {
    code: 'system',
    message: 'System error throwed'
}).export(module);

/*******************************************************************************
 * TypeError Class
 ******************************************************************************/
exports.TypeError = new jsclass.Class('TypeError', exports.Error, {
    code: 'type',
    message: 'Type error throwed'
}).export(module);

/*******************************************************************************
 * ValueError Class
 ******************************************************************************/
var ValueError = new jsclass.Class('ValueError', exports.Error, {
    code: 'value',
    message: 'Value error throwed'
}).export(module);

/*******************************************************************************
 * LookupError Class
 ******************************************************************************/
var LookupError = new jsclass.Class('LookupError', exports.Error, {
    message: 'Lookup error throwed'
}).export(module);

/*******************************************************************************
 * IndexError Class
 ******************************************************************************/
var IndexError = new jsclass.Class('IndexError', LookupError, {
    code: 'index',
    message: 'Index error throwed'
}).export(module);

/*******************************************************************************
 * KeyError Class
 ******************************************************************************/
var KeyError = new jsclass.Class('KeyError', LookupError, {
    code: 'key',
    message: 'Key error throwed'
}).export(module);


//Warnings
var Warning = new jsclass.Class('Warning', Exception, {
    message: 'Warning throwed'
}).export(module);

var DeprecationWarning = new jsclass.Class('DeprecationWarning', Warning, {
    message: 'Deprecation warning throwed'
}).export(module);

var SyntaxWarning = new jsclass.Class('SyntaxWarning', Warning, {
    message: 'Syntax warning throwed'
}).export(module);

var RuntimeWarning = new jsclass.Class('RuntimeWarning', Warning, {
    message: 'Runtime warning throwed'
}).export(module);

var UserWarning = new jsclass.Class('UserWarning', Warning, {
    message: 'User warning throwed'
}).export(module);
//--FutureWarning


