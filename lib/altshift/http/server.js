/*jslint indent:4 */
/**
 * Imports
 */
var http = require('http');
var core = require('../core');
var io = require('../io');
var jsgi = require('./jsgi');

var promise = require('../promise'),
    defer = promise.defer,
    when = promise.when;

/**
 * A HttpServer class
 *
 * @class
 */
var Server = core.class('Server', {

    /**
     * Server constructor
     *
     * @constructor
     * @param {Function} requestHandler
     * @param {Object=} options
     */
    initialize : function (requestHandler, options) {

        this._encoding = 'utf8';
        this._listening = defer();
        this._stopped = defer();

        var self = this,
            server = http.createServer(function (_request, _response) {
                var request = self._toJSGI(_request),
                    requestClosed = defer();

                _request.connection.on("close", function (error, value) {
                    if (error) {
                        requestClosed.emitError(error);
                    } else {
                        requestClosed.emitSuccess(value);
                    }
                });

                when(requestHandler(request), function (response) {
                    _response.writeHead(response.status, response.headers);

                    if (response.onClose) {
                        when(requestClosed, response.onClose);
                    }

                    return when(response.body, function (body) {
                        if (
                            Array.isArray(body) &&
                            body.length === 1 &&
                            typeof body[0] === "string"
                        ) {
                            _response.end(body[0]);
                        } else if (body) {
                            var end = body.forEach(function (chunk) {
                                _response.write(chunk, "binary");
                            });
                            return when(end, function () {
                                _response.end();
                            });
                        } else {
                            _response.end();
                        }
                    });
                });
            });

        server.on("listening", function (error) {
            if (error) {
                self._listening.emitError(error);
            } else {
                self._listening.emitSuccess(self);
            }
        });

        server.on("close", function (error) {
            if (error) {
                self._stopped.emitError(error);
            } else {
                self._stopped.emitSuccess();
            }
        });

        this._nodeServer = server;
        this.configure(options);
    },

    /**
     * Destructor
     */
    finalize : function () {
        this.close();
        this.callSuper();
    },

    /**
     * Configure the options
     *
     * @param {Object} options
     * @return this
     */
    configure : function (options) {
        options = options || {};
        if (options.encoding) {
            this._encoding = options.encoding;
        }
        if (options.timeout !== undefined) {
            this._timeout = options.timeout;
        }
        return this;
    },


    /**
     * Stops the server.
     *
     * @returns {Promise * Undefined} a promise that will resolve when the server is stopped.
     */
    stop: function () {
        this._nodeServer.close();
        this._listening = null;
        return this._stopped.promise;
    },

    /**
     * Starts the server, listening on the given port
     *
     * @param {Number} port
     * @returns {Promise * Undefined} a promise that will
     * resolve when the server is ready to receive
     * connections
     */
    listen: function (port) {
        if (!this._listening) {
            throw new Error("A server cannot be restarted or started on a new port");
        }
        this._nodeServer.listen(port);
        return this._listening.promise;
    },

    _toJSGI: function (nodeRequest) {

        var socket = nodeRequest.socket,
            hostPort = nodeRequest.headers.host ? nodeRequest.headers.host.split(':') : [],
            host = hostPort[0],
            port = +hostPort[1] || 80,
            jsgiRequest = new jsgi.Request({
                // {Array} HTTP version. (JSGI)
                version: [ nodeRequest.httpVersionMajor, nodeRequest.httpVersionMinor ],
                // {String} HTTP method, e.g., `"GET"` (JSGI)
                method: nodeRequest.method,
                // {String} path, starting with `"/"`
                path: nodeRequest.url,
                // {String} pathInfo, starting with `"/"`, the portion of the path that has not yet been routed (JSGI)
                pathInfo: nodeRequest.url,
                // {String} scriptName, the portion of the path that has already been routed (JSGI)
                scriptName: "",
                // {String} (JSGI)
                scheme: "http",

                // {Object} HTTP headers (JSGI)
                headers: nodeRequest.headers,

                host: host,
                port: port,

                // {String}
                remoteHost: socket.remoteAddress,
                // {Number}
                remotePort: socket.remotePort,

                //text reader
                body: new io.Reader(nodeRequest)
            });

        // {String} url
        jsgiRequest.url = jsgiRequest.scheme + "://" + jsgiRequest.headers.host + jsgiRequest.path;

        // The underlying Node request
        jsgiRequest.nodeRequest = nodeRequest;
        // The underlying Node TCP connection
        jsgiRequest.nodeConnection = nodeRequest.connection;

        return jsgiRequest;
    }
});

/**
 * Exports
 */
exports.Server = Server;