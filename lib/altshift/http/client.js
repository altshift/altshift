/*jslint indent:4 */
/**
 * Imports
 */
var http = require('http');
var core = require('../core');

var uri = require('../uri'),
    Uri = uri.Uri;
var promise = require('altshift/promise'),
    defer = promise.defer,
    when = promise.when;


/**
 * Constants
 */
var PORT_HTTP = 80;
var PORT_HTTPS = 443;
var REQUEST_TIMEOUT = 20000;

/**
 * A HttpClient which can be used for multiple requests.
 *
 * Use this Client instead of the convenience methods if you do lots of requests
 * (especially if they go to the same hosts) or if you want cookies to be
 * preserved between multiple requests.
 *
 * @param {Number} timeout The connection timeout
 * @param {Boolean} followRedirects If true then redirects (301, 302) are
 *            followed
 * @constructor
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
        this._timeout = null;
        this._redirectMax = 0;

        this.configure(options);
    },
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
        if (options.timeout) {
            this._timeout = options.timeout;
        }
        if (options.redirectMax) {
            this._redirectMax = options.redirectMax;
        }
        return this;
    },
    /**
     *
     *
     * @param {Object} options
     * @param {Function} callback [optional]
     * @return {Promise}
     */
    request : function (options, callback) {
        options = options || {};

        var request = {},
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

            isSecure = url.protocol.indexOf('s') > -1;
            url.port = url.port || (isSecure ? PORT_HTTPS : PORT_HTTP);

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

        /*if (exports.proxyServer) {
            request.pathname = request.url;
            var proxySettings = parse(exports.proxyServer);
            request.port = proxySettings.port;
            request.protocol = proxySettings.protocol;
            request.hostname = proxySettings.hostname;
        }*/
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
        httpRequest.on('response', function (response) {
            // Check promise had no error
            if (requestPromise.isError) {
                return;
            }
            response.status = response.statusCode;

            var buffer = [],
                readData = function (block) {
                    buffer.push(block);
                };

            /*httpResponsePromise = defer();
            response.body = LazyArray({
                some : function (callback) {
                    buffer.forEach(callback);
                    readData = callback;
                    return httpResponsePromise.getPromise();
                }
            });*/
            response.setEncoding(request.encoding);

            response.on('data', function (chunk) {
                readData(chunk);
            });
            response.on('end', function () {
                response.body = buffer.join('');

                //httpResponsePromise.resolve();
                requestPromise.resolve(response);

                // Since we have no connection pooling, let's not pretend to use Keep-Alive
                httpClient.end();
            });

            //requestPromise.resolve(response);
        });


        //Node like
        if (callback) {
            when(requestPromise, function (result) {
                callback(undefined, result);
            }, function (error) {
                callback(error);
            });
        }

        if (request.body) {
            return when(request.body.forEach(function (block) {
                httpRequest.write(block);
            }), function () {
                httpRequest.end();
                return requestPromise.getPromise();
            });
        } else {
            httpRequest.end();
            return requestPromise.getPromise();
        }
    },
    /**
     *
     * @param {Object} request
     * @param {Function} callback [optional]
     */
    get : function (request, onSuccess, onError) {
        request.method = this.GET;
        return this.request(request, onSuccess, onError);
    },
    /**
     *
     * @param {Object} request
     * @param {Function} callback [optional]
     */
    post : function (request, callback) {
        request.method = this.POST;
        return this.request(request, callback);
    },
    /**
     *
     * @param {Object} request
     * @param {Function} callback [optional]
     */
    del : function (request, callback) {
        request.method = this.DEL;
        return this.request(request, callback);
    },
    /**
     *
     * @param {Object} request
     * @param {Function} callback [optional]
     */
    put : function (request, callback) {
        request.method = this.PUT;
        return this.request(request, callback);
    }
});


var defaultClient = new Client();

/**
 * Convenience function to make a generic HTTP request without creating a new
 * client.
 *
 * @param {Object} requestObj
 * @return {Exchange} exchange object
 */
var request = function (requestObj) {
    return defaultClient.request(requestObj);
};

/**
 * Convenience function to make a POST request without creating a new client. If
 * a success callback is provided, the request is executed asynchronously and
 * the function returns immediately. Otherwise, the function blocks until the
 * request terminates.
 *
 * @param {String} url the url to request
 * @param {Object|String|Binary|Stream} data request data, optional
 * @param {Function} success callback in case of successful status code,
 *            optional
 * @param {Function} error callback in case of any error - transmission or
 *            response, optional
 * @returns {Exchange} exchange object
 * @see Client.prototype.request
 */
var post = function (url, data, success, error) {
    return defaultClient.post(url, data, success, error);
};

/**
 * Convenience function to make a GET request without creating a new client. If
 * a success callback is provided, the request is executed asynchronously and
 * the function returns immediately. Otherwise, the function blocks until the
 * request terminates.
 *
 * @param {String} url the url to request
 * @param {Object|String} data request data, optional
 * @param {Function} success callback in case of successful status code,
 *            optional
 * @param {Function} error callback in case of any error - transmission or
 *            response, optional
 * @returns {Exchange} exchange object
 * @see Client.prototype.request
 */
var get = function (url, data, success, error) {
    return defaultClient.get(url, data, success, error);
};

/**
 * Convenience function to make a DELETE request without creating a new client.
 * If a success callback is provided, the request is executed asynchronously and
 * the function returns immediately. Otherwise, the function blocks until the
 * request terminates.
 *
 * @param {String} url the url to request
 * @param {Object|String} data request data, optional
 * @param {Function} success callback in case of successful status code,
 *            optional
 * @param {Function} error callback in case of any error - transmission or
 *            response, optional
 * @returns {Exchange} exchange object
 * @see Client.prototype.request
 */
var del = function (url, data, success, error) {
    return defaultClient.del(url, data, success, error);
};

/**
 * Convenience function to make a PUT request without creating a new client. If
 * a success callback is provided, the request is executed asynchronously and
 * the function returns immediately. Otherwise, the function blocks until the
 * request terminates.
 *
 * @param {String} url the url to request
 * @param {Object|String|Binary|Stream} data request data, optional
 * @param {Function} success callback in case of successful status code,
 *            optional
 * @param {Function} error callback in case of any error - transmission or
 *            response, optional
 * @returns {Exchange} exchange object
 * @see Client.prototype.request
 */
var put = function (url, data, success, error) {
    return defaultClient.put(url, data, success, error);
};

// configurable proxy server setting, defaults to http_proxy env var
exports.proxyServer = process.env.http_proxy;

/**
 * Exports
 */
Client.export(module);
exports.request = request;
exports.get = get;
exports.post = post;
exports.del = del;
exports.put = put;