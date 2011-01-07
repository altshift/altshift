/*jslint indent:4 */
/**
 * Generic Imports
 */
var vows = require('vows');
var assert = require('assert');
var path = require('path');

var env = require('../_env');
var __filenameTested = path.join(
    path.dirname(__filename).replace(global.TEST, global.LIB),
    path.basename(__filename).replace('_test.js', '.js')
);

/**
 * Imports
 */
var uri = require(__filenameTested);

/*******************************************************************************
 * JSLint validation
 ******************************************************************************/
try {
    require('lint').vows.createTest([__filename, __filenameTested]).export(module);
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
                }
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
                }
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
                }
            });
        },
        'should have valid string representation': function (topic) {
            assert.deepEqual(topic.toString(), 'http://localhost:333/toto/tata?foo=bar#isch');
        }
    }
});

exports.UriTest = UriTest;