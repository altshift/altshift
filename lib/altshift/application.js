/*jslint nodejs: true, indent:4 */
/**
 * Application module
 *
 * @module
 */
var core = require('./core'),
    Interface = core.Interface,
    promise = require('./promise');

/**
 * Constants
 */
var applicationCurrent = null,
    applicationHandler = null,
    applicationExit = null;

/*******************************************************************************
 * IApplication Interface
 *
 * @interface
 ******************************************************************************/
var IApplication = core.interface('IApplication', ['handleError', 'start', 'stop']);

/**
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
    applicationHandler = function (error) {
        app.handleError(error);
    };

    applicationExit = function () {
        app.stop();
    };

    process.on('uncaughtException', applicationHandler);
    process.on('exit', applicationExit);

    //Start application
    applicationCurrent.start();
}

/**
 *
 * @return undefined
 */
function unregister() {
    if (!applicationCurrent) {
        return;
    }
    applicationCurrent.stop();

    process.removeListener('uncaughtException', applicationHandler);
    process.removeListener('exit', applicationExit);

    applicationCurrent = null;
    applicationHandler = null;
    applicationExit = null;
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
var Application = core.class('Application', {
    /**
     * Reader constructor
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
            if (!core.isFunction(config.onStart)) {
                throw new core.TypeError({
                    code: 'application-configure',
                    message: "config.onStart must be a function"
                });
            }

            this.onStart = config.onStart;
        }

        if (config.onStop !== undefined) {
            if (!core.isFunction(config.onStop)) {
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
            this.onStart.call(this);
        }

        return this;
    },

    /**
     * Stop the application
     *
     * @return this
     */
    stop: function () {
        if (this.started) {
            this.started = false;
            this.onStop.call(this);
        }
        return this;
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

        for (i = 0; i < length; i += 1) {
            errorHandler = errorHandlers[i];
            errorHandled = !!errorHandler(error);

            if (errorHandled) {
                return;
            }
        }

        //Exit handling
        if (error instanceof core.SystemExit) {
            this._exit(error.code);
            return;
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
        if (!core.isFunction(errorHandler)) {
            throw new core.TypeError({
                code: 'application-configure',
                message: "errorHandler must be a function"
            });
        }
        this.errorHandlers.push(errorHandler);
        return this;
    },

    _printError: function (message) {
        console.error(message);
    },
    _exit: function (code) {
        process.exit(code);
    }
});




/**
 * Exports
 */
exports.Application = Application;
exports.IApplication = IApplication;
exports.register = register;
exports.unregister = unregister;