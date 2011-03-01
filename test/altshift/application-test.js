/*jslint nodejs: true, indent:4 */
/**
 * Generic Imports
 */
var vows = require('vows'),
    assert = require('assert'),
    path = require('path'),
    env = require('../_env');

var __filenameTested = env.toFileTested(__filename);

/**
 * Imports
 */
var application = require(__filenameTested),
    Application = application.Application,
    core = require(path.join(env.LIB, 'altshift', 'core'));

/*******************************************************************************
 * JSLint validation
 ******************************************************************************/
try {
    require('lint').vows.createTest([__filename, __filenameTested]).export(module);
} catch (e) {
    console.warn('Warning: JSLint not found try `npm install lint`');
}

/*******************************************************************************
 * ApplicationTest
 ******************************************************************************/
var ApplicationTest = vows.describe('Application class').addBatch({
    "new Application()": {
        topic: function () {

            return new Application({
                onStart: function () {
                    this.startFoo = true;
                },
                onStop: function () {
                    this.stopFoo = true;
                }
            });
        },
        'should return Application instance' : function (topic) {
            assert.ok(topic instanceof Application);
        },
        'should throw error if bad onStart or onStop is given' : function (topic) {
            assert.throws(function () {
                var app = new Application({
                    onStart: 'notAllowedType'
                });
            });

            assert.throws(function () {
                var app = new Application({
                    onStop: 'notAllowedType'
                });
            });
        }
    },
    "start()": {
        topic: function () {

            return new Application({
                onStart: function () {
                    this.startFoo = this.startFoo ? (this.startFoo + 1) : 1;
                }
            });
        },
        'should run onStart constructor parameter when called' : function (topic) {
            assert.isUndefined(topic.startFoo);
            topic.start();
            assert.equal(topic.startFoo, 1);
        },
        'should be runnable only once' : function (topic) {
            assert.equal(topic.startFoo, 1);
            topic.start();
            assert.equal(topic.startFoo, 1);
        }
    },
    "stop()": {
        topic: function () {

            return new Application({
                onStart: function () {
                    this.startFoo = this.startFoo ? (this.startFoo + 1) : 1;
                },
                onStop: function () {
                    this.stopBar = this.stopBar ? (this.stopBar + 1) : 1;
                }
            });
        },
        'should not be runned until application is started' : function (topic) {
            assert.isUndefined(topic.startFoo);
            assert.isUndefined(topic.stopBar);
            topic.stop();
            assert.isUndefined(topic.startFoo);
            assert.isUndefined(topic.stopBar);
            topic.start();
            topic.stop();
            assert.equal(topic.startFoo, 1);
            assert.equal(topic.stopBar, 1);
        },
        'should be runnable only once' : function (topic) {
            topic.stop();
            assert.equal(topic.startFoo, 1);
            assert.equal(topic.stopBar, 1);
            topic.stop();
            assert.equal(topic.startFoo, 1);
            assert.equal(topic.stopBar, 1);
        }
    },
    "handleError()": {
        topic: function () {

            var app = new Application({
            });
            app._exit =  function (code) {
                this.debugExited = code;
            };
            app._printError =  function (message) {
                this.debugError = message;
            };
            return app;
        },
        'should not be runned until application is started' : function (topic) {
            assert.isUndefined(topic.debugExited);
            topic.handleError('foo');
            assert.isUndefined(topic.debugExited);
        },
        'should exit and display error if no error handler is specified' : function (topic) {
            topic.start();
            topic.handleError('foo');
            assert.equal(topic.debugExited, 1);
            assert.equal(topic.debugError, 'foo');
        },
        'should exit if error is a SystemExit' : function (topic) {
            delete topic.debugExited;
            delete topic.debugError;
            topic.start();
            topic.handleError(new core.SystemExit({
                code: 22
            }));
            assert.equal(topic.debugExited, 22);
            assert.isUndefined(topic.debugError);
        }
    },
    "application.register(new Application())": {
        topic: function () {
            application.unregister();

            var self = this,
                app = new Application({
                    onStart: function () {
                        this.debugStarted = this.debugStarted ? (this.debugStarted + 1) : 1;
                    },
                    onStop: function () {
                        this.debugStopped = this.debugStopped ? (this.debugStopped + 1) : 1;
                    }
                });
            app._exit =  function (code) {
                this.debugExited = code;
            };
            app._printError =  function (message) {
                this.debugError = message;
            };

            process.nextTick(function () {
                application.register(app);
                throw 'testMessage';
            });

            process.nextTick(function () {
                self.callback(null, app);
            });
        },
        'should not throw error if same application is registered many times' : function (topic) {
            assert.doesNotThrow(function () {
                application.register(topic);
                application.register(topic);
            });

            assert.equal(topic.debugStarted, 1);
            assert.isUndefined(topic.debugStopped);
        },
        'should throw error if two differents applications are registered' : function (topic) {
            assert.throws(function () {
                application.register(new Application());
            });
            assert.throws(function () {
                application.register(new Application());
            });
        },
        'should catch unhandled error with handlerError()': function (topic) {
            assert.equal(topic.debugExited, 1);
            assert.equal(topic.debugError, 'testMessage');
        }
    }
});

exports.ApplicationTest = ApplicationTest;