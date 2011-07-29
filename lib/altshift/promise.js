/*jslint nodejs: true, indent:4 */
/**
 * Promise module
 *
 * @module
 */
/**
 * Imports
 */
var core = require('./core'),
    Class = core.class,
    slice = Array.prototype.slice,
    isArray = core.isArray,
    enqueue = process.nextTick;
var contextHandler = {};

var Promise, Deferred;

/*******************************************************************************
 * Promise class
 *
 * Usage:
 *
 * <pre>
 *  //1. For trusted code
 *  var Promise = require('promise').Promise;
 *  var promiseObj = new Promise();
 *  asynchronousOperation(function () {
 *      promiseObj.emitSuccess("successful result");
 *  });
 *  return promiseObj //-> given to the consumer
 *
 *  //-OR- for untrusted code
 *  return deferred.promise -> given to the consumer
 *
 *
 *  //2. In the consumer
 *  promiseObj.then(function (result) {
 *      ... when the action is complete this is executed ...
 *  },
 *  function (error) {
 *      ... executed when the promise fails
 *  });
 * </pre>
 *
 *
 * Other Usage:
 *
 * <pre>
 * var when = require("promise").when;
 * when(promise, function (result){
 * ... when the action is complete this is executed ...
 * },
 * function (error){
 * ... executed when the promise fails
 * });
 * </pre>
 *
 * References:
 *
 * @class
 * @link http://wiki.commonjs.org/wiki/Promises
 * @link https://github.com/kriszyp/node-promise
 * @link https://github.com/kriskowal/q
 *
 ******************************************************************************/
