/*jslint nodejs: true, indent:4 */
/**
 * Generic Imports
 */
var vows = require('vows');
var assert = require('assert');
var path = require('path');

var env = require('../_env');
var __filenameTested = path.join(
    path.dirname(__filename).replace(global.TEST, global.LIB),
    path.basename(__filename).replace('-test.js', '.js')
);

/**
 * Imports
 */
var promise = require(__filenameTested);

/*******************************************************************************
 * JSLint validation
 ******************************************************************************/
try {
    require('lint').vows.createTest([__filename, __filenameTested]).export(module);
} catch (e) {
    console.warn('Warning: JSLint not found try `npm install lint`');
}

/*******************************************************************************
 * PromiseTest
 ******************************************************************************/
var PromiseTest = vows.describe('Promise').addBatch({
    'new Deferred(), new Promise(), defer()': {
        topic: function () {
            return new promise.Promise();
        },
        "should be instance of Promise": function (topic) {
            assert.ok(topic instanceof promise.Promise);
            assert.ok(topic instanceof promise.Deferred);
            assert.ok(promise.isPromise(topic));

            topic = new promise.Deferred();
            assert.ok(topic instanceof promise.Deferred);
            assert.ok(topic instanceof promise.Promise);
            assert.ok(promise.isPromise(topic));

            topic = promise.defer();
            assert.ok(topic instanceof promise.Deferred);
            assert.ok(topic instanceof promise.Promise);
            assert.ok(promise.isPromise(topic));
        }
    },
    'emitSuccess()': {
        topic: function () {
            var self = this,
                report = {
                    promise: new promise.Deferred()
                };
            report.promise.then(function (result) {
                report.result = result;
                self.callback(null, report);
            });

            setTimeout(function () {
                report.promise.emitSuccess('successful result');
            }, 1);
        },
        "should be instance of Promise": function (topic) {
            assert.ok(promise.isPromise(topic.promise));
        },
        "should emitSuccess passing value to the callback": function (topic) {
            assert.equal(topic.result, 'successful result');
        }
    },
    'emitError()': {
        topic: function () {
            var self = this,
                report = {
                    promise: new promise.Deferred()
                };
            report.promise.then(function (result) {
                report.result = result;
                self.callback(null, report);
            }, function (error) {
                report.error = error;
                self.callback(null, report);
            });

            setTimeout(function () {
                report.promise.emitError('error result');
            }, 1);
        },
        "should be instance of Promise": function (topic) {
            assert.ok(promise.isPromise(topic.promise));
        },
        "should emitError passing error to the callback": function (topic) {
            assert.equal(topic.error, 'error result');
        }
    },
    'cancel()': {
        topic: function () {
            var self = this,
                report = {
                    promise: new promise.Deferred(function () {
                        return 'foobar_cancelled';
                    })
                };
            report.promise.then(function (result) {
                report.value = 'success';
                self.callback(null, report);
            }, function (error) {
                report.error = error;
                self.callback(null, report);
            });

            setTimeout(function () {
                report.promise.cancel();

                try {
                    report.promise.emitSuccess();
                } catch (e) {
                    //Do nothing
                }
            }, 1);
        },
        "should be instance of Promise": function (topic) {
            assert.ok(promise.isPromise(topic.promise));
        },
        "should emitError passing canceller() result as error": function (topic) {
            assert.ok(topic.error instanceof Error);
            assert.equal(topic.error.message, 'foobar_cancelled');
        }
    },
    'timeout()': {
        topic: function () {
            var self = this,
                report = {
                    status: 'unknown',
                    promise: promise.defer(function () {
                        return 'cancelled';
                    }),
                    promiseAborted: promise.defer(function () {
                        return 'cancelled';
                    })
                };

            //Promise timeout
            report.promise.then(function (result) {
                report.status = 'success';
            }, function (error) {
                report.status = 'error';
                report.error = error;
            });
            report.promise.timeout(1);
            setTimeout(function () {
                try {
                    report.promise.emitSuccess();
                } catch (e) {
                    //Do nothing
                }
            }, 3);


            //Promise that will not timeout
            report.promiseAborted.then(function (result) {
                report.statusAborted = 'success';
            }, function (error) {
                report.statusAborted = 'error';
                report.errorAborted = error;
            });
            report.promiseAborted.timeout(1);
            report.promiseAborted.timeout(null);
            setTimeout(function () {
                try {
                    report.promiseAborted.emitSuccess();
                } catch (e) {
                    //Do nothing
                }
            }, 10);

            promise.all(report.promise, report.promiseAborted).then(function () {
                self.callback(null, report);
            });

        },
        "should return instance of Promise": function (topic) {
            assert.ok(promise.isPromise(topic.promise));
        },
        "should emitError after timeout": function (topic) {
            assert.equal(topic.status, 'error');
        },
        "should remove timeout if called as timeout(null)": function (topic) {
            assert.equal(topic.statusAborted, 'success');
        }
    }
});

