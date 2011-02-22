/*jslint nodejs: true, indent:4 */
/**
 * Imports
 */
var url = require('url');
var querystring = require('querystring');

var core = require('./core');
var PATH_SEPARATOR = '/';

/*******************************************************************************
 * Uri Class
 *
 * Usage:
 *
 * <pre>
 * var uriObject = new Uri('http://localhost');
 *
 * uriObject.protocol; // -> 'http'
 * uriObject.toString(); // -> 'http://localhost'
 *
 * uriObjectCopy = new Uri(uriObject);
 *
 * </pre>
 *
 ******************************************************************************/
var Uri = core.class('Uri', {
    /**
     * Uri constructor
     *
     * @constructor
     * @param {Object} options
     */
    initialize : function (options) {
        this.protocol = null;
        this.auth = null;
        this.hostname = null;
        this.port = null;
        this.path = [''];
        this.hash = null;
        this.query = {};

        var enumerable = true;
        Object.defineProperties(this, {

            href: {
                get: this.getHref,
                set: this.setHref,
                enumerable: enumerable
            },
            host: {
                get: this.getHost,
                set: this.setHost,
                enumerable: enumerable
            },
            pathname: {
                get: this.getPathname,
                set: this.setPathname,
                enumerable: enumerable
            },
            search: {
                get: this.getSearch,
                set: this.setSearch,
                enumerable: enumerable
            }
        });

        this.href = options || {};
    },

    clone: function () {
        return new Uri(this);
    },

    getHost: function () {
        return this.hostname !== undefined ? (
                (this.auth ? this.auth + '@' : '') +
                this.hostname + (this.port ? ':' + this.port : '')
        ) : null;
    },
    setHost: function (host) {
        var parsed = host.split(':');
        this.hostname = parsed[0];
        this.port = parsed[1];
        return this;
    },

    getPathname: function () {
        return this.path.join(PATH_SEPARATOR);
    },
    setPathname: function (path) {
        this.path = Array.isArray(path) ? path : path.split(PATH_SEPARATOR);
        return this;
    },

    getSearch: function () {
        var queryString = querystring.stringify(this.query);
        return queryString ? '?' + queryString : '';
    },
    setSearch: function (search) {
        this.query = typeof(search) === 'object' ? search : querystring.parse(search);
        return this;
    },

    getHref: function () {
        return url.format({
            protocol: this.protocol,
            host: this.host,
            pathname: this.pathname,
            search: this.search,
            hash: this.hash || ''
        });
    },
    setHref: function (uriOrObject) {
        if (typeof uriOrObject === 'string') {
            uriOrObject = url.parse(uriOrObject, true);

            delete uriOrObject.host;
            delete uriOrObject.href;
            delete uriOrObject.search;
        }

        if (uriOrObject.host) {
            this.setHost(uriOrObject.host);
        }

        if (uriOrObject.protocol) {
            this.protocol = uriOrObject.protocol.charAt(uriOrObject.protocol.length - 1) === ':' ?
                    uriOrObject.protocol.substr(0, uriOrObject.protocol.length - 1) :
                    uriOrObject.protocol;
        }

        if (uriOrObject.hostname) {
            this.hostname = uriOrObject.hostname;
        }

        if (uriOrObject.port) {
            this.port = parseInt(uriOrObject.port, 10);
        }

        if (uriOrObject.pathname) {
            this.pathname = uriOrObject.pathname;
        }

        if (uriOrObject.path) {
            this.pathname = uriOrObject.path;
        }

        if (uriOrObject.hash) {
            this.hash = uriOrObject.hash.charAt(0) === '#' ? uriOrObject.hash.substr(1) : uriOrObject.hash;
        }

        if (uriOrObject.query) {
            this.query = uriOrObject.query;
        }
    },


    /**
     * Return a string representation
     *
     * @return {string}
     */
    toString : function () {
        return this.getHref();
    },

    /**
     * Return true if this is equal to `other`
     *
     * @return {boolean}
     */
    equal: function (other) {
        var type = typeof other;
        switch (type) {
        case 'string':
            return this.getHref() === other;
        case 'object':
            if (other instanceof Uri) {
                return this.getHref() === other.getHref();
            }
            return this.getHref() === new Uri(other).getHref();

        default:
            return false;
        }
    },

    /**
     * Return a hash for this uri
     *
     * @return {string}
     */
    hash: function () {
        return this.getHref();
    }
});

/**
 * Return a new Uri object from `uriOrString`
 *
 * @param {Uri|string} uriOrString
 * @return {Uri}
 */
var parse = function (uriOrString) {
    if (uriOrString instanceof Uri) {
        return uriOrString;
    } else {
        return new Uri(uriOrString);
    }
};

/**
 * Return a string formatted uri. If `uriOrString` is already a string, the function will sanitize.
 *
 * @param {Uri|string} uriOrString
 * @return {string}
 */
var format = function (uriOrString) {
    if (uriOrString instanceof Uri) {
        return uriOrString.toString();
    } else {
        return (new Uri(uriOrString)).toString();
    }
};

/**
 * Exports
 */
exports.Uri = Uri;
exports.parse = parse;
exports.format = format;
