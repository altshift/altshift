/*jslint nodejs: true, indent:4 */
/**
 * Application module
 *
 * @module
 */
var core = require('./core'),
    Class = core.class,
    SystemExit = core.SystemExit,
    Interface = core.Interface,
    promise = require('./promise'),
    when = promise.when,
    isFunction = core.isFunction;

/**
 * Constants
 */
var applicationCurrent = null,
    EVENTS = [/*'SIGTERM',*/ 'SIGINT', 'uncaughtException', 'exit'],
    currentHandlers = {};

/*******************************************************************************
 * IApplication Interface
 *
 * @interface
 ******************************************************************************/
var IApplication = core.interface('IApplication', ['handleError', 'start', 'stop']);

/**
 * Register app as the current executing application.
 * This will also register all error handler for uncaught exceptions
 *
 * @param {Application} app
 * @return undefined
 */
function register(app) {
    //Check if registered twice
    if (applicationCurrent === app) {
        return;
    }

    //Only one application can be registered
    if (applicationCurrent) {
        throw new core.Error({
            code: 'application-registered',
            message: 'An application was already registered'
        });
    }

    //Set all handlers
    Interface.ensure(app, IApplication);
    applicationCurrent = app;

    currentHandlers.SIGINT = function () {
        console.log('Application interrupted');
        app.exit();
    };

    /*
     FIXME: Eclipse bug
     currentHandlers.SIGTERM = function () {
        console.log('Killing in the name of!');
        unregister();
        process.exit();
    };*/

    currentHandlers.uncaughtException = function (error) {
        app.handleError(error);
    };

    currentHandlers.exit = function () {
        exports.unregister();
    };

    EVENTS.forEach(function (event) {
        if (currentHandlers[event]) {
            process.on(event, currentHandlers[event]);
        }
    });

    //Start application
    applicationCurrent.start();
}

/**
 * Unregister current application and remove all corrsponding listeners
 *
 * @return undefined
 */
function unregister() {
    if (!applicationCurrent) {
        return;
    }
    applicationCurrent.stop();

    EVENTS.forEach(function (event) {
        process.removeListener(event, currentHandlers[event]);
    });

    applicationCurrent = null;
    currentHandlers = {};
}

/*******************************************************************************
 * Application class
 *
 * Usage:
 * <pre>
 *
 * var application = require('altshift/application'),
 *     Application = application.Application;
 *
 * //Build application object
 * var app = new Application({
 *     onStart: function () {
 *         //Do something when started
 *     },
 *     onStop: function () {
 *         //Do something when stopped
 *     }
 * });
 *
 * //Register and start application
 * application.register(app);
 *
 * </pre>
 *
 * @class
 ******************************************************************************/
var Application = Class('Application', {
    /**
     * Application constructor
     *
     * @constructor
     * @param {Object} config
     */
    initialize: function (config) {
        //Default values
        this.started = false;
        this.onStart = core.FUNCTION_VOID;
        this.onStop = core.FUNCTION_VOID;
        this.errorHandlers = [];

        //Configure
        this.configure(config);
    },

    /**
     * Destructor
     */
    finalize: function () {
        this.stop();
        this.callSuper();
    },

    /**
     * Configure the application
     *
     * @param {Object} config
     * @return this
     */
    configure: function (config) {
        config = config || {};

        if (config.onStart !== undefined) {
            if (!isFunction(config.onStart)) {
                throw new core.TypeError({
                    code: 'application-configure',
                    message: "config.onStart must be a function"
                });
            }

            this.onStart = config.onStart;
        }

        if (config.onStop !== undefined) {
            if (!isFunction(config.onStop)) {
                throw new core.TypeError({
                    code: 'application-configure',
                    message: "config.onStop must be a function"
                });
            }
            this.onStop = config.onStop;
        }

        return this;
    },

    /**
     * Start the application
     *
     * @return this
     */
    start: function () {
        if (!this.started) {
            this.started = true;
            return this.onStart.call(this) || true;
        }

        return false;
    },

    /**
     * Stop the application
     *
     * @return {false|Promise}
     */
    stop: function () {
        if (this.started) {
            this.started = false;
            return this.onStop.call(this) || true;
        }
        return false;
    },


    /**
     * Handle one error
     *
     * @param {*} error
     */
    handleError: function (error) {
        if (!this.started) {
            return;
        }

        var errorHandlers = this.errorHandlers,
            length = errorHandlers.length,
            errorHandler,
            errorHandled = false,
            errorString,
            i;

        //Exit handling
        if (error instanceof SystemExit) {
            this._exit(error.code);
            return;
        }

        try {
            for (i = 0; i < length; i += 1) {
                errorHandler = errorHandlers[i];
                errorHandled = !!errorHandler(error);

                if (errorHandled) {
                    return;
                }
            }
        } catch (e) {
            this._printError(e);
            this._exit(1);
        }

        //Default error handling
        errorString = '' + (error.stack || error);
        this._printError(errorString);
        this._exit(1);
    },

    /**
     * Error handler
     *
     * @param {Function} errorHandler
     * @return this
     */
    addErrorHandler: function (errorHandler) {
        if (!isFunction(errorHandler)) {
            throw new core.TypeError({
                code: 'application-configure',
                message: "errorHandler must be a function"
            });
        }
        this.errorHandlers.push(errorHandler);
        return this;
    },


    exit: function (code) {
        throw new SystemExit({
            code: code
        });
    },

    _printError: function (message) {
        console.error(message);
    },
    _exit: function (code) {
        var force = true;
        function doExit() {
            if (force) {
                console.error('Fatal error : cannot shutdown.');
            }

            process.removeAllListeners('uncaughtException');
            process.removeAllListeners('exit');
            process.exit(code);
        }
        //Set timeout for shutting down
        setTimeout(doExit, 20000);

        when(this.stop(),
            function (result) {
                force = false;
                doExit();
            }
        );
    }
});


/**
 * Exports
 */
exports.Application = Application;
exports.IApplication = IApplication;
exports.register = register;
exports.unregister = unregister;