Promise = Class('Promise', {
    extend: {
        NO_ERROR: null,
        NO_RESULT: null,

        /**
         * Return true if obj is a Promise
         *
         * @param {*} object
         * @return {boolean}
         */
        isPromise: function (object) {
            return object && (object.then instanceof Function);
        },

        /**
         * Return new Deferred promise
         *
         * @param {Function} canceller
         * @return {Deferred}
         */
        defer: function (canceller) {
            return new Deferred();
        },

        /**
         * Registers an observer on a promise.
         *
         * @param {*} value promise or value to observe
         * @param {Function} resolvedCallback function to be called with the resolved value
         * @param {Function} rejectCallback function to be called with the rejection reason
         * @param {Function} progressCallback function to be called when progress is made
         * @return {Promise} promise for the return value from the invoked callback or the value
         *         if it is a non-promise value
         */
        when: function (value, resolvedCallback, rejectCallback, progressCallback) {
            if (this.isPromise(value)) {
                return value.then(resolvedCallback, rejectCallback, progressCallback);
            }
            var deferred = this.defer();
            deferred.then(resolvedCallback, rejectCallback, progressCallback);
            deferred.emitSuccess(value);

            return deferred.getPromise();
        },

        /**
         * Takes an array of promises and returns a promise that is fulfilled once all
         * the promises in the array are fulfilled
         *
         * @param {Array} array The array of promises
         * @return {Promise} the promise that is fulfilled when all the array is fulfilled, resolved to the array of results
         */
        all: function (array) {
            var self = this,
                deferred = new Deferred(),
                fulfilled = 0,
                length,
                results = [],
                hasError = false;

            if (!isArray(array)) {
                array = slice.call(arguments);
            }
            length = array.length;

            if (length === 0) {
                deferred.emitSuccess(results);
            } else {
                array.forEach(function (promise, index) {

                    self.when(promise,
                        //Success
                        function (value) {
                            results[index] = value;
                            fulfilled += 1;
                            if (fulfilled === length) {

                                if (hasError) {
                                    deferred.emitError(results);
                                } else {
                                    deferred.emitSuccess(results);
                                }
                            }
                        },
                        //Error
                        function (error) {
                            results[index] = error;
                            hasError = true;
                            fulfilled += 1;
                            if (fulfilled === length) {
                                deferred.emitError(results);
                            }
                        }
                    );
                });
            }
            return deferred.getPromise();
        },

        /**
         * Takes an array of promises and returns a promise that is fulfilled when the
         * first promise in the array of promises is fulfilled
         *
         * @param {Array} array The array of promises
         * @return {Promise} a promise that is fulfilled with the value of the value of first
         *         promise to be fulfilled
         */
        first: function (array) {
            var self = this,
                deferred = new Deferred(),
                fulfilled = false,
                index, length,
                onSuccess = function (value) {
                    if (!fulfilled) {
                        fulfilled = true;
                        deferred.emitSuccess(value);
                    }
                },
                onError = function (error) {
                    if (!fulfilled) {
                        fulfilled = true;
                        deferred.emitSuccess(error);
                    }
                };

            if (!isArray(array)) {
                array = slice.call(arguments);
            }
            for (index = 0, length = array.length; index < length; index += 1) {
                this.when(array[index], onSuccess, onError);
            }
            return deferred.getPromise();
        },

        /**
         * Takes an array of asynchronous functions (that return promises) and executes
         * them sequentially. Each function is called with the return value of the last
         * function
         *
         * @param {Array} array The array of function
         * @param {*} startingValue The value to pass to the first function
         * @return the value returned from the last function
         */
        reduce: function (array, startingValue) {
            array = array.slice(); // make a copy
            var self = this,
                deferred = new Deferred(),
                next = function (value) {
                    var nextAction = array.shift();
                    if (nextAction) {
                        self.when(nextAction(value), next, deferred.reject);
                    } else {
                        deferred.emitSuccess(value);
                    }
                };
            next(startingValue);
            return deferred.getPromise();
        },

        /**
         * Delays for a given amount of time and then fulfills the returned promise.
         *
         * @param {int} milliseconds The number of milliseconds to delay
         * @return {Promise} A promise that will be fulfilled after the delay
         */
        delay: function (milliseconds) {
            var deferred,
                timer = setTimeout(function () {
                    deferred.emitSuccess();
                }, milliseconds),
                canceller = function () {
                    clearTimeout(timer);
                };
            deferred = new Deferred(canceller);
            return deferred.getPromise();
        },

        /**
         * Runs a function that takes a callback, but returns a Promise instead.
         *
         * @param {Function} asyncFunction func node compatible async function
         * @return {Promise} promise for the return value from the callback from the function
         */
        execute: function (asyncFunction) {
            var args = slice.call(arguments, 1),
                deferred = new Deferred();

            args.push(function (error, result) {
                if (error) {
                    deferred.emitError(error);
                } else {
                    if (arguments.length > 2) {
                        // if there are multiple success values, we return an array
                        Array.prototype.shift.call(arguments, 1);
                        deferred.emitSuccess(arguments);
                    } else {
                        deferred.emitSuccess(result);
                    }
                }
            });
            asyncFunction.apply(this, args);
            return deferred.getPromise();
        }
    },

    /**
     * Default constructor that creates a self-resolving Promise. Not all promise implementations
     * need to use this constructor.
     *
     * @constructor
     * @param {Function} canceller
     */
    initialize: function (canceller) {

    },

    /**
     * Destruct the object
     *
     */
    finalize: function () {
        this.cancel();
        this.callSuper();
    },

    /**
     * Promise implementations must provide a "then" function.
     *
     * @param {Function} resolvedCallback
     * @param {Function} errorCallback
     * @param {Function} progressCallback
     */
    then: function (resolvedCallback, errorCallback, progressCallback) {
        throw new core.NotImplemented({
            message: "The Promise base class is abstract, this function must be implemented by the Promise implementation"
        });
    },

    /**
     * If an implementation of a promise supports a concurrency model that
     * allows execution to block until the promise is resolved, the wait
     * function may be added.
     */
    /**
     * If an implementation of a promise can be cancelled, it may add this
     * function
     */
    /*cancel: function () {

    },*/

    /**
     * Return the value corresponding to [propertyName]
     *
     * @param {string|int} propertyName
     * @return {*}
     */
    get: function (propertyName) {
        return this.then(function (value) {
            return value[propertyName];
        });
    },

    /**
     * Set the value corresponding to [propertyName]
     *
     * @param {string} propertyName
     * @return {*}
     */
    set: function (propertyName, value) {
        return this.then(function (object) {
            object[propertyName] = value;
            return value;
        });
    },

    /**
     * Call the function `functionName(*args)`
     *
     * @param {string} functionName
     * @return {*}
     */
    apply: function (functionName, args) {
        return this.then(function (value) {
            return value[functionName].apply(value, args);
        });
    },

    /** Dojo/NodeJS methods */
    /**
     * Add a result callback
     *
     * @param {Function} callback
     */
    addCallback: function (callback) {
        return this.then(callback);
    },

    /**
     * Add a error callback
     * @param {Function} errback
     */
    addErrback: function (errback) {
        return this.then(core.FUNCTION_VOID, errback);
    },

    /*Dojo methods*/
    /**
     * Add a function as error & result callback
     *
     * @param {Function} callback
     * @return {Promise}
     */
    addBoth: function (callback) {
        return this.then(callback, callback);
    },

    /**
     * Add result & error callbacks
     *
     * @param {Function} callback
     * @param {Function} errback
     * @return {Promise}
     */
    addCallbacks: function (callback, errback) {
        return this.then(callback, errback);
    },

    /*NodeJS method*/
    /*wait: function () {
        return exports.wait(this);
    }*/

    and: function (values) {
        values = isArray(values) ? values.slice() : slice.call(arguments);
        values.unshift(this);

        return this.klass.all(values);
    },

    or: function (values) {
        if (!isArray(values)) {
            values = slice.call(arguments);
        } else {
            values = values.slice();
        }
        values.unshift(this);

        return this.klass.first(values);
    }
});

