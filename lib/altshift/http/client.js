/*jslint nodejs: true, indent:4 */
/**
 * Imports
 */
var http = require('http'),
    https = require('https');
var core = require('../core');
var io = require('../io');
var jsgi = require('./jsgi');

var uri = require('../uri'),
    Uri = uri.Uri;
var promise = require('../promise'),
    defer = promise.defer,
    when = promise.when;

/**
 * Constants
 */
var PORT_HTTP = 80;
var PORT_HTTPS = 443;
var REQUEST_TIMEOUT = 30000;

/**
 * A HttpClient which can be used for multiple requests.
 *
 * @class
 */
var Client = core.class('Client', {
    include : [ core.ConstantScope ],
    extend : {
        DEL : 'DEL',
        GET : 'GET',
        POST : 'POST',
        PUT : 'PUT'
    },

    /**
     * Client constructor
     *
     * @constructor
     * @param {Object} options
     *  - encoding: {String} the default encoding
     *  - timeout: {Integer} the timeout in milliseconds
     */
    initialize : function (options) {
        this._encoding = 'utf8';
        this._timeout = REQUEST_TIMEOUT;
        this._redirectMax = 0;

        this.configure(options);
    },

    /**
     * Destructor
     */
    finalize : function () {
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
        if (options.redirectMax !== undefined) {
            this._redirectMax = options.redirectMax;
        }
        return this;
    },

    /**
     * Send an http request to server
     *
     * @param {Object} options
     *  - url : string or Uri object
     *  - headers: object (default: {})
     *  - encoding: string (default: 'utf-8')
     *  - method: string (default: 'GET')
     * @param {Function=} callback (optional)
     * @return {Promise}
     */
    request : function (options, callback) {
        options = options || {};

        var self = this,
            request = {},
            httpClient,
            httpRequest,
            requestPromise = defer().timeout(this._timeout),
            httpResponsePromise,
            isSecure = false,
            requestPath,
            url,
            key;

        if (options.url) {
            request.url = (options.url instanceof Uri) ? options.url : new Uri(options.url);
            url = request.url;
            url.protocol = url.protocol || 'http';
            url.hostname = url.hostname || 'localhost';

            request.protocol = url.protocol;
            request.host = url.host || url.hostname + (url.port ? ':' + url.port : '');
            request.port = url.port;
            request.pathname = url.pathname;
            request.search = url.search;
        } else {
            request.url = new Uri({
                protocol: options.protocol,
                auth: options.auth,
                hostname: options.hostname,
                port: options.port,
                path: options.path,
                query: options.query,
                hash: options.hash
            });
        }

        isSecure = request.url.protocol.indexOf('s') > -1;
        request.url.port = request.url.port || (isSecure ? PORT_HTTPS : PORT_HTTP);

        for (key in request.url) {
            if (request.url.hasOwnProperty(key)) {
                request[key] = request.url[key];
            }
        }

        request.encoding = request.encoding || this._encoding;
        request.method = request.method || this.GET;
        request.headers = request.headers || {
            host : request.host || request.hostname + (request.port ? ':' + request.port : '')
        };

        httpClient = http.createClient(request.port, request.hostname, isSecure);
        httpClient.on('error', function (error) {
            if (httpResponsePromise) {
                httpResponsePromise.emitError(error);
            } else {
                requestPromise.emitError(error);
            }
            httpClient.destroy();
        });

        //TODO : do not use queryString
        requestPath = (request.pathname || request.pathInfo || '') + request.search;

        httpRequest = httpClient.request(request.method, requestPath, request.headers);
        httpRequest.on('response', function (_response) {

            // Check promise had no error
            if (requestPromise.isError) {
                return;
            }

            var response = self._toJSGI(_response);
            requestPromise.emitSuccess(response);
        });

        /*
        requestPath = (request.pathname || request.pathInfo || '') + request.search;

        httpRequest = http.request({
            encoding: request.encoding,
            method: request.method,
            headers: request.headers,
            host: request.hostname,
            port: request.port,
            path: requestPath
        }, function (_response) {


            // Check promise had no error
            if (requestPromise.isError) {
                return;
            }

            var response = self._toJSGI(_response);
            requestPromise.emitSuccess(response);
        });

        httpRequest.on('error', function (error) {
            if (httpResponsePromise) {
                httpResponsePromise.emitError(error);
            } else {
                requestPromise.emitError(error);
            }
        });*/


        //Node like
        if (callback) {
            requestPromise.then(function (result) {
                callback(null, result);
            }, function (error) {
                callback(error, null);
            });
        }

        if (request.body) {
            return when(
                request.body.forEach(function (block) {
                    httpRequest.write(block);//TODO handle encoding?
                }),
                function () {
                    httpRequest.end();
                    return requestPromise.getPromise();
                }
            );
        } else {
            httpRequest.end();
            return requestPromise.getPromise();
        }
    },

    /**
     * Shortcut to .request() with get method
     *
     * @param {Object} request
     * @param {Function} callback [optional]
     * @return {Promise}
     */
    get : function (request, callback) {
        request.method = this.GET;
        return this.request(request, callback);
    },

    /**
     * Shortcut to .request() with delete method
     *
     * @param {Object} request
     * @param {Function} callback [optional]
     * @return {Promise}
     */

    post : function (request, callback) {
        request.method = this.POST;
        return this.request(request, callback);
    },
    /**
     * Shortcut to .request() with delete method
     *
     * @param {Object} request
     * @param {Function} callback [optional]
     * @return {Promise}
     */
    del : function (request, callback) {
        request.method = this.DEL;
        return this.request(request, callback);
    },

    /**
     * Shortcut to .request() with put method
     *
     * @param {Object} request
     * @param {Function} callback [optional]
     * @return {Promise}
     */
    put : function (request, callback) {
        request.method = this.PUT;
        return this.request(request, callback);
    },

    _toJSGI: function (nodeResponse) {
        return new jsgi.Response({
            // {Number} HTTP status code
            status: nodeResponse.statusCode,

            // HTTP version
            version: [nodeResponse.httpVersionMajor, nodeResponse.httpVersionMinor],

            //{Object} HTTP headers
            headers: nodeResponse.headers,

            //Stream reader
            body: new io.Reader(nodeResponse)
        });
    }
});

