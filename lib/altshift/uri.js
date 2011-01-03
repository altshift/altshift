/*jslint indent:4 */
/**
 * Imports
 */
var url = require('url');
var querystring = require('querystring');

var core = require('./core');

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
    include: [core.ConstantScope],
    extend: {
        PATH_SEPARATOR : '/'
    },

    /**
     * Uri constructor
     *
     * @constructor
     * @param {Object} options
     */
    initialize : function (options) {
        this.protocol = null;
        this.hostname = null;
        this.port = null;
        this.path = [];
        this.hash = null;
        this.query = {};
        this.setHref(options || {});
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
        return this.path.join(this.PATH_SEPARATOR);
    },
    setPathname: function (path) {
        if (Array.isArray(path)) {
            this.path = path;
        } else {
            this.path = path.split(this.PATH_SEPARATOR);
        }

        this.path = this.path.filter(core.FUNCTION_IDENTITY);
    },

    getSearch: function () {
        return this.query ? ('?' + (querystring.stringify(this.query))) : '';
    },
    setSearch: function (search) {
        if (typeof(search) === 'object') {
            this.query = search;
        } else {
            this.query = querystring.parse(search);
        }
    },


    getHref: function () {
        return url.format({
            protocol: this.protocol,
            host: this.hostname !== undefined ? this.getHost() : false,
            pathname: this.getPathname(),
            search: this.getSearch(),
            hash: this.hash || ''
        });
    },
    setHref: function (uriOrObject) {
        if (typeof uriOrObject === 'string') {
            uriOrObject = url.parse(uriOrObject, true);
            if (uriOrObject.pathname) {
                this.setPathname(uriOrObject.pathname);
            }
            delete uriOrObject.host;
            delete uriOrObject.href;
            delete uriOrObject.search;
            delete uriOrObject.pathname;
        }

        if (uriOrObject.host) {
            this.setHost(uriOrObject.host);
        }

        if (uriOrObject.pathname) {
            this.setPathname(uriOrObject.pathname);
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

        if (uriOrObject.path) {
            this.setPathname(uriOrObject.path);
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
Uri.export(module);
exports.parse = parse;
exports.format = format;