/*******************************************************************************
 * Deferred promise class
 *
 * Usage:
 *
 * <pre>
 * </pre>
 *
 * @class
 ******************************************************************************/
Deferred = Class('Deferred', Promise, {

    /**
     * Deferred constructor
     *
     * @constructor
     * @param {Function} canceller
     */
    initialize : function (canceller) {
        var self = this;
        this._canceller = canceller;
        this._timeout = null;
        this._timer = null;

        this.handled = false;

        this.waiting = [];
        this.result = undefined;
        this.isError = false;
        this.finished = false;

        //this.currentContextHandler = contextHandler.getHandler && contextHandler.getHandler();
        this.__defineGetter__('promise', this.getPromise);
    },
    /**
     * Destructor
     */
    finalize : function () {
        this.cancel();
        this.callSuper();
    },

    getPromise: function () {
        if (!this._promise) {
            var self = this;
            this._promise = new Promise();

            if (this._canceller) {
                this._promise.cancel = function () {
                    self.cancel();
                };
            }

            this._promise.then = function (resolvedCallback, errorCallback, progressCallback) {
                return self.then(resolvedCallback, errorCallback, progressCallback);
            };
        }
        return this._promise;
    },

    /**
     * Return a new promise
     *
     * @param {Function} resolvedCallback
     * @param {Function} errorCallback
     * @param {Function} progressCallback
     * @return {Promise}
     */
    then: function (resolvedCallback, errorCallback, progressCallback) {
        var returnDeferred = new Deferred(this._canceller), //new Deferred(this.getPromise().cancel)
            listener = {
                resolved : resolvedCallback,
                error : errorCallback,
                progress : progressCallback,
                deferred : returnDeferred
            };

        if (this.finished) {
            this._notify(listener);
        } else {
            this.waiting.push(listener);
        }
        return returnDeferred.getPromise();
    },

    /**
     * Calling emitSuccess will resolve the promise
     *
     * @param {*} value send to all resolved callbacks
     * @return {boolean} true if handled
     */
    emitSuccess: function (value) {
        this._notifyAll(value);
        return this.handled;
    },
    callback: function (value) {
        this._notifyAll(value);
        return this.handled;
    },
    resolve: function (value) {
        this._notifyAll(value);
        return this.handled;
    },


    /**
     * Calling emitError will indicate that the promise failed
     *
     * @param {*} value send to all resolved callbacks
     * @return this
     */
    emitError: function (error, dontThrow) {
        var self = this;

        self.isError = true;
        self._notifyAll(error);
        if (!dontThrow) {
            enqueue(function () {
                if (!self.handled) {
                    throw error;
                }
            });
        }
        return self.handled;
    },
    errback: function (error, dontThrow) {
        return this.emitError(error, dontThrow);
    },
    reject: function (error, dontThrow) {
        return this.emitError(error, dontThrow);
    },

    /**
     * Call progress on every waiting function to notify that the promise was updated
     *
     * @param {*} update
     * @return this
     */
    progress: function (update) {
        var waiting = this.waiting,
            length = waiting.length,
            index,
            progress;

        for (index = 0; index < length; index += 1) {
            progress = waiting[index].progress;
            if (progress) {
                progress(update);
            }
        }
        return this;
    },

    /**
     * Cancel the promise
     *
     * @return {boolean} true if error was handled
     */
    cancel: function () {
        if (!this.finished && this._canceller) {
            var error = this._canceller();
            if (!(error instanceof Error)) {
                error = new Error(error);
            }
            return this.emitError(error);
        }
        return false;
    },

    /**
     * Set the timeout in milliseconds to auto cancel the promise
     *
     * @param {int} milliseconds
     * @return this
     */
    timeout: function (milliseconds) {
        if (milliseconds === undefined) {
            milliseconds = this._timeout;
        }

        var self = this;

        if (self._timeout !== milliseconds) {
            self._timeout = milliseconds;
            if (self._timer) {
                clearTimeout(this._timer);
                self._timer = null;
            }

            if (milliseconds) {
                this._timer = setTimeout(function () {
                    self._timer = null;
                    if (!self.finished) {
                        var error = new core.Error({
                            code: 'timeout',
                            message: 'Promise has timeout'
                        });

                        /*if (self.getPromise().cancel) {
                            self.getPromise().cancel(error);
                        } else {
                            self.emitError(error);
                        }*/

                        if (this._canceller) {
                            self.cancel(error);
                        } else {
                            self.emitError(error);
                        }
                    }
                }, milliseconds);
            }
        }
        return this;
    },

    _notify: function (listener) {
        var self = this,
            callback = (this.isError ? listener.error : listener.resolved),
            deferred = listener.deferred;
        if (callback) {
            this.handled = true;
            enqueue(function () {
                var newResult;

                if (this.currentContextHandler) {
                    this.currentContextHandler.resume();
                }
                try {
                    newResult = callback(self.result);

                    if (Promise.isPromise(newResult)) {
                        newResult.then(deferred.emitSuccess.bind(deferred), deferred.emitError.bind(deferred));
                        return;
                    }
                    deferred.emitSuccess(newResult);
                } catch (e) {
                    deferred.emitError(e);
                } finally {
                    if (this.currentContextHandler) {
                        this.currentContextHandler.suspend();
                    }
                }
            });
        } else {
            if (this.isError) {
                if (deferred.emitError(this.result, true)) {
                    this.handled = true;
                }
            } else {
                deferred.emitSuccess(this.result);
            }
        }
    },

    _notifyAll: function (value) {
        if (this.finished) {
            throw new Error("This deferred has already been resolved");
        }
        this.result = value;
        this.finished = true;

        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }

        var waiting = this.waiting,
            length = waiting.length,
            index;
        for (index = 0; index < length; index += 1) {
            this._notify(waiting[index]);
        }
    }
});

