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
    "isScalar()": {
        topic: function () {
            return core.isScalar;
        },
        'should return false for object, arrays, functions': function (topic) {
            assert.equal(topic({}), false);
            assert.equal(topic([]), false);
            assert.equal(topic(undefined), false);
            assert.equal(topic(function () {}), false);
        },
        'should return true for strings, number, booleans': function (topic) {
            assert.equal(topic(true), true);
            assert.equal(topic(null), true);
            assert.equal(topic('my string'), true);
            assert.equal(topic(1), true);
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
    },
    "mixin()": {
        topic: function () {
            var Class1 = function () {},
                Class2 = function () {},
                obj1 = new Class1(),
                obj2 = new Class2();

            Class1.prototype.class1PrototypedProperty = 'class1PrototypedProperty';
            Class1.prototype.commonPrototypedProperty = 'commonPrototypedProperty1';

            Class2.prototype.class2PrototypedProperty = 'class2PrototypedProperty';
            Class2.prototype.commonPrototypedProperty = 'commonPrototypedProperty2';

            obj1.foo = 'foo';
            obj1.bar = 'bar';

            obj2.foo = 'prop2';
            obj1.baz = 'baz';

            return core.mixin(obj1, obj2);
        },
        'should mix only own properties': function (topic) {
            assert.equal(topic.foo, 'prop2');
            assert.equal(topic.bar, 'bar');
            assert.equal(topic.baz, 'baz');

            assert.equal(topic.commonPrototypedProperty, 'commonPrototypedProperty1');
            assert.isUndefined(topic.class2PrototypedProperty);
        }
    },
    "hash()": {
        topic: function () {
            return core.hash;
        },
        'should convert to string scalars': function (topic) {
            assert.equal(topic('str'), 'str');
            assert.equal(topic(12), '12');
            assert.equal(topic(true), 'true');
            assert.equal(topic(null), 'null');
        },
        'should hash objects': function (topic) {
            assert.equal(topic({
                toto: 'str',
                foo: 1
            }), '1foostrtoto');
        },
        'should hash nested objects': function (topic) {
            assert.equal(topic({
                toto: 'str',
                foo: 1,
                bar: {
                    nested: true
                }
            }), '1foobarnestedtruestrtoto');
        }
    }
});

exports.CoreTest = CoreTest;