var defaultClient = new Client();

/**
 * Convenience function to make a generic HTTP request without creating a new
 * client.
 *
 * @param {Object} requestObj
 * @param {Function=} callback
 * @return {Promise} object
 */
var request = function (requestObj, callback) {
    return defaultClient.request(requestObj, callback);
};

/**
 * Convenience function to make a POST request without creating a new client. If
 * a success callback is provided, the request is executed asynchronously and
 * the function returns immediately. Otherwise, the function blocks until the
 * request terminates.
 *
 * @param {String} url the url to request
 * @param {Object|String|Binary|Stream} data request data, optional
 * @param {Function} callback
 * @returns {Exchange} exchange object
 * @see Client.prototype.request
 */
var post = function (url, data, callback) {
    return defaultClient.post(url, data, callback);
};

/**
 * Convenience function to make a GET request without creating a new client. If
 * a success callback is provided, the request is executed asynchronously and
 * the function returns immediately. Otherwise, the function blocks until the
 * request terminates.
 *
 * @param {String} url the url to request
 * @param {Object|String} data request data, optional
 * @param {Function} callback
 * @returns {Exchange} exchange object
 * @see Client.prototype.request
 */
var get = function (url, data, callback) {
    return defaultClient.get(url, data, callback);
};

/**
 * Convenience function to make a DELETE request without creating a new client.
 * If a success callback is provided, the request is executed asynchronously and
 * the function returns immediately. Otherwise, the function blocks until the
 * request terminates.
 *
 * @param {String} url the url to request
 * @param {Object|String} data request data, optional
 * @param {Function} callback
 * @returns {Exchange} exchange object
 * @see Client.prototype.request
 */
var del = function (url, data, callback) {
    return defaultClient.del(url, data, callback);
};

/**
 * Convenience function to make a PUT request without creating a new client. If
 * a success callback is provided, the request is executed asynchronously and
 * the function returns immediately. Otherwise, the function blocks until the
 * request terminates.
 *
 * @param {String} url the url to request
 * @param {Object|String|Binary|Stream} data request data, optional
 * @param {Function} callback
 * @returns {Exchange} exchange object
 * @see Client.prototype.request
 */
var put = function (url, data, callback) {
    return defaultClient.put(url, data, callback);
};

// configurable proxy server setting, defaults to http_proxy env var
//exports.proxyServer = process.env.http_proxy;

/**
 * Exports
 */
exports.Client = Client;
exports.request = request;
exports.get = get;
exports.post = post;
exports.del = del;
exports.put = put;