function perform(value, async, sync) {
    var deferred;
    try {
        if (Promise.isPromise(value)) {
            value = async(value);
        } else {
            value = sync(value);
        }
        if (Promise.isPromise(value)) {
            return value;
        }
        deferred = new Deferred();
        deferred.emitSuccess(value);
        return deferred.getPromise();
    } catch (e) {
        deferred = new Deferred();
        deferred.emitError(e);
        return deferred.getPromise();
    }

}

/**
 * Promise manager to make it easier to consume promises
 */

/**
 * Return true if obj is a Promise
 *
 * @param {*} obj
 * @return {boolean}
 */
var isPromise = Promise.isPromise;

/**
 * Registers an observer on a promise.
 *
 * @param {*} value promise or value to observe
 * @param {Function} resolvedCallback function to be called with the resolved value
 * @param {Function} rejectCallback function to be called with the rejection reason
 * @param {Function} progressCallback function to be called when progress is made
 * @return {Promise} promise for the return value from the invoked callback or the value
 *         if it is a non-promise value
 */
var when = function (value, resolvedCallback, rejectCallback, progressCallback) {
    return Promise.when(value, resolvedCallback, rejectCallback, progressCallback);
};

/**
 * Registers an observer on a promise.
 *
 * @param {Promise} value promise or value to observe
 * @param {Function} resolvedCallback function to be called with the resolved value
 * @param {Function} rejectCallback function to be called with the rejection reason
 * @param {Function} progressCallback function to be called when progress is made
 * @return {Promise} promise for the return value from the invoked callback
 */
var whenPromise = function (value, resolvedCallback, rejectCallback, progressCallback) {
    return perform(value, function (value) {
        return value.then(resolvedCallback, rejectCallback, progressCallback);
    }, function (value) {
        return resolvedCallback(value);
    });
};

/**
 * Gets the value of a property in a future turn.
 *
 * @param {Promise} target promise or value for target object
 * @param {string} property name of property to get
 * @return {Promise} promise for the property value
 */
var get = function (target, property) {
    return perform(target, function (target) {
        return target.get(property);
    }, function (target) {
        return target[property];
    });
};

/**
 * Invokes a method in a future turn.
 *
 * @param {Promise} target promise or value for target object
 * @param {string} methodName name of method to invoke
 * @param {Array} args array of invocation arguments
 * @return {Promise} promise for the return value
 */
var apply = function (target, methodName, args) {
    return perform(target, function (target) {
        return target.apply(methodName, args);
    }, function (target) {
        return target[methodName].apply(target, args);
    });
};

/**
 * Sets the value of a property in a future turn.
 *
 * @param {Promise} target promise or value for target object
 * @param {string} property name of property to set
 * @param {*} value new value of property
 * @return promise for the return value
 */
