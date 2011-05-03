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
var uri = require(__filenameTested);

/*******************************************************************************
 * JSLint validation
 ******************************************************************************/
try {
    exports.JSLintTest = require('lint').vows.createTest([__filename, __filenameTested]);
} catch (e) {
    console.warn('Warning: JSLint not found try `npm install lint`');
}

/*******************************************************************************
 * UriTest
 ******************************************************************************/
function createUri(options) {
    return new uri.Uri(options);
}

var UriTest = vows.describe('Uri class').addBatch({
    'new Uri({...})': {
        topic: function () {
            return createUri({
                protocol: 'http',
                auth: null,
                hostname: 'localhost',
                port: 333,
                path: ['', 'toto', 'tata'],
                hash: 'isch',
                query: {
                    foo: 'bar'
                },
                nonexistent: 'foo'
            });
        },
        'should return an instance of Uri': function (topic) {
            assert.ok(topic instanceof uri.Uri);
        },
        'should create an Uri with corresponding attributes ': function (topic) {
            assert.deepEqual(topic, {
                protocol: 'http',
                auth: null,
                hostname: 'localhost',
                port: 333,
                path: ['', 'toto', 'tata'],
                hash: 'isch',
                query: {
                    foo: 'bar'
                },

                href: 'http://localhost:333/toto/tata?foo=bar#isch',
                host: 'localhost:333',
                pathname: '/toto/tata',
                search: '?foo=bar'
            });
        },
        'should have valid string representation': function (topic) {
            assert.deepEqual(topic.toString(), 'http://localhost:333/toto/tata?foo=bar#isch');
        }
    },
    'new Uri("...")': {
        topic: function () {
            return createUri('http://localhost:333/toto/tata?foo=bar#isch');
        },
        'should return an instance of Uri': function (topic) {
            assert.ok(topic instanceof uri.Uri);
        },
        'should create an Uri with corresponding attributes ': function (topic) {
            assert.deepEqual(topic, {
                protocol: 'http',
                auth: null,
                hostname: 'localhost',
                port: 333,
                path: ['', 'toto', 'tata'],
                hash: 'isch',
                query: {
                    foo: 'bar'
                },

                href: 'http://localhost:333/toto/tata?foo=bar#isch',
                host: 'localhost:333',
                pathname: '/toto/tata',
                search: '?foo=bar'
            });
        },
        'should have valid string representation': function (topic) {
            assert.deepEqual(topic.toString(), 'http://localhost:333/toto/tata?foo=bar#isch');
        }
    },
    'new Uri(new Uri(...))': {
        topic: function () {
            return createUri(
            createUri({
                protocol: 'http',
                auth: null,
                hostname: 'localhost',
                port: 333,
                path: ['', 'toto', 'tata'],
                hash: 'isch',
                query: {
                    foo: 'bar'
                },
                nonexistent: 'foo'
            }));
        },
        'should return an instance of Uri': function (topic) {
            assert.ok(topic instanceof uri.Uri);
        },
        'should create an Uri with corresponding attributes ': function (topic) {
            assert.deepEqual(topic, {
                protocol: 'http',
                auth: null,
                hostname: 'localhost',
                port: 333,
                path: ['', 'toto', 'tata'],
                hash: 'isch',
                query: {
                    foo: 'bar'
                },

                href: 'http://localhost:333/toto/tata?foo=bar#isch',
                host: 'localhost:333',
                pathname: '/toto/tata',
                search: '?foo=bar'
            });
        },
        'should have valid string representation': function (topic) {
            assert.deepEqual(topic.toString(), 'http://localhost:333/toto/tata?foo=bar#isch');
        }
    }
});

exports.UriTest = UriTest;