/*******************************************************************************
 * FunctionTest
 ******************************************************************************/
var FunctionTest = vows.describe('promise module').addBatch({
    'when()': {
        topic: function () {
            var self = this,
                report = {
                    promise: new promise.Deferred()
                };

            report.returnValue = promise.when(report.promise, function (result) {
                report.result = result;
            });

            promise.when(report.promise, function (result) {
                report.result2 = result;
                self.callback(null, report);
            });

            setTimeout(function () {
                report.promise.emitSuccess('successful result');
            }, 1);
        },
        "should return instance of Promise": function (topic) {
            assert.ok(promise.isPromise(topic.returnValue));
        },
        "should emitSuccess passing value to the callback": function (topic) {
            assert.equal(topic.result, 'successful result');
            assert.equal(topic.result2, 'successful result');
        }

    },
    'get()': {
        topic: function () {
            var self = this,
                promiseFoo = promise.defer(),
                report = {
                    returnValue: promise.get(promiseFoo, 'fooKey')
                };

            promise.when(report.returnValue, function (result) {
                report.result = result;
                self.callback(null, report);
            });

            setTimeout(function () {
                promiseFoo.emitSuccess({
                    fooKey: 'fooValue'
                });
            }, 1);
        },
        "should return instance of Promise": function (topic) {
            assert.ok(promise.isPromise(topic.returnValue));
        },
        "should emitSuccess passing value to the callback": function (topic) {
            assert.equal(topic.result, 'fooValue');
        }
    },
    'set()': {
        topic: function () {
            var self = this,
                promiseFoo = promise.defer(),
                report = {
                    target: {fooKey: 'fooValue'},
                    returnValue: promise.set(promiseFoo, 'fooKey', 'barValue')
                };

            promise.when(report.returnValue, function (result) {
                report.result = result;
                self.callback(null, report);
            });

            setTimeout(function () {
                promiseFoo.emitSuccess(report.target);
            }, 1);
        },
        "should return instance of Promise": function (topic) {
            assert.ok(promise.isPromise(topic.returnValue));
        },
        "should emitSuccess passing value to the callback": function (topic) {
            assert.equal(topic.target.fooKey, 'barValue');
        }
    },
    'apply()': {
        topic: function () {
            var self = this,
                promiseFoo = promise.defer(),
                report = {
                    returnValue: promise.apply(promiseFoo, 'fooMethod', ['foo', 'bar', 1])
                };

            promise.when(report.returnValue, function (result) {
                report.result = result;
                self.callback(null, report);
            });

            setTimeout(function () {
                promiseFoo.emitSuccess({
                    fooMethod: function (foo1) {
                        return Array.prototype.join.call(arguments, ',');
                    }
                });
            }, 1);
        },
        "should return instance of Promise": function (topic) {
            assert.ok(promise.isPromise(topic.returnValue));
        },
        "should emitSuccess passing value to the callback": function (topic) {
            assert.equal(topic.result, 'foo,bar,1');
        }
    },
    'all()': {
        topic: function () {
            var self = this,
                promises = [
                    promise.defer(),
                    promise.defer(),
                    promise.defer(),
                    promise.defer(),
                    promise.defer()
                ],
                report = {
                    returnValue: promise.all(promises)
                };
            promise.when(report.returnValue, function (result) {
                report.result = result;
                self.callback(null, report);
            });

            promises.forEach(function (promiseObj, index) {
                setTimeout(function () {
                    promiseObj.emitSuccess('result:' + index);
                }, Math.random() * 10 + 1);
            });
        },
        "should return instance of Promise": function (topic) {
            assert.ok(promise.isPromise(topic.returnValue));
        },
        "should emitSuccess passing value to the callback": function (topic) {
            assert.deepEqual(topic.result, [
                'result:0',
                'result:1',
                'result:2',
                'result:3',
                'result:4'
            ]);
        }
    },
    'first()': {
        topic: function () {
            var self = this,
                promises = [
                    new promise.Promise(),
                    new promise.Promise(),
                    new promise.Promise(),
                    new promise.Promise(),
                    new promise.Promise()
                ],
                report = {
                    returnValue: promise.first(promises)
                };
            promise.when(report.returnValue, function (result) {
                report.result = result;
                self.callback(null, report);
            });

            promises.forEach(function (promiseObj, index) {
                promiseObj.emitSuccess('result:' + index);
            });
        },
        "should return instance of Promise": function (topic) {
            assert.ok(promise.isPromise(topic.returnValue));
        },
        "should emitSuccess passing value to the callback": function (topic) {
            assert.equal(topic.result, 'result:0');
        }
    },
    'reduce()': {
        topic: function () {
            var self = this,
                promises = [
                    function (value) {
                        var delayed = promise.delay(10),
                            concat = promise.defer();
                        promise.when(delayed, function () {
                            concat.emitSuccess(value + '1/');
                        });
                        return concat;
                    },
                    function (value) {
                        var delayed = promise.delay(2),
                            concat = promise.defer();
                        promise.when(delayed, function () {
                            concat.emitSuccess(value + '2/');
                        });
                        return concat;
                    },
                    function (value) {
                        var delayed = promise.delay(3),
                            concat = promise.defer();
                        promise.when(delayed, function () {
                            concat.emitSuccess(value + '3/');
                        });
                        return concat;
                    },
                    function (value) {
                        var delayed = promise.delay(1),
                            concat = promise.defer();
                        promise.when(delayed, function () {
                            concat.emitSuccess(value + '4/');
                        });
                        return concat;
                    },
                    function (value) {
                        var delayed = promise.delay(11),
                            concat = promise.defer();
                        promise.when(delayed, function () {
                            concat.emitSuccess(value + '5/');
                        });
                        return concat;
                    }
                ],
                report = {
                    returnValue: promise.reduce(promises, '/')
                };

            promise.when(report.returnValue, function (result) {
                report.result = result;
                self.callback(null, report);
            });
        },
        "should return instance of Promise": function (topic) {
            assert.ok(promise.isPromise(topic.returnValue));
        },
        "should emitSuccess passing value to the callback": function (topic) {
            assert.equal(topic.result, '/1/2/3/4/5/');
        }
    },
    'delay()': {
        topic: function () {
            var self = this,
                report = {
                    currentTime: (new Date()).getTime(),
                    delayedTime: null,
                    returnValue: promise.delay(10)
                };
            promise.when(report.returnValue, function () {
                report.delayedTime = (new Date()).getTime();
                self.callback(null, report);
            });
        },
        "should return instance of Promise": function (topic) {
            assert.ok(promise.isPromise(topic.returnValue));
        },
        "should emitSuccess passing value to the callback": function (topic) {
            assert.ok(topic.delayedTime >= topic.currentTime + 10);
        }

    },
    'execute()': {
        topic: function () {
            var self = this,
                report = {},
                asyncFunction = function (firstArg, secondArg, callback) {
                    setTimeout(function () {
                        report.firstArg = firstArg;
                        report.secondArg = secondArg;
                        callback(null, 'result');
                    }, 5);
                };
            report.promise = promise.execute(asyncFunction, 'foo', 'bar');
            report.promise.then(function (result) {
                report.returnValue = result;
                self.callback(null, report);
            });
        },
        "should return instance of Promise": function (topic) {
            assert.ok(promise.isPromise(topic.promise));
        },
        "should emitSuccess passing value to the callback": function (topic) {
            assert.equal(topic.firstArg, 'foo');
            assert.equal(topic.secondArg, 'bar');
            assert.equal(topic.returnValue, 'result');

        }

    }
});

exports.PromiseTest = PromiseTest;
exports.FunctionTest = FunctionTest;