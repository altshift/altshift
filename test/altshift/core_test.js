/*jslint indent:4 */
/**
 * Generic Imports
 */
var vows = require('vows');
var assert = require('assert');
var path = require('path');

require('../_env');
var __filenameTested = path.join(
    path.dirname(__filename).replace(global.TEST, global.LIB),
    path.basename(__filename).replace('_test.js', ''),
    'index.js'
);

/**
 * Imports
 */
var core = require(__filenameTested);

/*******************************************************************************
 * JSLint validation
 ******************************************************************************/
try {
    require('lint').vows.createTest([__filename, __filenameTested]).export(module);
} catch (e) {
    console.warn('Warning: JSLint not found try `npm install lint`');
}

/*******************************************************************************
 * CoreTest
 ******************************************************************************/
var CoreTest = vows.describe('core module').addBatch({
    "require('core')": {
        topic: function () {
            return core;
        },
        'should not return undefined': function (topic) {
            assert.notEqual(topic, undefined);
        },
        'should have modules of the core (Class, Module, ...)': function (topic) {
            assert.isFunction(topic.Class);
            assert.isFunction(topic.Module);
            assert.isFunction(topic.Interface);
        },
        'should have modules of the stdlib (Comparable, Enumerable, ...)': function (topic) {
            assert.isObject(topic.Comparable);
            assert.isObject(topic.Enumerable);
        },
        'should have modules of the dictionary': function (topic) {
            assert.isFunction(topic.Dictionary);
        },
        'should have shortcuts': function (topic) {
            assert.isFunction(topic.class);
            assert.isFunction(topic.module);
            assert.isFunction(topic.interface);
            assert.isFunction(topic.dict);
        }
    },
    "isArray()": {
        topic: function () {
            return core.isArray;
        },
        'should return false for object, strings, number, boolean': function (topic) {
            assert.equal(topic({}), false);
            assert.equal(topic('foo bar'), false);
            assert.equal(topic(1), false);
            assert.equal(topic(true), false);
            assert.equal(topic(null), false);
            assert.equal(topic(undefined), false);
            assert.equal(topic(function () {}), false);
        },
        'should return true for []': function (topic) {
            assert.equal(topic([]), true);
        },
        'should return true for an Array subclass': function (topic) {
            var ArraySub = function () {};
            ArraySub.prototype = [];

            assert.equal(topic(new ArraySub()), true);
        }
    },
    "isString()": {
        topic: function () {
            return core.isString;
        },
        'should return false for object, arrays, number, boolean': function (topic) {
            assert.equal(topic({}), false);
            assert.equal(topic([]), false);
            assert.equal(topic(1), false);
            assert.equal(topic(true), false);
            assert.equal(topic(null), false);
            assert.equal(topic(undefined), false);
            assert.equal(topic(function () {}), false);
        },
        'should return true for "my string"': function (topic) {
            assert.equal(topic('my string'), true);
        },
        'should return true for a String subclass': function (topic) {
            var StringSub = function () {};
            StringSub.prototype = Object.create(String.prototype);

            assert.equal(topic(new StringSub()), true);
        }
    },
    "isFunction()": {
        topic: function () {
            return core.isFunction;
        },
        'should return false for arrays, strings, number, boolean': function (topic) {
            assert.equal(topic('foo bar'), false);
            assert.equal(topic([]), false);
            assert.equal(topic(1), false);
            assert.equal(topic(true), false);
            assert.equal(topic(null), false);
            assert.equal(topic(undefined), false);
        },
        'should return true for function () {}': function (topic) {
            assert.equal(topic(function () {}), true);
        }
    },
    "isObject()": {
        topic: function () {
            return core.isObject;
        },
        'should return false for arrays, strings, number, boolean': function (topic) {
            assert.equal(topic('foo bar'), false);
            assert.equal(topic(1), false);
            assert.equal(topic(true), false);

            assert.equal(topic(undefined), false);

        },
        'should return true for {} or [] or null or function() {}': function (topic) {
            assert.equal(topic(null), true);
            assert.equal(topic({}), true);
            assert.equal(topic([]), true);
            assert.equal(topic(function () {}), true);
        },
        'should return true for a Object subclass': function (topic) {
            var ObjSub = function () {};
            ObjSub.prototype = {};

            assert.equal(topic(new ObjSub()), true);
        }
    }
});

exports.CoreTest = CoreTest;