var set = function (target, property, value) {
    return perform(target, function (target) {
        return target.set(property, value);
    }, function (target) {
        target[property] = value;
        return value;
    });
};

/**
 * Waits for the given promise to finish, blocking (and executing other events)
 * if necessary to wait for the promise to finish. If target is not a promise it
 * will return the target immediately. If the promise results in an reject, that
 * reject will be thrown.
 *
 * @param {Promise} target promise or value to wait for.
 * @return {Promise} the value of the promise;
 */
/*var wait = function (target) {
    if (!queue) {
        throw new Error("Cannot wait, the event-queue module is not available");
    }
    if (Promise.isPromise(target)) {
        var isFinished, isError, result;
        target.then(function (value) {
            isFinished = true;
            result = value;
        }, function (error) {
            isFinished = true;
            isError = true;
            result = error;
        });
        while (!isFinished) {
            queue.processNextEvent(true);
        }
        if (isError) {
            throw result;
        }
        return result;
    } else {
        return target;
    }
};*/

/**
 * Takes an array of promises and returns a promise that is fulfilled once all
 * the promises in the array are fulfilled
 *
 * @param {Array} array The array of promises
 * @return {Promise} the promise that is fulfilled when all the array is fulfilled, resolved to the array of results
 */
var all = function (array) {
    return Promise.all.apply(Promise, arguments);
};

/**
 * Takes an array of promises and returns a promise that is fulfilled when the
 * first promise in the array of promises is fulfilled
 *
 * @param {Array} array The array of promises
 * @return {Promise} a promise that is fulfilled with the value of the value of first
 *         promise to be fulfilled
 */
var first = function (array) {
    return Promise.first.apply(Promise, arguments);
};

/**
 * Takes an array of asynchronous functions (that return promises) and executes
 * them sequentially. Each function is called with the return value of the last
 * function
 *
 * @param {Array} array The array of function
 * @param {*} startingValue The value to pass to the first function
 * @return the value returned from the last function
 */
var reduce = function (array, startingValue) {
    return Promise.reduce.apply(Promise, arguments);
};

/**
 * Delays for a given amount of time and then fulfills the returned promise.
 *
 * @param {int} milliseconds The number of milliseconds to delay
 * @return {Promise} A promise that will be fulfilled after the delay
 */
var delay = function (milliseconds) {
    return Promise.delay.apply(Promise, arguments);
};

/**
 * Runs a function that takes a callback, but returns a Promise instead.
 *
 * @param {Function} asyncFunction func node compatible async function
 * @return {Promise} promise for the return value from the callback from the function
 */
var execute = function (asyncFunction) {
    return Promise.execute.apply(Promise, arguments);
};

/**
 * Converts a Node async function to a promise returning function
 *
 * @param {Function} asyncFunction node async function which takes a callback as its last argument
 * @param {boolean} callbackNotDeclared true if callback is optional in the definition
 * @return {Function} A function that returns a promise
 */
var convertNodeAsyncFunction = function (asyncFunction, callbackNotDeclared) {
    var arity = asyncFunction.length;

    return function () {
        var deferred = new Deferred(),
            args = slice.call(arguments),
            callback;
        if (callbackNotDeclared && !args[args.length + 1] instanceof Function) {
            arity = args.length + 1;
        }
        callback = args[arity - 1];

        args.splice(arity);
        args[arity - 1] = function (error, result) {
            if (error) {
                deferred.emitError(error);
            } else {
                if (args.length > 2) {
                    // if there are multiple success values, we return an array
                    args.shift(1);
                    deferred.emitSuccess(args);
                } else {
                    deferred.emitSuccess(result);
                }
            }
        };
        asyncFunction.apply(this, args);

        //Node old school
        if (callback) {
            deferred.then(
                function (result) {
                    callback(Promise.NO_ERROR, result);
                },
                function (error) {
                    callback(error, Promise.NO_RESULT);
                }
            );
        }

        return deferred.getPromise();
    };
};

/**
 * Exports
 */
exports.Promise = Deferred;
exports.Deferred = Deferred;
exports.defer = function () {
    return new Deferred();
};
exports.NO_ERROR = Promise.NO_ERROR;
exports.NO_RESULT = Promise.NO_RESULT;

exports.contextHandler = contextHandler;

exports.isPromise = isPromise;
exports.whenPromise = whenPromise;
exports.when = when;
exports.get = get;
exports.set = set;
exports.apply = apply;
//exports.wait = wait;
exports.all = all;
exports.first = first;
exports.reduce = reduce;
exports.delay = delay;
exports.execute = execute;
exports.convertNodeAsyncFunction = convertNodeAsyncFunction;
