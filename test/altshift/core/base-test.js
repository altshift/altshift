/*jslint nodejs: true, indent:4 */
/**
 * Generic Imports
 */
var vows = require('vows'),
    assert = require('assert'),
    path = require('path'),
    env = require('../../_env');

var __filenameTested = env.toFileTested(__filename);

/**
 * Imports
 */
var base = require(__filenameTested);

/*******************************************************************************
 * JSLint validation
 ******************************************************************************/
try {
    require('lint').vows.createTest([__filename, __filenameTested]).export(module);
} catch (e) {
    console.warn('Warning: JSLint not found try `npm install lint`');
}

/*******************************************************************************
 * BaseTest
 ******************************************************************************/
var BaseTest = vows.describe('base module').addBatch({
    /*"require('base')": {
        topic: function () {
            return base;
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
    },*/
    "isArray()": {
        topic: function () {
            return base.isArray;
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
            return base.isString;
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
            return base.isScalar;
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
            return base.isFunction;
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
            return base.isObject;
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

            return base.mixin(obj1, obj2);
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
            return base.hash;
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
    },
    "format()": {
        topic: function () {
            return base.format;
        },
        'should return unchanged string when no args are passed': function (topic) {
            var str = 'mystring';
            assert.equal(topic(str), str);
        },
        'should return formatted string when passing array': function (topic) {
            var str = 'mystring {0} ahah {2} ohoh {1} {flag}';
            assert.equal(topic(str, []), str);
            assert.equal(topic(str, [undefined, 'test', false]), 'mystring {0} ahah false ohoh test {flag}');
        },
        'should return formatted string when passing object': function (topic) {
            var str = 'mystring {flag1} ahah {flag3} ohoh {1}';
            assert.equal(topic(str, {}), str);
            assert.equal(topic(str, {flag3: 'test3'}), 'mystring {flag1} ahah test3 ohoh {1}');
            assert.equal(topic(str, {1: 'test2'}), 'mystring {flag1} ahah {flag3} ohoh test2');
        },
        'should return formatted string for nested formatters patterns': function (topic) {
            var str = 'mystring {{flag1} ahah {flag3} ohoh {1}}';
            assert.equal(topic(str, {flag3: 'test3'}), 'mystring {{flag1} ahah test3 ohoh {1}}');
        },
        'should return formatted string !s(string), !r(representation) flag': function (topic) {
            var str = 'mystring {0!s} ahah {1!r}';
            assert.equal(topic(str, []), str);
            assert.equal(topic(str, [1234, {hello: 'world'}]), "mystring 1234 ahah { hello: 'world' }");
        },
        'should return formatted string with positional arguments when {} is encountered': function (topic) {
            var str = 'mystring {!s} sep {} {!r}';
            assert.equal(topic(str, []), str);
            assert.equal(topic(str, [1, 2, '3']), "mystring 1 sep 2 '3'");
        },
        'should return formatted string with when path is provided (like 0.argument or arg[0])': function (topic) {
            var args = {
                    0: {
                        foo: ':-)'
                    },
                    bar: {
                        baz: 'hello!'
                    },
                    "very_special.char ?": {
                        result: 'hello!'
                    }
                };
            assert.equal(topic('', args), '');
            assert.equal(topic('{0.foo}', args), ":-)");
            assert.equal(topic('{bar.baz}', args), "hello!");

            assert.equal(topic('{[0][foo]}', args), ":-)");
            assert.equal(topic('{[very_special.char ?][result]!s}', args), "hello!");
        }

    }
});

exports.BaseTest = BaseTest;