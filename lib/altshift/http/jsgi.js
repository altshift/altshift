/*jslint nodejs: true, indent:4 */
/**
 * Imports
 */
var http = require('http');
var util = require(process.binding('natives').util ? 'util' : 'sys');
var core = require('../core');

/**
 * Request class
 *
 * @class
 */
var Request = core.class('Request', {
    include: [core.ConstantScope],
    extend: {
        jsgi: {
            version: [0, 3],
            multithread: false,
            multiprocess: true,
            async: true,
            runOnce: false,
            errors: {
                print: util.puts,
                flush: core.FUNCTION_VOID
            }
        }
    },

    /**
     * Request constructor
     *
     * @constructor
     * @params {Object} options
     *  - env {Object}
     *  - scriptName {string}
     *  - scheme {string}
     *  - headers {Object}
     *  - pathInfo {string}
     *  - queryString {string}
     *  - body {io.Reader}
     */
    initialize: function (options) {
        options = options || {};

        this.env = options.env || {};
        this.scriptName = options.scriptName || '';

        this.scheme = (options.scheme || 'http').toLowerCase();
        this.host = options.host;
        this.port = +options.port || 80;
        this.pathInfo = options.pathInfo || '';
        this.queryString = options.queryString || '';

        this.headers = options.headers || {};
        this.method = (options.method || 'GET').toUpperCase();

        this.body = options.body;//TODO check is stream



        this.remoteHost = options.remoteAddress;
        this.remotePort = options.remotePort;
    },
    /**
     * Destructor
     */
    finalize: function () {
        core.destroy(this.body);
        this.callSuper();
    }
});

/**
 * Response class
 *
 * @class
 */
var Response = core.class('Response', {
    /**
     * Response constructor
     *
     * @constructor
     * @params {Object} options
     *  - headers {Object}
     *  - status {int}
     *  - body {io.Reader}
     */
    initialize: function (options) {
        options = options || {};
        this.headers = options.headers || {};
        this.status = options.status || 200;
        this.body = options.body;//TODO check is stream
    },
    /**
     * Destructor
     */
    finalize: function () {
        core.destroy(this.body);
        this.callSuper();
    }
});

/**
 * Request
 */
exports.Request = Request;
exports.Response = Response;